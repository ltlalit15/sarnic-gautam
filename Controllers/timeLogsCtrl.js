import { pool } from "../Config/dbConnect.js";

// ================= CREATE =================
export const createTimeLogs = async (req, res) => {
  try {
    const {
      date,
      employee_id,
      job_id,
      project_id,
      time,
      overtime,
      taskDescription
    } = req.body;

    const [result] = await pool.query(
      `
      INSERT INTO time_work_logs
      (date, employee_id, job_id, project_id, time, overtime, task_description)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        date || null,
        employee_id,
        job_id,
        project_id,
        time || null,
        overtime || null,
        taskDescription || null
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
//     const [rows] = await pool.query(
//       `SELECT * FROM time_work_logs ORDER BY id DESC`
//     );
//     res.json({ success: true, data: rows });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

export const getAllTimeLogs = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        *,
        SEC_TO_TIME(
          TIME_TO_SEC(IFNULL(time,'00:00:00')) +
          TIME_TO_SEC(IFNULL(overtime,'00:00:00'))
        ) AS total_time
      FROM time_work_logs
      ORDER BY id DESC
    `);

    res.json({ success: true, data: rows });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// ================= GET BY ID =================
// export const getByIdTimeLogs = async (req, res) => {
//   try {
//     const [rows] = await pool.query(
//       `SELECT * FROM time_work_logs WHERE id = ?`,
//       [req.params.id]
//     );

//     if (!rows.length) {
//       return res.status(404).json({ success: false, message: "Record not found" });
//     }

//     res.json({ success: true, data: rows[0] });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };
export const getByIdTimeLogs = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT 
        *,
        SEC_TO_TIME(
          TIME_TO_SEC(IFNULL(time,'00:00:00')) +
          TIME_TO_SEC(IFNULL(overtime,'00:00:00'))
        ) AS total_time
      FROM time_work_logs
      WHERE id = ?
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
      return res.status(404).json({ success: false, message: "Record not found" });
    }

    const old = existing[0];
    const {
      date,
      employee_id,
      job_id,
      project_id,
      time,
      overtime,
      taskDescription
    } = req.body;

    await pool.query(
      `
      UPDATE time_work_logs
      SET
        date = ?,
        employee_id = ?,
        job_id = ?,
        project_id = ?,
        time = ?,
        overtime = ?,
        task_description = ?
      WHERE id = ?
      `,
      [
        date ?? old.date,
        employee_id ?? old.employee_id,
        job_id ?? old.job_id,
        project_id ?? old.project_id,
        time ?? old.time,
        overtime ?? old.overtime,
        taskDescription ?? old.task_description,
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
