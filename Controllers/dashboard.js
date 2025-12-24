import { pool } from "../Config/dbConnect.js";
export const getProductionDashboard = async (req, res) => {
  try {
    const { productionId } = req.params;

    if (!productionId) {
      return res.status(400).json({
        success: false,
        message: "productionId is required"
      });
    }

    // ===== TOP CARDS =====
    const [[topCards]] = await pool.query(`
      SELECT
        (SELECT COUNT(*) 
         FROM jobs 
         WHERE job_status = 'in_progress'
         AND assigned = ?) AS inProgressJobs,

          (SELECT COUNT(*) 
     FROM jobs 
     WHERE job_status = 'Active'
     AND assigned = ?) AS activeJobs,


        (SELECT COUNT(*) 
         FROM jobs 
         WHERE job_status = 'completed'
         AND assigned = ?) AS completedJobs,

        0 AS hoursLogged
    `, [productionId, productionId,productionId]);

    // ===== WEEKLY PERFORMANCE =====
    const [[weekly]] = await pool.query(`
      SELECT
        (SELECT COUNT(*) 
         FROM jobs 
         WHERE job_status = 'Completed'
         AND assigned = ?
         AND YEARWEEK(updated_at, 1) = YEARWEEK(CURDATE(), 1)
        ) AS jobsCompletedThisWeek,

        0 AS weeklyHoursLogged,

        (SELECT COUNT(*) 
         FROM jobs 
         WHERE job_status = 'active' or "in_progress"
         AND assigned = ?
         AND YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)
        ) AS dueThisWeek
    `, [productionId, productionId]);

    // ===== TODAY PERFORMANCE =====
    const [[today]] = await pool.query(`
      SELECT
        0 AS hoursToday,
        0 AS weeklyHours,
        48 AS weeklyTarget
    `);

    // ===== CALCULATIONS =====
    const weeklyGoalProgress =
      today.weeklyTarget > 0
        ? Math.round((today.weeklyHours / today.weeklyTarget) * 100)
        : 0;

    res.json({
      success: true,
      data: {
        topCards: {
          inProgress: topCards.inProgressJobs,
          completed: topCards.completedJobs,
          active:topCards.activeJobs,
          hoursLogged: `${topCards.hoursLogged}h`

        },

        weeklyPerformance: {
          jobsCompleted: weekly.jobsCompletedThisWeek,
          hoursLogged: `${weekly.weeklyHoursLogged}h`,
          goalProgress: `${weeklyGoalProgress}%`,
          dueThisWeek: weekly.dueThisWeek
        },

        todayPerformance: {
          date: new Date(),
          hoursToday: `${today.hoursToday}h`,
          weeklyHours: `${today.weeklyHours}h / ${today.weeklyTarget}h`,
          goalProgress: `${weeklyGoalProgress}%`,
          status: weeklyGoalProgress >= 50 ? "On Track" : "Behind",
          remainingHours: `${today.weeklyTarget - today.weeklyHours}h`
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


export const getEmployeeDashboard = async (req, res) => {
  try {
    const { employeeId } = req.params;

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: "employeeId is required"
      });
    }

    // ===== TOP CARDS =====
    const [[topCards]] = await pool.query(`
      SELECT
        (SELECT COUNT(*)
         FROM jobs
         WHERE job_status = 'in_progress'
         AND assigned = ?) AS inProgressJobs,

          (SELECT COUNT(*)
         FROM jobs
         WHERE job_status = 'Active'
         AND assigned = ?) AS activeJobs,

        (SELECT COUNT(*)
         FROM jobs
         WHERE job_status = 'Completed'
         AND assigned = ?) AS completedJobs,

        0 AS hoursLogged
    `, [employeeId, employeeId,employeeId]);

    // ===== WEEKLY PERFORMANCE =====
    const [[weekly]] = await pool.query(`
      SELECT
        (SELECT COUNT(*)
         FROM jobs
         WHERE job_status = 'Completed'
         AND assigned = ?
         AND YEARWEEK(updated_at, 1) = YEARWEEK(CURDATE(), 1)
        ) AS jobsCompletedThisWeek,

        0 AS weeklyHoursLogged,

        (SELECT COUNT(*)
         FROM jobs
         WHERE job_status = 'Active'
         AND assigned = ?
         AND YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)
        ) AS dueThisWeek
    `, [employeeId, employeeId]);

    // ===== TODAY PERFORMANCE =====
    const weeklyTarget = 48;
    const weeklyHours = 0;
    const hoursToday = 0;

    const goalProgress = weeklyTarget > 0
      ? Math.round((weeklyHours / weeklyTarget) * 100)
      : 0;

    res.json({
      success: true,
      data: {
        topCards: {
          inProgress: topCards.inProgressJobs,
          completed: topCards.completedJobs,
          active:topCards.activeJobs,
          hoursLogged: `${topCards.hoursLogged}h`
        },

        weeklyPerformance: {
          jobsCompleted: weekly.jobsCompletedThisWeek,
          hoursLogged: `${weekly.weeklyHoursLogged}h`,
          goalProgress: `${goalProgress}%`,
          dueThisWeek: weekly.dueThisWeek
        },

        todayPerformance: {
          date: new Date(),
          hoursToday: `${hoursToday}h`,
          weeklyHours: `${weeklyHours}h / ${weeklyTarget}h`,
          goalProgress: `${goalProgress}%`,
          status: goalProgress >= 50 ? "On Track" : "Behind",
          remainingHours: `${weeklyTarget - weeklyHours}h`
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


export const getAdminDashboardReports = async (req, res) => {
  try {
    /* =========================
       RUN ALL QUERIES IN PARALLEL
    ========================== */
    const [
      [[projects]],
      [[jobs]],
      [[activeJobs]],
      [[completedJobs]],
      [[totalInvoiceAmount]],
      [[totalPOAmount]],

      [[jobsCreatedThisWeek]],
      [[jobsCompletedThisWeek]],
      [[dueThisWeek]],
      [[overdueJobs]],

      [[invoiceThisMonth]],
      [[poThisMonth]],
      [[invoicePaymentSplit]],

      [[totalHours]],
      [[weeklyHours]]
    ] = await Promise.all([

      // ===== TOP CARDS =====
      pool.query(`SELECT COUNT(*) AS totalProjects FROM projects`),
      pool.query(`SELECT COUNT(*) AS totalJobs FROM jobs`),

      pool.query(`
        SELECT COUNT(*) AS activeJobs
        FROM jobs
        WHERE job_status IN ('Active','in_progress')
      `),

      pool.query(`
        SELECT COUNT(*) AS completedJobs
        FROM jobs
        WHERE job_status = 'Completed'
      `),

      pool.query(`
        SELECT IFNULL(SUM(total_amount),0) AS totalInvoiceAmount
        FROM invoices
        WHERE invoice_status != 'Draft'
      `),

      pool.query(`
        SELECT IFNULL(SUM(po_amount),0) AS totalPOAmount
        FROM purchase_orders
      `),

      // ===== JOB ANALYTICS =====
      pool.query(`
        SELECT COUNT(*) AS jobsCreatedThisWeek
        FROM jobs
        WHERE YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)
      `),

      pool.query(`
        SELECT COUNT(*) AS jobsCompletedThisWeek
        FROM jobs
        WHERE job_status = 'Completed'
        AND YEARWEEK(updated_at, 1) = YEARWEEK(CURDATE(), 1)
      `),

      pool.query(`
        SELECT COUNT(*) AS dueThisWeek
        FROM jobs
        WHERE job_status IN ('Active','in_progress')
        AND YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)
      `),

      pool.query(`
        SELECT COUNT(*) AS overdueJobs
        FROM jobs
        WHERE job_status IN ('Active','in_progress')
        AND created_at < CURDATE()
      `),

      // ===== FINANCIAL =====
      pool.query(`
        SELECT IFNULL(SUM(total_amount),0) AS invoiceThisMonth
        FROM invoices
        WHERE MONTH(invoice_date) = MONTH(CURDATE())
        AND YEAR(invoice_date) = YEAR(CURDATE())
      `),

      pool.query(`
        SELECT IFNULL(SUM(po_amount),0) AS poThisMonth
        FROM purchase_orders
        WHERE MONTH(po_date) = MONTH(CURDATE())
        AND YEAR(po_date) = YEAR(CURDATE())
      `),

      pool.query(`
        SELECT 
          SUM(CASE WHEN payment_status = 'Paid' THEN total_amount ELSE 0 END) AS paidAmount,
          SUM(CASE WHEN payment_status = 'Unpaid' THEN total_amount ELSE 0 END) AS unpaidAmount
        FROM invoices
      `),

      // ===== TIME / PRODUCTIVITY =====
      pool.query(`
        SELECT SEC_TO_TIME(SUM(TIME_TO_SEC(time))) AS totalHours
        FROM time_work_logs
      `),

      pool.query(`
        SELECT SEC_TO_TIME(SUM(TIME_TO_SEC(time))) AS weeklyHours
        FROM time_work_logs
        WHERE YEARWEEK(date, 1) = YEARWEEK(CURDATE(), 1)
      `)
    ]);

    /* =========================
       FINAL RESPONSE
    ========================== */
    res.json({
      success: true,
      data: {
        topCards: {
          totalProjects: projects.totalProjects,
          totalJobs: jobs.totalJobs,
          activeJobs: activeJobs.activeJobs,
          completedJobs: completedJobs.completedJobs,
          invoiceAmount: totalInvoiceAmount.totalInvoiceAmount,
          poAmount: totalPOAmount.totalPOAmount
        },

        jobAnalytics: {
          createdThisWeek: jobsCreatedThisWeek.jobsCreatedThisWeek,
          completedThisWeek: jobsCompletedThisWeek.jobsCompletedThisWeek,
          dueThisWeek: dueThisWeek.dueThisWeek,
          overdueJobs: overdueJobs.overdueJobs
        },

        finance: {
          invoiceThisMonth: invoiceThisMonth.invoiceThisMonth,
          poThisMonth: poThisMonth.poThisMonth,
          paidAmount: invoicePaymentSplit.paidAmount,
          unpaidAmount: invoicePaymentSplit.unpaidAmount
        },

        productivity: {
          totalHours: totalHours.totalHours || "00:00:00",
          weeklyHours: weeklyHours.weeklyHours || "00:00:00"
        }
      } 
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to load admin dashboard reports"
    });
  }
};
