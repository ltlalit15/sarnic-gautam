import { pool } from "../Config/dbConnect.js";

export const createJob = async (req, res) => {
  try {
    const {
      project_id,
      project_name,
      brand_id,
      sub_brand_id,
      flavour_id,
      pack_type_id,
      pack_code_id,
      pack_size,
      priority,
      ean_barcode
    } = req.body;

    if (!project_id) {
      return res.status(400).json({ message: "project_id is required" });
    }

    // 1️⃣ Get project details
    const [[project]] = await pool.query(
      "SELECT project_no, project_name FROM projects WHERE id = ?",
      [project_id]
    );

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const finalProjectName = project_name || project.project_name;

    // 2️⃣ Generate job_no
    const [[row]] = await pool.query(
      "SELECT MAX(job_no) AS maxJobNo FROM jobs"
    );

    const nextJobNo = (row.maxJobNo || 18542) + 1;

    // 3️⃣ Insert job (job_status = Active)
    const [result] = await pool.query(
      `INSERT INTO jobs (
        job_no,
        project_id,
        project_name,
        brand_id,
        sub_brand_id,
        flavour_id,
        pack_type_id,
        pack_code_id,
        pack_size,
        priority,
        ean_barcode,
        job_status
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        nextJobNo,
        project_id,
        finalProjectName,
        brand_id || null,
        sub_brand_id || null,
        flavour_id || null,
        pack_type_id || null,
        pack_code_id || null,
        pack_size || null,
        priority ? priority.toLowerCase() : "medium",
        ean_barcode || null,
        "Active"
      ]
    );

    res.status(201).json({
      success: true,
      message: "Job created successfully",
      job_id: result.insertId,
      job_no: nextJobNo,
      project_no: project.project_no,
      project_name: finalProjectName,
      job_status: "Active"
    });

  } catch (error) {
    console.error("Create Job Error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const getAllJobs = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        j.*,
        p.project_no,
        p.project_name AS main_project_name,
        b.name AS brand_name,
        sb.name AS sub_brand_name,
        f.name AS flavour_name,
        pt.name AS pack_type_name,
        pc.name AS pack_code_name
      FROM jobs j
      LEFT JOIN projects p ON j.project_id = p.id
      LEFT JOIN brand_names b ON j.brand_id = b.id
      LEFT JOIN sub_brands sb ON j.sub_brand_id = sb.id
      LEFT JOIN flavours f ON j.flavour_id = f.id
      LEFT JOIN pack_types pt ON j.pack_type_id = pt.id
      LEFT JOIN pack_codes pc ON j.pack_code_id = pc.id
      ORDER BY j.id DESC
    `);

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Get Jobs Error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const getJobById = async (req, res) => {
  try {
    const { id } = req.params;

    const [[job]] = await pool.query(`
      SELECT
        j.*,
        p.project_no,
        p.project_name AS main_project_name,
        b.name AS brand_name,
        sb.name AS sub_brand_name,
        f.name AS flavour_name,
        pt.name AS pack_type_name,
        pc.name AS pack_code_name
      FROM jobs j
      LEFT JOIN projects p ON j.project_id = p.id
      LEFT JOIN brand_names b ON j.brand_id = b.id
      LEFT JOIN sub_brands sb ON j.sub_brand_id = sb.id
      LEFT JOIN flavours f ON j.flavour_id = f.id
      LEFT JOIN pack_types pt ON j.pack_type_id = pt.id
      LEFT JOIN pack_codes pc ON j.pack_code_id = pc.id
      WHERE j.id = ?
    `, [id]);

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    res.json({ success: true, data: job });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// export const getJobsByProjectId = async (req, res) => {
//   try {
//     const { projectId } = req.params;

//     const [rows] = await pool.query(`
//       SELECT
//         j.*,
//         p.project_no,
//         p.project_name AS main_project_name,
//         b.name AS brand_name,
//         sb.name AS sub_brand_name,
//         f.name AS flavour_name,
//         pt.name AS pack_type_name,
//         pc.name AS pack_code_name
//       FROM jobs j
//       LEFT JOIN projects p ON j.project_id = p.id
//       LEFT JOIN brand_names b ON j.brand_id = b.id
//       LEFT JOIN sub_brands sb ON j.sub_brand_id = sb.id
//       LEFT JOIN flavours f ON j.flavour_id = f.id
//       LEFT JOIN pack_types pt ON j.pack_type_id = pt.id
//       LEFT JOIN pack_codes pc ON j.pack_code_id = pc.id
//       WHERE j.project_id = ?
//       ORDER BY j.id DESC
//     `, [projectId]);

//     res.json({ success: true, data: rows });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };



// export const getJobsByProjectId = async (req, res) => {
//   try {
//     const { projectId } = req.params;

//     const [rows] = await pool.query(`
//       SELECT
//         j.*,
//         p.project_no,
//         p.project_name AS main_project_name,
//         b.name AS brand_name,
//         sb.name AS sub_brand_name,
//         f.name AS flavour_name,
//         pt.name AS pack_type_name,
//         pc.name AS pack_code_name,

//         -- Assigned user details
//         u.id AS assigned_user_id,
//         CONCAT(u.first_name, ' ', u.last_name) AS assigned_name,
//         u.role_name AS assigned_role

//       FROM jobs j
//       LEFT JOIN projects p ON j.project_id = p.id
//       LEFT JOIN brand_names b ON j.brand_id = b.id
//       LEFT JOIN sub_brands sb ON j.sub_brand_id = sb.id
//       LEFT JOIN flavours f ON j.flavour_id = f.id
//       LEFT JOIN pack_types pt ON j.pack_type_id = pt.id
//       LEFT JOIN pack_codes pc ON j.pack_code_id = pc.id
//       LEFT JOIN users u ON u.id = j.assigned

//       WHERE j.project_id = ?
//       ORDER BY j.id DESC
//     `, [projectId]);

//     res.json({ success: true, data: rows });

//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// export const getJobsByProjectId = async (req, res) => {
//   try {
//     const { projectId } = req.params;

//     const [rows] = await pool.query(`
//       SELECT
//         j.*,
//         p.project_no,
//         p.project_name AS main_project_name,
//         b.name AS brand_name,
//         sb.name AS sub_brand_name,
//         f.name AS flavour_name,
//         pt.name AS pack_type_name,
//         pc.name AS pack_code_name,

//         -- Assigned PRODUCTION user details
//         pu.id AS assigned_user_id,
//         CONCAT(pu.first_name, ' ', pu.last_name) AS assigned_name,
//         pu.role_name AS assigned_role

//       FROM jobs j
//       LEFT JOIN projects p ON j.project_id = p.id
//       LEFT JOIN brand_names b ON j.brand_id = b.id
//       LEFT JOIN sub_brands sb ON j.sub_brand_id = sb.id
//       LEFT JOIN flavours f ON j.flavour_id = f.id
//       LEFT JOIN pack_types pt ON j.pack_type_id = pt.id
//       LEFT JOIN pack_codes pc ON j.pack_code_id = pc.id

//       -- 🔥 map job → assign_jobs using JSON job_ids
//       LEFT JOIN assign_jobs aj
//         ON JSON_CONTAINS(aj.job_ids, JSON_ARRAY(j.id))

//       -- 🔥 production user
//       LEFT JOIN users pu
//         ON pu.id = aj.production_id

//       WHERE j.project_id = ?
//       ORDER BY j.id DESC
//     `, [projectId]);

//     res.json({ success: true, data: rows });

//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };
export const getJobsByProjectId = async (req, res) => {
  try {
    const { projectId } = req.params;

    const [rows] = await pool.query(`
      SELECT
        j.*,
        p.project_no,
        p.project_name AS main_project_name,
        b.name AS brand_name,
        sb.name AS sub_brand_name,
        f.name AS flavour_name,
        pt.name AS pack_type_name,
        pc.name AS pack_code_name,

        aj.id AS assign_id,
        aj.production_status,
        aj.admin_status,
        aj.employee_status,

        pu.id AS assigned_user_id,
        CONCAT(pu.first_name, ' ', pu.last_name) AS assigned_name,
        pu.role_name AS assigned_role

      FROM jobs j
      LEFT JOIN projects p ON j.project_id = p.id
      LEFT JOIN brand_names b ON j.brand_id = b.id
      LEFT JOIN sub_brands sb ON j.sub_brand_id = sb.id
      LEFT JOIN flavours f ON j.flavour_id = f.id
      LEFT JOIN pack_types pt ON j.pack_type_id = pt.id
      LEFT JOIN pack_codes pc ON j.pack_code_id = pc.id

      LEFT JOIN assign_jobs aj
        ON aj.id = (
          SELECT aj2.id
          FROM assign_jobs aj2
          WHERE JSON_CONTAINS(aj2.job_ids, JSON_ARRAY(j.id))
            AND aj2.project_id = j.project_id
          ORDER BY aj2.created_at DESC
          LIMIT 1
        )

      LEFT JOIN users pu ON pu.id = j.assigned

      WHERE j.project_id = ?
      ORDER BY j.id DESC
    `, [projectId]);

    res.json({ success: true, data: rows });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateJob = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      brand_id,
      sub_brand_id,
      flavour_id,
      pack_type_id,
      pack_code_id,
      pack_size,
      priority,
      ean_barcode,
      job_status
    } = req.body;

    await pool.query(
      `UPDATE jobs SET
        brand_id = ?,
        sub_brand_id = ?,
        flavour_id = ?,
        pack_type_id = ?,
        pack_code_id = ?,
        pack_size = ?,
        priority = ?,
        ean_barcode = ?,
        job_status = ?
      WHERE id = ?`,
      [
        brand_id || null,
        sub_brand_id || null,
        flavour_id || null,
        pack_type_id || null,
        pack_code_id || null,
        pack_size || null,
        priority ? priority.toLowerCase() : "medium",
        ean_barcode || null,
        job_status || "Active",
        id
      ]
    );

    res.json({ success: true, message: "Job updated successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// export const deleteJob = async (req, res) => {
//   try {
//     const { id } = req.params;

//     await pool.query("DELETE FROM jobs WHERE id = ?", [id]);

//     res.json({ success: true, message: "Job deleted successfully" });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };
export const deleteJob = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;
    const jobId = Number(id);
    console.log("Deleting Job ID:", jobId);

    await connection.beginTransaction();

    // 1️⃣ Delete time logs for this job
    await connection.query(
      "DELETE FROM time_work_logs WHERE job_id = ?",
      [jobId]
    );

    // 2️⃣ Fetch assign_jobs that contain this job_id
    const [assignJobs] = await connection.query(
      `
      SELECT id, job_ids
      FROM assign_jobs
      WHERE FIND_IN_SET(
        ?,
        REPLACE(REPLACE(job_ids, '[', ''), ']', '')
      )
      `,
      [jobId]
    );

    // 3️⃣ Update or delete assign_jobs rows
    for (const row of assignJobs) {
      // Convert "[17,16]" → [17,16]
      const jobIdsArray = row.job_ids
        .replace("[", "")
        .replace("]", "")
        .split(",")
        .map(Number)
        .filter(jid => jid !== jobId);

      if (jobIdsArray.length === 0) {
        await connection.query(
          "DELETE FROM assign_jobs WHERE id = ?",
          [row.id]
        );
      } else {
        await connection.query(
          "UPDATE assign_jobs SET job_ids = ? WHERE id = ?",
          [`[${jobIdsArray.join(",")}]`, row.id]
        );
      }
    }

   const [jobDeleteResult] = await connection.query(
      "DELETE FROM jobs WHERE id = ?",
      [jobId]
    );

    if (jobDeleteResult.affectedRows === 0) {
      throw new Error("Job not found or already deleted");
    }

    await connection.commit();

    res.json({
      success: true,
      message: "Job deleted successfully"
    });

  } catch (error) {
    await connection.rollback();
    console.error("Delete Job Error:", error);
    res.status(500).json({ message: error.message });
  } finally {
    connection.release();
  }
};

// export const getJobHistoryByProductionId = async (req, res) => {
//   try {
//     const { productionId } = req.params;

//     const [rows] = await pool.query(
//       `
//       SELECT
//         aj.id AS assign_job_id,
//         aj.project_id,
//         aj.job_ids,
//         aj.production_id,
//         aj.employee_id,
//         aj.task_description,
//         aj.time_budget,
//         aj.admin_status,
//         aj.production_status,
//         aj.employee_status,
//         aj.created_at,

//         j.job_no,
//         j.job_status,
//         j.priority,

//         p.project_name,

//         u.first_name AS employee_first_name,
//         u.last_name AS employee_last_name

//       FROM assign_jobs aj
//       LEFT JOIN jobs j 
//         ON FIND_IN_SET(j.id, REPLACE(REPLACE(aj.job_ids, '[', ''), ']', ''))

//       LEFT JOIN projects p 
//         ON p.id = aj.project_id

//       LEFT JOIN users u 
//         ON u.id = aj.employee_id

//       WHERE aj.production_id = ?
//       ORDER BY aj.created_at DESC
//       `,
//       [productionId]
//     );

//     res.json({
//       success: true,
//       count: rows.length,
//       data: rows
//     });

//   } catch (error) {
//     console.error(error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to fetch production job history"
//     });
//   }
// };

export const getJobHistoryByProductionId = async (req, res) => {
  try {
    const { productionId } = req.params;

    const [rows] = await pool.query(`
      SELECT
        j.job_no                                AS jobNo,
        p.project_name                         AS projectName,

        b.name                                 AS brand,
        sb.name                                AS subBrand,
        f.name                                 AS flavour,
        pt.name                                AS packType,
        j.pack_size                            AS packSize,
        pc.name                                AS packCode,

        j.priority                             AS priority,
        p.expected_completion_date             AS dueDate,

        COALESCE(
          CONCAT(emp.first_name, ' ', emp.last_name),
          CONCAT(prod.first_name, ' ', prod.last_name),
          'Not Assigned'
        )                                      AS assignedTo,

        aj.time_budget                         AS totalTime,
        aj.production_status                   AS status
        
      FROM assign_jobs aj

      LEFT JOIN jobs j
        ON FIND_IN_SET(j.id, REPLACE(REPLACE(aj.job_ids,'[',''),']',''))

      LEFT JOIN projects p       ON p.id = aj.project_id
      LEFT JOIN brand_names b    ON b.id = j.brand_id
      LEFT JOIN sub_brands sb    ON sb.id = j.sub_brand_id
      LEFT JOIN flavours f       ON f.id = j.flavour_id
      LEFT JOIN pack_types pt    ON pt.id = j.pack_type_id
      LEFT JOIN pack_codes pc    ON pc.id = j.pack_code_id

      -- 🔥 BOTH JOINS
      LEFT JOIN users emp  ON emp.id  = aj.employee_id
      LEFT JOIN users prod ON prod.id = aj.production_id

      WHERE aj.production_id = ?
      ORDER BY p.expected_completion_date ASC
    `, [productionId]);

    res.json({ success: true, data: rows });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch job history" });
  }
};


export const getJobHistoryByEmployeeId = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const [rows] = await pool.query(`
      SELECT
        j.job_no                                AS jobNo,
        p.project_name                         AS projectName,

        b.name                                 AS brand,
        sb.name                                AS subBrand,
        f.name                                 AS flavour,
        pt.name                                AS packType,
        j.pack_size                            AS packSize,
        pc.name                                AS packCode,

        j.priority                             AS priority,
        p.expected_completion_date             AS dueDate,

        CONCAT(pu.first_name, ' ', pu.last_name) AS assignedTo,
        aj.time_budget                         AS totalTime,
        aj.employee_status                     AS status

      FROM assign_jobs aj

      LEFT JOIN jobs j
        ON FIND_IN_SET(j.id, REPLACE(REPLACE(aj.job_ids,'[',''),']',''))

      LEFT JOIN projects p       ON p.id = aj.project_id
      LEFT JOIN brand_names b    ON b.id = j.brand_id
      LEFT JOIN sub_brands sb    ON sb.id = j.sub_brand_id
      LEFT JOIN flavours f       ON f.id = j.flavour_id
      LEFT JOIN pack_types pt    ON pt.id = j.pack_type_id
      LEFT JOIN pack_codes pc    ON pc.id = j.pack_code_id
      LEFT JOIN users pu         ON pu.id = aj.production_id

      WHERE aj.employee_id = ?
      ORDER BY p.expected_completion_date ASC
    `, [employeeId]);

    res.json({ success: true, data: rows });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch employee job history"
    });
  }
};

