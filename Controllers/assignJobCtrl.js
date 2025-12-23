import { pool } from "../Config/dbConnect.js";

// export const createAssignJob = async (req, res) => {
//   try {
//     const {
//       project_id,
//       job_ids,
//       employee_id,
//       production_id,
//       task_description,
//       time_budget
//     } = req.body;

//     if (!project_id || !job_ids || (!employee_id && !production_id)) {
//       return res.status(400).json({ message: "Required fields missing" });
//     }

//     let admin_status = "in_progress";
//     let production_status = "not_applicable";
//     let employee_status = "not_applicable";

//     // Admin → Production
//     if (production_id && !employee_id) {
//       production_status = "in_progress";
//     }

//     // Admin → Employee (direct complete)
//     if (employee_id && !production_id) {
//       admin_status = "complete";
//       employee_status = "complete";
//     }

//     await pool.query(
//       `INSERT INTO assign_jobs
//       (project_id, job_ids, employee_id, production_id, task_description, time_budget,
//        admin_status, production_status, employee_status)
//       VALUES (?,?,?,?,?,?,?,?,?)`,
//       [
//         project_id,
//         JSON.stringify(job_ids),
//         employee_id || null,
//         production_id || null,
//         task_description || null,
//         time_budget || null,
//         admin_status,
//         production_status,
//         employee_status
//       ]
//     );

//     res.status(201).json({
//       success: true,
//       message: "Job assigned successfully"
//     });

//   } catch (error) {
//     console.error("Assign Job Error:", error);
//     res.status(500).json({ message: error.message });
//   }
// };


export const createAssignJob = async (req, res) => {
  try {
    const {
      project_id,
      job_ids,          // expects "[14]" or "[14,15]"
      employee_id,
      production_id,
      task_description,
      time_budget
    } = req.body;

    // -----------------------------
    // Validation
    // -----------------------------
    if (!project_id || !job_ids || (!employee_id && !production_id)) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    // -----------------------------
    // Status defaults
    // -----------------------------
    let admin_status = "in_progress";
    let production_status = "not_applicable";
    let employee_status = "not_applicable";

    let assignedLabel = "Not Assigned";

    // -----------------------------
    // Assignment logic
    // -----------------------------
    if (production_id && !employee_id) {
      production_status = "in_progress";
      assignedLabel = `${production_id}`;
    }

    if (employee_id && !production_id) {
      admin_status = "complete";
      employee_status = "complete";
      assignedLabel = `Employee-${employee_id}`;
    }

    // -----------------------------
    // 1️⃣ Insert into assign_jobs
    // -----------------------------
    await pool.query(
      `
      INSERT INTO assign_jobs
      (
        project_id,
        job_ids,
        employee_id,
        production_id,
        task_description,
        time_budget,
        admin_status,
        production_status,
        employee_status
      )
      VALUES (?,?,?,?,?,?,?,?,?)
      `,
      [
        project_id,
        job_ids, // keep JSON string as-is
        employee_id || null,
        production_id || null,
        task_description || null,
        time_budget || null,
        admin_status,
        production_status,
        employee_status
      ]
    );

    // -----------------------------
    // 2️⃣ Update jobs table (MariaDB SAFE)
    // -----------------------------
    await pool.query(
      `
      UPDATE jobs
      SET
        job_status = 'in_progress',
        assigned = ?
      WHERE FIND_IN_SET(
        id,
        REPLACE(REPLACE(?, '[', ''), ']', '')
      )
      `,
      [assignedLabel, job_ids]
    );

    // -----------------------------
    // Response
    // -----------------------------
    res.status(201).json({
      success: true,
      message: "Job assigned successfully & jobs updated"
    });

  } catch (error) {
    console.error("Assign Job Error:", error);
    res.status(500).json({ message: error.message });
  }
};


export const productionAssignToEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { employee_id } = req.body;

    await pool.query(
      `UPDATE assign_jobs
       SET employee_id = ?, employee_status = 'in_progress'
       WHERE id = ?`,
      [employee_id, id]
    );

    res.json({ success: true, message: "Assigned to employee by production" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const employeeCompleteJob = async (req, res) => {
  await pool.query(
    `UPDATE assign_jobs SET employee_status = 'complete' WHERE id = ?`,
    [req.params.id]
  );

  res.json({ success: true, message: "Employee completed job" });
};

export const productionCompleteJob = async (req, res) => {
  await pool.query(
    `UPDATE assign_jobs
     SET production_status = 'complete',
         admin_status = 'complete'
     WHERE id = ?`,
    [req.params.id]
  );

  res.json({ success: true, message: "Production completed job" });
};

export const getJobsByEmployee = async (req, res) => {
  const [rows] = await pool.query(
    `SELECT * FROM assign_jobs WHERE employee_id = ?`,
    [req.params.employee_id]
  );

  res.json({ success: true, data: rows });
};

export const getJobsByProduction = async (req, res) => {
  const [rows] = await pool.query(
    `SELECT * FROM assign_jobs WHERE production_id = ?`,
    [req.params.production_id]
  );

  res.json({ success: true, data: rows });
};



export const deleteAssignJob = async (req, res) => {
  await pool.query(`DELETE FROM assign_jobs WHERE id = ?`, [req.params.id]);
  res.json({ success: true });
};
