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

        -- Assigned PRODUCTION user details
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

      -- 🔥 map job → assign_jobs using JSON job_ids
      LEFT JOIN assign_jobs aj
        ON JSON_CONTAINS(aj.job_ids, JSON_ARRAY(j.id))

      -- 🔥 production user
      LEFT JOIN users pu
        ON pu.id = aj.production_id

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

export const deleteJob = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query("DELETE FROM jobs WHERE id = ?", [id]);

    res.json({ success: true, message: "Job deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
