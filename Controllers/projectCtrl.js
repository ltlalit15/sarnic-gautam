import { pool } from "../Config/dbConnect.js";

export const createProject = async (req, res) => {
  try {
    const {
      project_name,
      client_name,
      start_date,
      expected_completion_date,
      priority,
      status,
      project_description,
      project_requirements,
      budget,
      currency
    } = req.body;

    if (!project_name) {
      return res.status(400).json({ message: "Project name is required" });
    }

    const [response] = await pool.query(
      `INSERT INTO projects
      (project_name, client_name, start_date, expected_completion_date,
       priority, status, project_description, project_requirements,
       budget, currency)
      VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [
        project_name,
        client_name || null,
        start_date || null,
        expected_completion_date || null,
        priority || "medium",
        status || "active project",
        project_description || null,
        project_requirements
          ? JSON.stringify(project_requirements)
          : null,
        budget || null,
        currency || null
      ]
    );

    res.status(200).json({
      success: true,
      message: "Project created successfully",
      id: response.insertId
    });
  } catch (error) {
    console.error("Create Project Error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const getAllProjects = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM projects ORDER BY id DESC"
    );

    const data = rows.map(p => ({
      ...p,
      project_requirements: p.project_requirements
        ? JSON.parse(p.project_requirements)
        : []
    }));

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



export const getProjectById = async (req, res) => {
  try {
    const { id } = req.params;

    const [[project]] = await pool.query(
      "SELECT * FROM projects WHERE id=?",
      [id]
    );

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    project.project_requirements = project.project_requirements
      ? JSON.parse(project.project_requirements)
      : [];

    res.json({ success: true, data: project });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



export const updateProject = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      project_name,
      client_name,
      start_date,
      expected_completion_date,
      priority,
      status,
      project_description,
      project_requirements,
      budget,
      currency
    } = req.body;

    await pool.query(
      `UPDATE projects SET
        project_name=?,
        client_name=?,
        start_date=?,
        expected_completion_date=?,
        priority=?,
        status=?,
        project_description=?,
        project_requirements=?,
        budget=?,
        currency=?
      WHERE id=?`,
      [
        project_name,
        client_name,
        start_date,
        expected_completion_date,
        priority,
        status,
        project_description,
        project_requirements
          ? JSON.stringify(project_requirements)
          : null,
        budget,
        currency,
        id
      ]
    );

    res.json({
      success: true,
      message: "Project updated successfully"
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



export const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      "DELETE FROM projects WHERE id=?",
      [id]
    );

    res.json({
      success: true,
      message: "Project deleted successfully"
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const getProjectsByStatus = async (req, res) => {
  try {
    const { status } = req.params;

    const [rows] = await pool.query(
      "SELECT * FROM projects WHERE status=? ORDER BY id DESC",
      [status]
    );

    const data = rows.map(p => ({
      ...p,
      project_requirements: p.project_requirements
        ? JSON.parse(p.project_requirements)
        : []
    }));

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
