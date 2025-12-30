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

    /* ================= TOP CARDS ================= */
    const [[topCards]] = await pool.query(`
      SELECT
        -- Jobs In Progress
        (SELECT COUNT(*) 
         FROM jobs 
         WHERE job_status = 'in_progress'
         AND assigned = ?) AS inProgressJobs,

        -- Active Jobs
        (SELECT COUNT(*) 
         FROM jobs 
         WHERE job_status = 'active'
         AND assigned = ?) AS activeJobs,

        -- Completed Jobs
        (SELECT COUNT(*) 
         FROM jobs 
         WHERE job_status = 'completed'
         AND assigned = ?) AS completedJobs,

        -- Pending Assignment
        (SELECT COUNT(*) 
         FROM jobs 
         WHERE assigned IS NULL
         AND job_status = 'pending') AS pendingAssignmentJobs
    `, [productionId, productionId, productionId]);

    /* ================= WEEKLY PERFORMANCE ================= */
    const [[weekly]] = await pool.query(`
      SELECT
        -- Jobs completed this week
        (SELECT COUNT(*) 
         FROM jobs 
         WHERE job_status = 'completed'
         AND assigned = ?
         AND YEARWEEK(updated_at, 1) = YEARWEEK(CURDATE(), 1)
        ) AS jobsCompletedThisWeek,

        -- Jobs created this week (workload indicator)
        (SELECT COUNT(*) 
         FROM jobs 
         WHERE job_status IN ('active','in_progress')
         AND assigned = ?
         AND YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)
        ) AS jobsCreatedThisWeek,

        -- Overdue / Stuck Jobs (no update in last 3 days)
        (SELECT COUNT(*) 
         FROM jobs
         WHERE job_status IN ('active','in_progress')
         AND assigned = ?
         AND updated_at < DATE_SUB(CURDATE(), INTERVAL 3 DAY)
        ) AS overdueJobs
    `, [productionId, productionId, productionId]);

    /* ================= EMPLOYEE WORKLOAD ================= */
    const [[workload]] = await pool.query(`
      SELECT COUNT(*) AS totalAssignedJobs
      FROM jobs
      WHERE assigned = ?
      AND job_status IN ('active','in_progress')
    `, [productionId]);

    /* ================= RESPONSE ================= */
    res.json({
      success: true,
      data: {
        topCards: {
          inProgress: topCards.inProgressJobs,
          active: topCards.activeJobs,
          completed: topCards.completedJobs,
          pendingAssignment: topCards.pendingAssignmentJobs
        },

        weeklyPerformance: {
          jobsCompleted: weekly.jobsCompletedThisWeek,
          jobsCreated: weekly.jobsCreatedThisWeek,
          overdueJobs: weekly.overdueJobs
        },

        employeeWorkload: {
          totalJobsAssigned: workload.totalAssignedJobs
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
    const [
      [[projects]],
      [[jobs]],
      [[activeJobs]],
      [[completedJobs]],

      // 🔥 currency-wise
      [totalInvoiceAmount],
      [totalPOAmount],

      [[jobsCreatedThisWeek]],
      [[jobsCompletedThisWeek]],
      [[dueThisWeek]],
      [[overdueJobs]],

      // 🔥 currency-wise
      [invoiceThisMonth],
      [poThisMonth],

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

      // ===== TOTAL INVOICE (currency-wise) =====
      pool.query(`
        SELECT 
          currency,
          IFNULL(SUM(total_amount),0) AS amount
        FROM invoices
        WHERE invoice_status != 'Draft'
        GROUP BY currency
      `),

      // ===== TOTAL PO (currency-wise) ✅ FIXED =====
      pool.query(`
        SELECT 
          p.currency,
          IFNULL(SUM(po.po_amount),0) AS amount
        FROM purchase_orders po
        LEFT JOIN projects p ON p.id = po.project_id
        GROUP BY p.currency
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

      // ===== INVOICE THIS MONTH (currency-wise) =====
      pool.query(`
        SELECT 
          currency,
          IFNULL(SUM(total_amount),0) AS amount
        FROM invoices
        WHERE MONTH(invoice_date) = MONTH(CURDATE())
          AND YEAR(invoice_date) = YEAR(CURDATE())
        GROUP BY currency
      `),

      // ===== PO THIS MONTH (currency-wise) ✅ FIXED =====
      pool.query(`
        SELECT 
          p.currency,
          IFNULL(SUM(po.po_amount),0) AS amount
        FROM purchase_orders po
        LEFT JOIN projects p ON p.id = po.project_id
        WHERE MONTH(po.po_date) = MONTH(CURDATE())
          AND YEAR(po.po_date) = YEAR(CURDATE())
        GROUP BY p.currency
      `),

      // ===== PAID / UNPAID =====
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

    // ===== FINAL RESPONSE =====
    res.json({
      success: true,
      data: {
        topCards: {
          totalProjects: projects.totalProjects,
          totalJobs: jobs.totalJobs,
          activeJobs: activeJobs.activeJobs,
          completedJobs: completedJobs.completedJobs,
          invoiceAmountByCurrency: totalInvoiceAmount,
          poAmountByCurrency: totalPOAmount
        },

        jobAnalytics: {
          createdThisWeek: jobsCreatedThisWeek.jobsCreatedThisWeek,
          completedThisWeek: jobsCompletedThisWeek.jobsCompletedThisWeek,
          dueThisWeek: dueThisWeek.dueThisWeek,
          overdueJobs: overdueJobs.overdueJobs
        },

        finance: {
          invoiceThisMonthByCurrency: invoiceThisMonth,
          poThisMonthByCurrency: poThisMonth,
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

export const getEmployeeDashboard = async (req, res) => {
  try {
    const { employeeId } = req.params;

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: "employeeId is required"
      });
    }

    /* ================= TOP CARDS ================= */
    const [[topCards]] = await pool.query(`
      SELECT
        (SELECT COUNT(*)
         FROM jobs
         WHERE job_status = 'in_progress'
         AND assigned = ?) AS inProgress,

        (SELECT COUNT(*)
         FROM jobs
         WHERE job_status = 'Active'
         AND assigned = ?) AS active,

        (SELECT COUNT(*)
         FROM jobs
         WHERE job_status = 'Completed'
         AND assigned = ?) AS completed,

        (SELECT COUNT(*)
         FROM jobs
         WHERE assigned IS NULL
         AND job_status = 'pending') AS pendingAssignment
    `, [employeeId, employeeId, employeeId]);

    /* ================= WEEKLY PERFORMANCE ================= */
    const [[weekly]] = await pool.query(`
      SELECT
        (SELECT COUNT(*)
         FROM jobs
         WHERE job_status = 'Completed'
         AND assigned = ?
         AND YEARWEEK(updated_at, 1) = YEARWEEK(CURDATE(), 1)
        ) AS jobsCompleted,

        (SELECT COUNT(*)
         FROM jobs
         WHERE assigned = ?
         AND YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)
        ) AS jobsCreated,

        (SELECT COUNT(*)
         FROM jobs
         WHERE job_status IN ('Active','in_progress')
         AND assigned = ?
         AND updated_at < DATE_SUB(CURDATE(), INTERVAL 3 DAY)
        ) AS overdueJobs
    `, [employeeId, employeeId, employeeId]);

    /* ================= WORKLOAD ================= */
    const [[workload]] = await pool.query(`
      SELECT
        COUNT(*) AS totalJobsAssigned
      FROM jobs
      WHERE assigned = ?
    `, [employeeId]);

    /* ================= RESPONSE ================= */
    res.json({
      success: true,
      data: {
        topCards: {
          inProgress: topCards.inProgress,
          active: topCards.active,
          completed: topCards.completed,
          pendingAssignment: topCards.pendingAssignment
        },

        weeklyPerformance: {
          jobsCompleted: weekly.jobsCompleted,
          jobsCreated: weekly.jobsCreated,
          overdueJobs: weekly.overdueJobs
        },

        employeeWorkload: {
          totalJobsAssigned: workload.totalJobsAssigned
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

