import { pool } from "../Config/dbConnect.js";

// ================= CREATE =================
export const createTimeLogs = async (req, res) => {
  try {
    const {
      date,
      employee_id,
      production_id, // ✅ NEW
      job_id,
      project_id,
      time,
      overtime,
      taskDescription
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
        overtime,
        task_description
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        date || null,
        employee_id,
        production_id || null, // ✅ NULL safe
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
export const getAllTimeLogs = async (req, res) => {
  try {
    const [rows] = await pool.query(`
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

      ORDER BY twl.id DESC
    `);

    res.json({ success: true, data: rows });

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
      production_id, // ✅ NEW
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
        production_id = ?, -- ✅ NEW
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
        production_id ?? old.production_id, // ✅ SAFE
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