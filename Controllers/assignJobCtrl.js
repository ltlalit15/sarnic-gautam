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
const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1️⃣ Fetch job_ids using assign_jobs.id
    const [assignRows] = await connection.query(
      `SELECT job_ids FROM assign_jobs WHERE id = ?`,
      [req.params.id]
    );

    if (!assignRows.length) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Assign job not found"
      });
    }

    // 2️⃣ Parse job_ids (LONGTEXT → JSON)
    let jobIds = assignRows[0].job_ids;

    if (typeof jobIds === "string") {
      jobIds = JSON.parse(jobIds); // "[15,16]" → [15,16]
    }

    if (!Array.isArray(jobIds)) {
      jobIds = [];
    }

    // 3️⃣ Update assign_jobs
    await connection.query(
      `
      UPDATE assign_jobs
      SET 
        production_status = 'complete',
        admin_status = 'complete',
        production_id = NULL
      WHERE id = ?
      `,
      [req.params.id]
    );

    // 4️⃣ Update related jobs
    if (jobIds.length > 0) {
      const placeholders = jobIds.map(() => "?").join(",");

      await connection.query(
        `
        UPDATE jobs
        SET 
          assigned = NULL,
          job_status = 'complete'
        WHERE id IN (${placeholders})
        `,
        jobIds
      );
    }

    await connection.commit();

    res.json({
      success: true,
      message: "Production completed, jobs unassigned & marked complete"
    });

  } catch (error) {
    await connection.rollback();
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error"
    });

  } finally {
    connection.release();
  }
};

export const productionReturnJob = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1️⃣ Get assign job ids (BODY first, fallback to PARAM)
    let assignIds = req.body?.ids;

    if (!Array.isArray(assignIds) || !assignIds.length) {
      if (req.params.id) {
        assignIds = [Number(req.params.id)];
      }
    }

    if (!Array.isArray(assignIds) || !assignIds.length) {
      return res.status(400).json({
        success: false,
        message: "No assign job ids provided"
      });
    }

    // ensure numbers
    assignIds = assignIds.map(id => Number(id)).filter(Boolean);

    // 2️⃣ Fetch job_ids
    const placeholders = assignIds.map(() => "?").join(",");

    const [assignRows] = await connection.query(
      `SELECT id, job_ids FROM assign_jobs WHERE id IN (${placeholders})`,
      assignIds
    );

    if (!assignRows.length) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Assign job(s) not found"
      });
    }

    // 3️⃣ Collect all related job ids
    let allJobIds = [];

    for (const row of assignRows) {
      let jobIds = row.job_ids;

      if (typeof jobIds === "string") {
        jobIds = JSON.parse(jobIds);
      }

      if (Array.isArray(jobIds)) {
        allJobIds.push(...jobIds);
      }
    }

    allJobIds = [...new Set(allJobIds)];

    // 4️⃣ Update assign_jobs → RETURN
    await connection.query(
      `
      UPDATE assign_jobs
      SET 
        production_status = 'return',
        admin_status = 'return',
        production_id = NULL
      WHERE id IN (${placeholders})
      `,
      assignIds
    );

    // 5️⃣ Update jobs → RETURN
    if (allJobIds.length > 0) {
      const jobPlaceholders = allJobIds.map(() => "?").join(",");

      await connection.query(
        `
        UPDATE jobs
        SET 
          assigned = 'Not Assigned',
          job_status = 'return'
        WHERE id IN (${jobPlaceholders})
        `,
        allJobIds
      );
    }

    await connection.commit();

    res.json({
      success: true,
      message: "Production returned. Jobs marked as return & unassigned.",
      assignJobIds: assignIds,
      affectedJobIds: allJobIds
    });

  } catch (error) {
    await connection.rollback();
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error"
    });

  } finally {
    connection.release();
  }
};
export const productionRejectJob = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1️⃣ Get assign job ids (BODY first, PARAM fallback)
    let assignIds = req.body?.ids;

    if (!Array.isArray(assignIds) || !assignIds.length) {
      if (req.params.id) {
        assignIds = [Number(req.params.id)];
      }
    }

    if (!Array.isArray(assignIds) || !assignIds.length) {
      return res.status(400).json({
        success: false,
        message: "No assign job ids provided"
      });
    }

    assignIds = assignIds.map(id => Number(id)).filter(Boolean);

    // 2️⃣ Fetch job_ids
    const placeholders = assignIds.map(() => "?").join(",");

    const [assignRows] = await connection.query(
      `SELECT id, job_ids FROM assign_jobs WHERE id IN (${placeholders})`,
      assignIds
    );

    if (!assignRows.length) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Assign job(s) not found"
      });
    }

    // 3️⃣ Collect all job ids
    let allJobIds = [];

    for (const row of assignRows) {
      let jobIds = row.job_ids;

      if (typeof jobIds === "string") {
        jobIds = JSON.parse(jobIds);
      }

      if (Array.isArray(jobIds)) {
        allJobIds.push(...jobIds);
      }
    }

    allJobIds = [...new Set(allJobIds)];

    // 4️⃣ Update assign_jobs → REJECT
    await connection.query(
      `
      UPDATE assign_jobs
      SET 
        production_status = 'reject',
        admin_status = 'reject',
        production_id = NULL
      WHERE id IN (${placeholders})
      `,
      assignIds
    );

    // 5️⃣ Update jobs → REJECT
    if (allJobIds.length > 0) {
      const jobPlaceholders = allJobIds.map(() => "?").join(",");

      await connection.query(
        `
        UPDATE jobs
        SET 
          assigned = 'Not Assigned',
          job_status = 'reject'
        WHERE id IN (${jobPlaceholders})
        `,
        allJobIds
      );
    }

    await connection.commit();

    res.json({
      success: true,
      message: "Production rejected successfully",
      assignJobIds: assignIds,
      affectedJobIds: allJobIds
    });

  } catch (error) {
    await connection.rollback();
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error"
    });

  } finally {
    connection.release();
  }
};

export const getJobsByEmployee = async (req, res) => {
  const [rows] = await pool.query(
    `SELECT * FROM assign_jobs WHERE employee_id = ?`,
    [req.params.employee_id]
  );

  res.json({ success: true, data: rows });
};

export const getJobsByProduction = async (req, res) => {
  try {
    const productionId = req.params.production_id;

    const [rows] = await pool.query(
      `
      SELECT
        aj.*,

        -- job
        j.id AS job_id,
        j.job_no,
        j.job_status,
        j.priority AS job_priority,
        j.pack_size,
        j.ean_barcode,
        j.project_id,

        -- project
        p.id AS project_id,
        p.project_name,
        p.project_no,
        p.client_name,
        p.status AS project_status,
        p.priority AS project_priority,
        p.start_date,
        p.expected_completion_date,

        -- brand
        b.id AS brand_id,
        b.name AS brand_name,

        -- sub brand
        sb.id AS sub_brand_id,
        sb.name AS sub_brand_name,

        -- flavour
        f.id AS flavour_id,
        f.name AS flavour_name,

        -- pack code
        pc.id AS pack_code_id,
        pc.name AS pack_code_name,

        -- pack type
        pt.id AS pack_type_id,
        pt.name AS pack_type_name,

        -- production user
        u.id AS production_user_id,
        u.first_name AS production_first_name,
        u.last_name AS production_last_name,
        u.email AS production_email

      FROM assign_jobs aj

      JOIN jobs j 
        ON JSON_CONTAINS(aj.job_ids, JSON_ARRAY(j.id))

      JOIN projects p 
        ON j.project_id = p.id

      LEFT JOIN brand_names b 
        ON j.brand_id = b.id

      LEFT JOIN sub_brands sb 
        ON j.sub_brand_id = sb.id

      LEFT JOIN flavours f 
        ON j.flavour_id = f.id

      LEFT JOIN pack_codes pc 
        ON j.pack_code_id = pc.id

      LEFT JOIN pack_types pt 
        ON j.pack_type_id = pt.id

      LEFT JOIN users u 
        ON aj.production_id = u.id

      WHERE aj.production_id = ?
      ORDER BY aj.created_at DESC
      `,
      [productionId]
    );

    // =====================================
    // Transform rows → structured objects
    // =====================================
    const resultMap = {};

    rows.forEach(row => {
      if (!resultMap[row.id]) {
        resultMap[row.id] = {
          assign_job: {
            id: row.id,
            project_id: row.project_id,
            job_ids: row.job_ids,
            employee_id: row.employee_id,
            production_id: row.production_id,
            task_description: row.task_description,
            time_budget: row.time_budget,
            admin_status: row.admin_status,
            production_status: row.production_status,
            employee_status: row.employee_status,
            created_at: row.created_at,
            updated_at: row.updated_at
          },

          production_user: row.production_user_id
            ? {
                id: row.production_user_id,
                first_name: row.production_first_name,
                last_name: row.production_last_name,
                email: row.production_email
              }
            : null,

          project: {
            id: row.project_id,
            project_no: row.project_no,
            project_name: row.project_name,
            client_name: row.client_name,
            status: row.project_status,
            priority: row.project_priority,
            start_date: row.start_date,
            expected_completion_date: row.expected_completion_date
          },

          jobs: []
        };
      }

      resultMap[row.id].jobs.push({
        id: row.job_id,
        job_no: row.job_no,
        job_status: row.job_status,
        priority: row.job_priority,
        pack_size: row.pack_size,
        ean_barcode: row.ean_barcode,

        brand: row.brand_id
          ? { id: row.brand_id, name: row.brand_name }
          : null,

        sub_brand: row.sub_brand_id
          ? { id: row.sub_brand_id, name: row.sub_brand_name }
          : null,

        flavour: row.flavour_id
          ? { id: row.flavour_id, name: row.flavour_name }
          : null,

        pack_code: row.pack_code_id
          ? { id: row.pack_code_id, name: row.pack_code_name }
          : null,

        pack_type: row.pack_type_id
          ? { id: row.pack_type_id, name: row.pack_type_name }
          : null
      });
    });

    res.json({
      success: true,
      data: Object.values(resultMap)
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};



export const deleteAssignJob = async (req, res) => {
  await pool.query(`DELETE FROM assign_jobs WHERE id = ?`, [req.params.id]);
  res.json({ success: true });
};
