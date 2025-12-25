import { pool } from "../Config/dbConnect.js";
// export const getProductionDashboard = async (req, res) => {
//   try {
//     const { productionId } = req.params;

//     if (!productionId) {
//       return res.status(400).json({
//         success: false,
//         message: "productionId is required"
//       });
//     }

//     // ===== TOP CARDS =====
//     const [[topCards]] = await pool.query(`
//       SELECT
//         (SELECT COUNT(*) 
//          FROM jobs 
//          WHERE job_status = 'in_progress'
//          AND assigned = ?) AS inProgressJobs,

//           (SELECT COUNT(*) 
//      FROM jobs 
//      WHERE job_status = 'Active'
//      AND assigned = ?) AS activeJobs,


//         (SELECT COUNT(*) 
//          FROM jobs 
//          WHERE job_status = 'completed'
//          AND assigned = ?) AS completedJobs,

//         0 AS hoursLogged
//     `, [productionId, productionId,productionId]);

//     // ===== WEEKLY PERFORMANCE =====
//     const [[weekly]] = await pool.query(`
//       SELECT
//         (SELECT COUNT(*) 
//          FROM jobs 
//          WHERE job_status = 'Completed'
//          AND assigned = ?
//          AND YEARWEEK(updated_at, 1) = YEARWEEK(CURDATE(), 1)
//         ) AS jobsCompletedThisWeek,

//         0 AS weeklyHoursLogged,

//         (SELECT COUNT(*) 
//          FROM jobs 
//          WHERE job_status = 'active' or "in_progress"
//          AND assigned = ?
//          AND YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)
//         ) AS dueThisWeek
//     `, [productionId, productionId]);

//     // ===== TODAY PERFORMANCE =====
//     const [[today]] = await pool.query(`
//       SELECT
//         0 AS hoursToday,
//         0 AS weeklyHours,
//         48 AS weeklyTarget
//     `);

//     // ===== CALCULATIONS =====
//     const weeklyGoalProgress =
//       today.weeklyTarget > 0
//         ? Math.round((today.weeklyHours / today.weeklyTarget) * 100)
//         : 0;

//     res.json({
//       success: true,
//       data: {
//         topCards: {
//           inProgress: topCards.inProgressJobs,
//           completed: topCards.completedJobs,
//           active:topCards.activeJobs,
//           hoursLogged: `${topCards.hoursLogged}h`

//         },

//         weeklyPerformance: {
//           jobsCompleted: weekly.jobsCompletedThisWeek,
//           hoursLogged: `${weekly.weeklyHoursLogged}h`,
//           goalProgress: `${weeklyGoalProgress}%`,
//           dueThisWeek: weekly.dueThisWeek
//         },

//         todayPerformance: {
//           date: new Date(),
//           hoursToday: `${today.hoursToday}h`,
//           weeklyHours: `${today.weeklyHours}h / ${today.weeklyTarget}h`,
//           goalProgress: `${weeklyGoalProgress}%`,
//           status: weeklyGoalProgress >= 50 ? "On Track" : "Behind",
//           remainingHours: `${today.weeklyTarget - today.weeklyHours}h`
//         }
//       }
//     });

//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };


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



// export const getProductionDashboard = async (req, res) => {
//   try {
//     const { productionId } = req.params;

//     if (!productionId) {
//       return res.status(400).json({
//         success: false,
//         message: "productionId is required"
//       });
//     }

//     /* ================= TOP CARDS ================= */
//     const [[topCards]] = await pool.query(`
//       SELECT
//         (SELECT COUNT(*) 
//          FROM jobs 
//          WHERE job_status = 'in_progress'
//          AND assigned = ?) AS inProgressJobs,

//         (SELECT COUNT(*) 
//          FROM jobs 
//          WHERE job_status = 'active'
//          AND assigned = ?) AS activeJobs,

//         (SELECT COUNT(*) 
//          FROM jobs 
//          WHERE job_status = 'completed'
//          AND assigned = ?) AS completedJobs,

//         (SELECT COUNT(*) 
//          FROM jobs 
//          WHERE assigned IS NULL
//          AND job_status = 'pending') AS pendingAssignmentJobs,

//         (SELECT COUNT(*) 
//          FROM jobs 
//          WHERE job_status IN ('active','in_progress')
//          AND assigned = ?
//          AND updated_at < DATE_SUB(CURDATE(), INTERVAL 7 DAY)
//         ) AS overdueJobs
//     `, [productionId, productionId, productionId, productionId]);

//     /* ================= WEEKLY PERFORMANCE ================= */
//     const [[weekly]] = await pool.query(`
//       SELECT
//         (SELECT COUNT(*) 
//          FROM jobs 
//          WHERE job_status = 'completed'
//          AND assigned = ?
//          AND YEARWEEK(updated_at, 1) = YEARWEEK(CURDATE(), 1)
//         ) AS jobsCompletedThisWeek,

//         (SELECT COUNT(*) 
//          FROM jobs 
//          WHERE assigned = ?
//          AND YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)
//         ) AS jobsCreatedThisWeek,

//         (SELECT COUNT(*) 
//          FROM jobs 
//          WHERE job_status IN ('active','in_progress')
//          AND assigned = ?
//          AND YEARWEEK(updated_at, 1) = YEARWEEK(CURDATE(), 1)
//         ) AS jobsDueThisWeek,

//         (SELECT COUNT(*) 
//          FROM jobs
//          WHERE job_status IN ('active','in_progress')
//          AND assigned = ?
//          AND updated_at < DATE_SUB(CURDATE(), INTERVAL 3 DAY)
//         ) AS stuckJobs
//     `, [productionId, productionId, productionId, productionId]);

//     /* ================= TODAY PERFORMANCE ================= */
//     const [[today]] = await pool.query(`
//       SELECT
//         (SELECT COUNT(*)
//          FROM jobs
//          WHERE assigned = ?
//          AND DATE(updated_at) = CURDATE()
//         ) AS jobsUpdatedToday,

//         (SELECT COUNT(*)
//          FROM jobs
//          WHERE job_status = 'completed'
//          AND assigned = ?
//          AND DATE(updated_at) = CURDATE()
//         ) AS jobsCompletedToday
//     `, [productionId, productionId]);

//     /* ================= PRODUCTIVITY ================= */
//     const [[productivity]] = await pool.query(`
//       SELECT
//         SEC_TO_TIME(
//           SUM(
//             TIME_TO_SEC(IFNULL(twl.time,'00:00:00')) +
//             TIME_TO_SEC(IFNULL(twl.overtime,'00:00:00'))
//           )
//         ) AS weeklyHours,

//         COUNT(DISTINCT twl.job_id) AS jobsWorkedOn
//       FROM time_work_logs twl
//       WHERE twl.production_id = ?
//       AND YEARWEEK(twl.date, 1) = YEARWEEK(CURDATE(), 1)
//     `, [productionId]);

//     /* ================= WORKLOAD ================= */
//     const [[workload]] = await pool.query(`
//       SELECT
//         COUNT(*) AS totalAssignedJobs,
//         SUM(CASE WHEN job_status = 'completed' THEN 1 ELSE 0 END) AS completedJobs,
//         SUM(CASE WHEN job_status IN ('active','in_progress') THEN 1 ELSE 0 END) AS pendingJobs
//       FROM jobs
//       WHERE assigned = ?
//     `, [productionId]);

//     /* ================= IDLE JOBS ================= */
//     const [[idle]] = await pool.query(`
//       SELECT COUNT(*) AS idleJobs
//       FROM jobs
//       WHERE job_status IN ('active','in_progress')
//       AND assigned = ?
//       AND updated_at < DATE_SUB(CURDATE(), INTERVAL 7 DAY)
//     `, [productionId]);

//     /* ================= RECENT JOBS ================= */
//     const [recentJobs] = await pool.query(`
//       SELECT
//         j.job_no,
//         j.job_status,
//         j.updated_at,
//         p.project_name
//       FROM jobs j
//       LEFT JOIN projects p ON p.id = j.project_id
//       WHERE j.assigned = ?
//       ORDER BY j.updated_at DESC
//       LIMIT 5
//     `, [productionId]);

//     /* ================= CALCULATIONS ================= */
//     let avgMinutesPerJob = 0;
//     if (productivity.weeklyHours && productivity.jobsWorkedOn > 0) {
//       const [h = 0, m = 0] = productivity.weeklyHours.split(":").map(Number);
//       const totalMinutes = h * 60 + m;
//       avgMinutesPerJob = Math.round(totalMinutes / productivity.jobsWorkedOn);
//     }

//     const completionRate =
//       workload.totalAssignedJobs > 0
//         ? Math.round(
//             (workload.completedJobs / workload.totalAssignedJobs) * 100
//           )
//         : 0;

//     /* ================= RESPONSE ================= */
//     res.json({
//       success: true,
//       data: {
//         topCards: {
//           inProgress: topCards.inProgressJobs,
//           active: topCards.activeJobs,
//           completed: topCards.completedJobs,
//           pendingAssignment: topCards.pendingAssignmentJobs,
//           overdue: topCards.overdueJobs
//         },

//         weeklyPerformance: {
//           completed: weekly.jobsCompletedThisWeek,
//           created: weekly.jobsCreatedThisWeek,
//           dueThisWeek: weekly.jobsDueThisWeek,
//           stuckJobs: weekly.stuckJobs
//         },

//         todayPerformance: {
//           jobsUpdated: today.jobsUpdatedToday,
//           jobsCompleted: today.jobsCompletedToday
//         },

//         // productivity: {
//         //   weeklyHours: productivity.weeklyHours || "00:00:00",
//         //   avgMinutesPerJob,
//         //   completionRate: `${completionRate}%`
//         // },

//         employeeWorkload: {
//           totalAssigned: workload.totalAssignedJobs,
//           completed: workload.completedJobs,
//           pending: workload.pendingJobs,
//           idleJobs: idle.idleJobs
//         },

//         recentJobs
//       }
//     });

//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };



// export const getEmployeeDashboard = async (req, res) => {
//   try {
//     const { employeeId } = req.params;

//     if (!employeeId) {
//       return res.status(400).json({
//         success: false,
//         message: "employeeId is required"
//       });
//     }

//     // ===== TOP CARDS =====
//     const [[topCards]] = await pool.query(`
//       SELECT
//         (SELECT COUNT(*)
//          FROM jobs
//          WHERE job_status = 'in_progress'
//          AND assigned = ?) AS inProgressJobs,

//           (SELECT COUNT(*)
//          FROM jobs
//          WHERE job_status = 'Active'
//          AND assigned = ?) AS activeJobs,

//         (SELECT COUNT(*)
//          FROM jobs
//          WHERE job_status = 'Completed'
//          AND assigned = ?) AS completedJobs,

//         0 AS hoursLogged
//     `, [employeeId, employeeId,employeeId]);

//     // ===== WEEKLY PERFORMANCE =====
//     const [[weekly]] = await pool.query(`
//       SELECT
//         (SELECT COUNT(*)
//          FROM jobs
//          WHERE job_status = 'Completed'
//          AND assigned = ?
//          AND YEARWEEK(updated_at, 1) = YEARWEEK(CURDATE(), 1)
//         ) AS jobsCompletedThisWeek,

//         0 AS weeklyHoursLogged,

//         (SELECT COUNT(*)
//          FROM jobs
//          WHERE job_status = 'Active'
//          AND assigned = ?
//          AND YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)
//         ) AS dueThisWeek
//     `, [employeeId, employeeId]);

//     // ===== TODAY PERFORMANCE =====
//     const weeklyTarget = 48;
//     const weeklyHours = 0;
//     const hoursToday = 0;

//     const goalProgress = weeklyTarget > 0
//       ? Math.round((weeklyHours / weeklyTarget) * 100)
//       : 0;

//     res.json({
//       success: true,
//       data: {
//         topCards: {
//           inProgress: topCards.inProgressJobs,
//           completed: topCards.completedJobs,
//           active:topCards.activeJobs,
//           hoursLogged: `${topCards.hoursLogged}h`
//         },

//         weeklyPerformance: {
//           jobsCompleted: weekly.jobsCompletedThisWeek,
//           hoursLogged: `${weekly.weeklyHoursLogged}h`,
//           goalProgress: `${goalProgress}%`,
//           dueThisWeek: weekly.dueThisWeek
//         },

//         todayPerformance: {
//           date: new Date(),
//           hoursToday: `${hoursToday}h`,
//           weeklyHours: `${weeklyHours}h / ${weeklyTarget}h`,
//           goalProgress: `${goalProgress}%`,
//           status: goalProgress >= 50 ? "On Track" : "Behind",
//           remainingHours: `${weeklyTarget - weeklyHours}h`
//         }
//       }
//     });

//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };


// export const getAdminDashboardReports = async (req, res) => {
//   try {
//     /* =========================
//        RUN ALL QUERIES IN PARALLEL
//     ========================== */
//     const [
//       [[projects]],
//       [[jobs]],
//       [[activeJobs]],
//       [[completedJobs]],
//       [[totalInvoiceAmount]],
//       [[totalPOAmount]],

//       [[jobsCreatedThisWeek]],
//       [[jobsCompletedThisWeek]],
//       [[dueThisWeek]],
//       [[overdueJobs]],

//       [[invoiceThisMonth]],
//       [[poThisMonth]],
//       [[invoicePaymentSplit]],

//       [[totalHours]],
//       [[weeklyHours]]
//     ] = await Promise.all([

//       // ===== TOP CARDS =====
//       pool.query(`SELECT COUNT(*) AS totalProjects FROM projects`),
//       pool.query(`SELECT COUNT(*) AS totalJobs FROM jobs`),

//       pool.query(`
//         SELECT COUNT(*) AS activeJobs
//         FROM jobs
//         WHERE job_status IN ('Active','in_progress')
//       `),

//       pool.query(`
//         SELECT COUNT(*) AS completedJobs
//         FROM jobs
//         WHERE job_status = 'Completed'
//       `),

//       pool.query(`
//         SELECT IFNULL(SUM(total_amount),0) AS totalInvoiceAmount
//         FROM invoices
//         WHERE invoice_status != 'Draft'
//       `),

//       pool.query(`
//         SELECT IFNULL(SUM(po_amount),0) AS totalPOAmount
//         FROM purchase_orders
//       `),

//       // ===== JOB ANALYTICS =====
//       pool.query(`
//         SELECT COUNT(*) AS jobsCreatedThisWeek
//         FROM jobs
//         WHERE YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)
//       `),

//       pool.query(`
//         SELECT COUNT(*) AS jobsCompletedThisWeek
//         FROM jobs
//         WHERE job_status = 'Completed'
//         AND YEARWEEK(updated_at, 1) = YEARWEEK(CURDATE(), 1)
//       `),

//       pool.query(`
//         SELECT COUNT(*) AS dueThisWeek
//         FROM jobs
//         WHERE job_status IN ('Active','in_progress')
//         AND YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)
//       `),

//       pool.query(`
//         SELECT COUNT(*) AS overdueJobs
//         FROM jobs
//         WHERE job_status IN ('Active','in_progress')
//         AND created_at < CURDATE()
//       `),

//       // ===== FINANCIAL =====
//       pool.query(`
//         SELECT IFNULL(SUM(total_amount),0) AS invoiceThisMonth
//         FROM invoices
//         WHERE MONTH(invoice_date) = MONTH(CURDATE())
//         AND YEAR(invoice_date) = YEAR(CURDATE())
//       `),

//       pool.query(`
//         SELECT IFNULL(SUM(po_amount),0) AS poThisMonth
//         FROM purchase_orders
//         WHERE MONTH(po_date) = MONTH(CURDATE())
//         AND YEAR(po_date) = YEAR(CURDATE())
//       `),

//       pool.query(`
//         SELECT 
//           SUM(CASE WHEN payment_status = 'Paid' THEN total_amount ELSE 0 END) AS paidAmount,
//           SUM(CASE WHEN payment_status = 'Unpaid' THEN total_amount ELSE 0 END) AS unpaidAmount
//         FROM invoices
//       `),

//       // ===== TIME / PRODUCTIVITY =====
//       pool.query(`
//         SELECT SEC_TO_TIME(SUM(TIME_TO_SEC(time))) AS totalHours
//         FROM time_work_logs
//       `),

//       pool.query(`
//         SELECT SEC_TO_TIME(SUM(TIME_TO_SEC(time))) AS weeklyHours
//         FROM time_work_logs
//         WHERE YEARWEEK(date, 1) = YEARWEEK(CURDATE(), 1)
//       `)
//     ]);

//     /* =========================
//        FINAL RESPONSE
//     ========================== */
//     res.json({
//       success: true,
//       data: {
//         topCards: {
//           totalProjects: projects.totalProjects,
//           totalJobs: jobs.totalJobs,
//           activeJobs: activeJobs.activeJobs,
//           completedJobs: completedJobs.completedJobs,
//           invoiceAmount: totalInvoiceAmount.totalInvoiceAmount,
//           poAmount: totalPOAmount.totalPOAmount
//         },

//         jobAnalytics: {
//           createdThisWeek: jobsCreatedThisWeek.jobsCreatedThisWeek,
//           completedThisWeek: jobsCompletedThisWeek.jobsCompletedThisWeek,
//           dueThisWeek: dueThisWeek.dueThisWeek,
//           overdueJobs: overdueJobs.overdueJobs
//         },

//         finance: {
//           invoiceThisMonth: invoiceThisMonth.invoiceThisMonth,
//           poThisMonth: poThisMonth.poThisMonth,
//           paidAmount: invoicePaymentSplit.paidAmount,
//           unpaidAmount: invoicePaymentSplit.unpaidAmount
//         },

//         productivity: {
//           totalHours: totalHours.totalHours || "00:00:00",
//           weeklyHours: weeklyHours.weeklyHours || "00:00:00"
//         }
//       } 
//     });

//   } catch (error) {
//     console.error(error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to load admin dashboard reports"
//     });
//   }
// };

// export const getEmployeeDashboard = async (req, res) => {
//   try {
//     const { employeeId } = req.params;

//     if (!employeeId) {
//       return res.status(400).json({
//         success: false,
//         message: "employeeId is required"
//       });
//     }

//     /* ================= TOP CARDS ================= */
//     const [[topCards]] = await pool.query(`
//       SELECT
//         (SELECT COUNT(*)
//          FROM jobs
//          WHERE job_status = 'in_progress'
//          AND assigned = ?) AS inProgressJobs,

//         (SELECT COUNT(*)
//          FROM jobs
//          WHERE job_status = 'active'
//          AND assigned = ?) AS activeJobs,

//         (SELECT COUNT(*)
//          FROM jobs
//          WHERE job_status = 'completed'
//          AND assigned = ?) AS completedJobs,

//         (SELECT COUNT(*)
//          FROM jobs
//          WHERE job_status IN ('active','in_progress')
//          AND assigned = ?
//          AND updated_at < DATE_SUB(CURDATE(), INTERVAL 3 DAY)
//         ) AS overdueJobs
//     `, [employeeId, employeeId, employeeId, employeeId]);

//     /* ================= WEEKLY PERFORMANCE ================= */
//     const [[weekly]] = await pool.query(`
//       SELECT
//         (SELECT COUNT(*)
//          FROM jobs
//          WHERE job_status = 'completed'
//          AND assigned = ?
//          AND YEARWEEK(updated_at, 1) = YEARWEEK(CURDATE(), 1)
//         ) AS jobsCompletedThisWeek,

//         (SELECT COUNT(*)
//          FROM jobs
//          WHERE assigned = ?
//          AND YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)
//         ) AS jobsCreatedThisWeek,

//         (SELECT COUNT(*)
//          FROM jobs
//          WHERE job_status IN ('active','in_progress')
//          AND assigned = ?
//          AND YEARWEEK(updated_at, 1) = YEARWEEK(CURDATE(), 1)
//         ) AS jobsDueThisWeek
//     `, [employeeId, employeeId, employeeId]);

//     /* ================= PRODUCTIVITY ================= */
//     const [[productivity]] = await pool.query(`
//       SELECT
//         SEC_TO_TIME(
//           SUM(
//             TIME_TO_SEC(IFNULL(time,'00:00:00')) +
//             TIME_TO_SEC(IFNULL(overtime,'00:00:00'))
//           )
//         ) AS weeklyHours,

//         COUNT(DISTINCT job_id) AS jobsWorkedOn
//       FROM time_work_logs
//       WHERE employee_id = ?
//       AND YEARWEEK(date, 1) = YEARWEEK(CURDATE(), 1)
//     `, [employeeId]);

//     /* ================= TODAY PERFORMANCE ================= */
//     const [[today]] = await pool.query(`
//       SELECT
//         SEC_TO_TIME(
//           SUM(
//             TIME_TO_SEC(IFNULL(time,'00:00:00')) +
//             TIME_TO_SEC(IFNULL(overtime,'00:00:00'))
//           )
//         ) AS hoursToday,

//         (SELECT COUNT(*)
//          FROM jobs
//          WHERE assigned = ?
//          AND DATE(updated_at) = CURDATE()
//         ) AS jobsUpdatedToday,

//         (SELECT COUNT(*)
//          FROM jobs
//          WHERE job_status = 'completed'
//          AND assigned = ?
//          AND DATE(updated_at) = CURDATE()
//         ) AS jobsCompletedToday
//     `, [employeeId, employeeId]);

//     /* ================= WORKLOAD ================= */
//     const [[workload]] = await pool.query(`
//       SELECT
//         COUNT(*) AS totalAssignedJobs,
//         SUM(CASE WHEN job_status = 'completed' THEN 1 ELSE 0 END) AS completedJobs,
//         SUM(CASE WHEN job_status IN ('active','in_progress') THEN 1 ELSE 0 END) AS pendingJobs
//       FROM jobs
//       WHERE assigned = ?
//     `, [employeeId]);

//     /* ================= RECENT JOBS ================= */
//     const [recentJobs] = await pool.query(`
//       SELECT
//         j.job_no,
//         j.job_status,
//         j.updated_at,
//         p.project_name
//       FROM jobs j
//       LEFT JOIN projects p ON p.id = j.project_id
//       WHERE j.assigned = ?
//       ORDER BY j.updated_at DESC
//       LIMIT 5
//     `, [employeeId]);

//     /* ================= CALCULATIONS ================= */
//     let avgMinutesPerJob = 0;
//     if (productivity.weeklyHours && productivity.jobsWorkedOn > 0) {
//       const [h = 0, m = 0] = productivity.weeklyHours.split(":").map(Number);
//       const totalMinutes = h * 60 + m;
//       avgMinutesPerJob = Math.round(totalMinutes / productivity.jobsWorkedOn);
//     }

//     const weeklyTarget = 48 * 60; // minutes
//     const [wh = 0, wm = 0] = (productivity.weeklyHours || "00:00:00")
//       .split(":")
//       .map(Number);
//     const weeklyMinutes = wh * 60 + wm;

//     const goalProgress =
//       weeklyTarget > 0
//         ? Math.round((weeklyMinutes / weeklyTarget) * 100)
//         : 0;

//     const completionRate =
//       workload.totalAssignedJobs > 0
//         ? Math.round(
//             (workload.completedJobs / workload.totalAssignedJobs) * 100
//           )
//         : 0;

//     /* ================= RESPONSE ================= */
//     res.json({
//       success: true,
//       data: {
//         topCards: {
//           inProgress: topCards.inProgressJobs,
//           active: topCards.activeJobs,
//           completed: topCards.completedJobs,
//           overdue: topCards.overdueJobs
//         },

//         weeklyPerformance: {
//           completed: weekly.jobsCompletedThisWeek,
//           created: weekly.jobsCreatedThisWeek,
//           dueThisWeek: weekly.jobsDueThisWeek
//         },

//         todayPerformance: {
//           hoursToday: today.hoursToday || "00:00:00",
//           jobsUpdated: today.jobsUpdatedToday,
//           jobsCompleted: today.jobsCompletedToday
//         },

//         productivity: {
//           weeklyHours: productivity.weeklyHours || "00:00:00",
//           avgMinutesPerJob,
//           goalProgress: `${goalProgress}%`,
//           completionRate: `${completionRate}%`
//         },

//         workload: {
//           totalAssigned: workload.totalAssignedJobs,
//           completed: workload.completedJobs,
//           pending: workload.pendingJobs
//         },

//         recentJobs
//       }
//     });

//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };


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

// export const getEmployeeDashboard = async (req, res) => {
//   try {
//     const { employeeId } = req.params;

//     if (!employeeId) {
//       return res.status(400).json({
//         success: false,
//         message: "employeeId is required"
//       });
//     }

//     /* ================= TOP CARDS ================= */
//     const [[topCards]] = await pool.query(`
//       SELECT
//         (SELECT COUNT(*)
//          FROM jobs
//          WHERE job_status = 'in_progress'
//          AND assigned = ?) AS inProgressJobs,

//         (SELECT COUNT(*)
//          FROM jobs
//          WHERE job_status = 'Active'
//          AND assigned = ?) AS activeJobs,

//         (SELECT COUNT(*)
//          FROM jobs
//          WHERE job_status = 'Completed'
//          AND assigned = ?) AS completedJobs,

//         (SELECT COUNT(*)
//          FROM jobs
//          WHERE job_status IN ('Active','in_progress')
//          AND assigned = ?
//          AND updated_at < DATE_SUB(CURDATE(), INTERVAL 3 DAY)
//         ) AS overdueJobs
//     `, [employeeId, employeeId, employeeId, employeeId]);

//     /* ================= WEEKLY PERFORMANCE ================= */
//     const [[weekly]] = await pool.query(`
//       SELECT
//         (SELECT COUNT(*)
//          FROM jobs
//          WHERE job_status = 'Completed'
//          AND assigned = ?
//          AND YEARWEEK(updated_at, 1) = YEARWEEK(CURDATE(), 1)
//         ) AS jobsCompletedThisWeek,

//         (SELECT COUNT(*)
//          FROM jobs
//          WHERE job_status = 'Active'
//          AND assigned = ?
//          AND YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)
//         ) AS dueThisWeek
//     `, [employeeId, employeeId]);

//     /* ================= TIME LOGS ================= */
//     const [[timeData]] = await pool.query(`
//       SELECT
//         SEC_TO_TIME(SUM(TIME_TO_SEC(\`time\`) + TIME_TO_SEC(\`overtime\`))) AS weeklyHours,
//         SEC_TO_TIME(
//           SUM(
//             CASE WHEN DATE(\`date\`) = CURDATE()
//             THEN TIME_TO_SEC(\`time\`) + TIME_TO_SEC(\`overtime\`)
//             ELSE 0 END
//           )
//         ) AS hoursToday
//       FROM time_work_logs
//       WHERE employee_id = ?
//       AND YEARWEEK(\`date\`, 1) = YEARWEEK(CURDATE(), 1)
//     `, [employeeId]);

//     /* ================= RECENT JOBS ================= */
//     const [recentJobs] = await pool.query(`
//       SELECT job_no, job_status, updated_at
//       FROM jobs
//       WHERE assigned = ?
//       ORDER BY updated_at DESC
//       LIMIT 5
//     `, [employeeId]);

//     /* ================= CALCULATIONS ================= */
//     const weeklyTarget = 48;
//     const [h = 0, m = 0] = (timeData.weeklyHours || "00:00:00").split(":").map(Number);
//     const weeklyHours = h + m / 60;

//     const goalProgress = weeklyTarget > 0
//       ? Math.round((weeklyHours / weeklyTarget) * 100)
//       : 0;

//     const completionRate =
//       topCards.completedJobs + topCards.activeJobs + topCards.inProgressJobs > 0
//         ? Math.round(
//             (topCards.completedJobs /
//               (topCards.completedJobs + topCards.activeJobs + topCards.inProgressJobs)) * 100
//           )
//         : 0;

//     /* ================= RESPONSE ================= */
//     res.json({
//       success: true,
//       data: {
//         topCards: {
//           inProgress: topCards.inProgressJobs,
//           active: topCards.activeJobs,
//           completed: topCards.completedJobs,
//           overdue: topCards.overdueJobs
//         },

//         weeklyPerformance: {
//           jobsCompleted: weekly.jobsCompletedThisWeek,
//           dueThisWeek: weekly.dueThisWeek,
//           hoursLogged: timeData.weeklyHours || "00:00:00"
//         },

//         todayPerformance: {
//           date: new Date(),
//           hoursToday: timeData.hoursToday || "00:00:00",
//           weeklyProgress: `${goalProgress}%`,
//           status: goalProgress >= 50 ? "On Track" : "Behind",
//           remainingHours: `${Math.max(weeklyTarget - weeklyHours, 0)}h`
//         },

//         productivity: {
//           weeklyTarget: `${weeklyTarget}h`,
//           completionRate: `${completionRate}%`
//         },

//         recentJobs
//       }
//     });

//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };


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

