import { pool } from "../Config/dbConnect.js";

// ================= CREATE =================
export const createTimeLogs = async (req, res) => {
  try {
    const {
      date,
      employee_id,
      production_id,
      job_id,
      project_id,
      time,
      overtime
    } = req.body;

    const [result] = await pool.query(
      `
      INSERT INTO time_work_logs
      (
        date,
        employee_id,
        production_id,
        job_id,
        project_id,
        time,
        overtime
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        date || null,
        employee_id,
        production_id || null,
        job_id,
        project_id,
        time || null,
        overtime || null
      ]
    );

    const [rows] = await pool.query(
      `SELECT * FROM time_work_logs WHERE id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: "Time log created",
      data: rows[0]
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================= GET ALL =================
// export const getAllTimeLogs = async (req, res) => {
//   try {
//     const [rows] = await pool.query(`
//       SELECT 
//         twl.*,

//         -- JobID from jobs table
//         j.job_no AS JobID,

//         -- Project name from projects table
//         p.project_name AS project_name,

//         -- Assigned info from jobs table
//         j.assigned AS assign_status,

//         CONCAT(u.first_name, ' ', u.last_name) AS employee_name,

//         CONCAT(prod.first_name, ' ', prod.last_name) AS production_name,

//         -- Total time calculation
//         SEC_TO_TIME(
//           TIME_TO_SEC(IFNULL(twl.time,'00:00:00')) +
//           TIME_TO_SEC(IFNULL(twl.overtime,'00:00:00'))
//         ) AS total_time

//       FROM time_work_logs twl
//       LEFT JOIN jobs j ON twl.job_id = j.id
//       LEFT JOIN projects p ON twl.project_id = p.id
//       LEFT JOIN users u ON twl.employee_id = u.id
//       LEFT JOIN users prod ON twl.production_id = prod.id

//       ORDER BY twl.id DESC
//     `);

//     res.json({ success: true, data: rows });

//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

export const getAllTimeLogs = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        twl.*,
        j.job_no AS JobID,
        p.project_name AS project_name,
        j.assigned AS assign_status,
        CONCAT(emp.first_name, ' ', emp.last_name) AS employee_name,
        CONCAT(prod.first_name, ' ', prod.last_name) AS production_name,
        SEC_TO_TIME(
          TIME_TO_SEC(IFNULL(twl.time,'00:00:00')) +
          TIME_TO_SEC(IFNULL(twl.overtime,'00:00:00'))
        ) AS total_time
      FROM time_work_logs twl
      LEFT JOIN jobs j ON twl.job_id = j.id
      LEFT JOIN projects p ON twl.project_id = p.id
      LEFT JOIN users emp ON twl.employee_id = emp.id
      LEFT JOIN users prod ON twl.production_id = prod.id
      ORDER BY twl.id DESC
    `);

    // 🔥 RESPONSE TRANSFORMATION LOGIC
    const formattedData = [];

    rows.forEach(row => {
      const base = {
        id: row.id,
        date: row.date,
        employee_id: row.employee_id,
        production_id: row.production_id,
        job_id: row.job_id,
        project_id: row.project_id,
        time: row.time,
        overtime: row.overtime,
        task_description: row.task_description,
        created_at: row.created_at,
        updated_at: row.updated_at,
        JobID: row.JobID,
        project_name: row.project_name,
        assign_status: row.assign_status,
        total_time: row.total_time
      };

      // ✅ If employee exists → create object
      if (row.employee_id && row.employee_name) {
        formattedData.push({
          ...base,
          employee_name: row.employee_name
        });
      }

      // ✅ If production exists → create object
      if (row.production_id && row.production_name) {
        formattedData.push({
          ...base,
          employee_name: row.production_name
        });
      }
    });

    res.json({ success: true, data: formattedData });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================= GET BY ID =================
export const getByIdTimeLogs = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT 
        twl.*,

        -- JobID from jobs table
        j.job_no AS JobID,

        -- Project name from projects table
        p.project_name AS project_name,

        -- Assigned info from jobs table
        j.assigned AS assign_status,

        CONCAT(u.first_name, ' ', u.last_name) AS employee_name,

        CONCAT(prod.first_name, ' ', prod.last_name) AS production_name,

        -- Total time calculation
        SEC_TO_TIME(
          TIME_TO_SEC(IFNULL(twl.time,'00:00:00')) +
          TIME_TO_SEC(IFNULL(twl.overtime,'00:00:00'))
        ) AS total_time

      FROM time_work_logs twl
      LEFT JOIN jobs j ON twl.job_id = j.id
      LEFT JOIN projects p ON twl.project_id = p.id
      LEFT JOIN users u ON twl.employee_id = u.id
      LEFT JOIN users prod ON twl.production_id = prod.id

      WHERE twl.id = ?
      `,
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "Record not found"
      });
    }

    res.json({ success: true, data: rows[0] });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================= UPDATE (SAFE UPDATE) =================
export const updateTimeLogs = async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.query(
      `SELECT * FROM time_work_logs WHERE id = ?`,
      [id]
    );

    if (!existing.length) {
      return res.status(404).json({
        success: false,
        message: "Record not found"
      });
    }

    const old = existing[0];
    const {
      date,
      employee_id,
      production_id,
      job_id,
      project_id,
      time,
      overtime
    } = req.body;

    await pool.query(
      `
      UPDATE time_work_logs
      SET
        date = ?,
        employee_id = ?,
        production_id = ?,
        job_id = ?,
        project_id = ?,
        time = ?,
        overtime = ?
      WHERE id = ?
      `,
      [
        date ?? old.date,
        employee_id ?? old.employee_id,
        production_id ?? old.production_id,
        job_id ?? old.job_id,
        project_id ?? old.project_id,
        time ?? old.time,
        overtime ?? old.overtime,
        id
      ]
    );

    res.json({ success: true, message: "Time log updated" });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// ================= DELETE =================
export const removeTimeLogs = async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM time_work_logs WHERE id = ?`,
      [req.params.id]
    );

    res.json({ success: true, message: "Time log deleted" });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};



export const getTimeLogsByProduction = async (req, res) => {
  try {
    const { productionId } = req.params;

    const [rows] = await pool.query(
      `
      SELECT 
        twl.*,
        j.job_no AS JobID,
        p.project_name AS project_name,
        j.assigned AS assign_status,
        CONCAT(u.first_name, ' ', u.last_name) AS employee_name,
        CONCAT(prod.first_name, ' ', prod.last_name) AS production_name,
        SEC_TO_TIME(
          TIME_TO_SEC(IFNULL(twl.time,'00:00:00')) +
          TIME_TO_SEC(IFNULL(twl.overtime,'00:00:00'))
        ) AS total_time
      FROM time_work_logs twl
      LEFT JOIN jobs j ON twl.job_id = j.id
      LEFT JOIN projects p ON twl.project_id = p.id
      LEFT JOIN users u ON twl.employee_id = u.id
      LEFT JOIN users prod ON twl.production_id = prod.id
      WHERE twl.production_id = ?
      ORDER BY twl.date DESC, twl.id DESC
      `,
      [productionId]
    );

    res.json({ success: true, data: rows });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTimeLogsByEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const [rows] = await pool.query(
      `
      SELECT 
        twl.*,
        j.job_no AS JobID,
        aj.task_description AS task_description,  
        p.project_name AS project_name,
        j.assigned AS assign_status,
        CONCAT(u.first_name, ' ', u.last_name) AS employee_name,
        CONCAT(prod.first_name, ' ', prod.last_name) AS production_name,
        SEC_TO_TIME(
          TIME_TO_SEC(IFNULL(twl.time,'00:00:00')) +
          TIME_TO_SEC(IFNULL(twl.overtime,'00:00:00'))
        ) AS total_time
      FROM time_work_logs twl
      LEFT JOIN jobs j ON twl.job_id = j.id
      LEFT JOIN projects p ON twl.project_id = p.id
      LEFT JOIN users u ON twl.employee_id = u.id
      LEFT JOIN users prod ON twl.production_id = prod.id
      LEFT JOIN assign_jobs aj 
  ON JSON_CONTAINS(aj.job_ids, JSON_ARRAY(j.id))

      WHERE twl.employee_id = ?
      ORDER BY twl.date DESC, twl.id DESC
      `,
      [employeeId]
    );

    res.json({ success: true, data: rows });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

