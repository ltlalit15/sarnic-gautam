import { pool } from "../Config/dbConnect.js";

export const createJob = async (req, res) => {
  try {
    const {
      project_id,
      project_name,
      project_number,
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

    const [result] = await pool.query(
      `INSERT INTO jobs
      (project_id, project_name, project_number,
       brand_id, sub_brand_id, flavour_id,
       pack_type_id, pack_code_id, pack_size,
       priority, ean_barcode)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        project_id,
        project_name || null,
        project_number || null,
        brand_id || null,
        sub_brand_id || null,
        flavour_id || null,
        pack_type_id || null,
        pack_code_id || null,
        pack_size || null,
        priority || "medium",
        ean_barcode || null
      ]
    );

    res.json({
      success: true,
      message: "Job created successfully",
      id: result.insertId
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const getAllJobs = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        j.*,
        b.name AS brand_name,
        sb.name AS sub_brand_name,
        f.name AS flavour_name,
        pt.name AS pack_type_name,
        pc.name AS pack_code_name
      FROM jobs j
      LEFT JOIN brand_names b ON j.brand_id = b.id
      LEFT JOIN sub_brands sb ON j.sub_brand_id = sb.id
      LEFT JOIN flavours f ON j.flavour_id = f.id
      LEFT JOIN pack_types pt ON j.pack_type_id = pt.id
      LEFT JOIN pack_codes pc ON j.pack_code_id = pc.id
      ORDER BY j.id DESC
    `);

    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const getJobById = async (req, res) => {
  try {
    const { id } = req.params;

    const [[job]] = await pool.query(`
      SELECT
        j.*,
        b.name AS brand_name,
        sb.name AS sub_brand_name,
        f.name AS flavour_name,
        pt.name AS pack_type_name,
        pc.name AS pack_code_name
      FROM jobs j
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


export const getJobsByProjectId = async (req, res) => {
  try {
    const { projectId } = req.params;

    const [rows] = await pool.query(`
      SELECT
        j.*,
        b.name AS brand_name,
        sb.name AS sub_brand_name,
        f.name AS flavour_name,
        pt.name AS pack_type_name,
        pc.name AS pack_code_name
      FROM jobs j
      LEFT JOIN brand_names b ON j.brand_id = b.id
      LEFT JOIN sub_brands sb ON j.sub_brand_id = sb.id
      LEFT JOIN flavours f ON j.flavour_id = f.id
      LEFT JOIN pack_types pt ON j.pack_type_id = pt.id
      LEFT JOIN pack_codes pc ON j.pack_code_id = pc.id
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
      ean_barcode
    } = req.body;

    await pool.query(
      `UPDATE jobs SET
        brand_id=?,
        sub_brand_id=?,
        flavour_id=?,
        pack_type_id=?,
        pack_code_id=?,
        pack_size=?,
        priority=?,
        ean_barcode=?
      WHERE id=?`,
      [
        brand_id,
        sub_brand_id,
        flavour_id,
        pack_type_id,
        pack_code_id,
        pack_size,
        priority,
        ean_barcode,
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

    await pool.query("DELETE FROM jobs WHERE id=?", [id]);

    res.json({ success: true, message: "Job deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
