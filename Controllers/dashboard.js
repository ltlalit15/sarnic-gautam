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
         WHERE job_status = 'Active'
         AND assigned = ?) AS inProgressJobs,

        (SELECT COUNT(*) 
         FROM jobs 
         WHERE job_status = 'Completed'
         AND assigned = ?) AS completedJobs,

        0 AS hoursLogged
    `, [productionId, productionId]);

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
         WHERE job_status = 'Active'
         AND assigned = ?) AS inProgressJobs,

        (SELECT COUNT(*)
         FROM jobs
         WHERE job_status = 'Completed'
         AND assigned = ?) AS completedJobs,

        0 AS hoursLogged
    `, [employeeId, employeeId]);

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


