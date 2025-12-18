import { pool } from "../Config/dbConnect.js";

/* =========================================
   🔹 Helper: Currency-wise Budget Parser
   DB me hamesha plain number store hoga
========================================= */
const parseBudget = (budget, currency) => {
  if (!budget) return null;

  let cleaned = budget.toString().trim();

  switch (currency) {
    case "INR":
    case "USD":
    case "GBP":
    case "AED":
    case "SAR":
      cleaned = cleaned.replace(/,/g, "");
      break;

    case "EUR":
      cleaned = cleaned.replace(/\./g, "");
      break;

    default:
      cleaned = cleaned.replace(/[,.]/g, "");
  }

  const amount = Number(cleaned);

  if (isNaN(amount)) {
    throw new Error("Invalid budget format");
  }

  return amount;
};

/* =========================================
   ✅ CREATE PROJECT
========================================= */
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

    // 1️⃣ Generate next project_no
    const [[row]] = await pool.query(
      "SELECT MAX(project_no) AS maxProjectNo FROM projects"
    );
    const nextProjectNo = (row.maxProjectNo || 2093) + 1;

    // 2️⃣ Parse budget
    const cleanBudget = parseBudget(budget, currency);

    // 3️⃣ Insert
    const [response] = await pool.query(
      `INSERT INTO projects (
        project_name, project_no, client_name,
        start_date, expected_completion_date,
        priority, status,
        project_description, project_requirements,
        budget, currency
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        project_name,
        nextProjectNo,
        client_name || null,
        start_date || null,
        expected_completion_date || null,
        priority || "medium",
        status || "active",
        project_description || null,
        project_requirements ? JSON.stringify(project_requirements) : null,
        cleanBudget,
        currency || null
      ]
    );

    res.status(201).json({
      success: true,
      message: "Project created successfully",
      id: response.insertId,
      project_no: nextProjectNo
    });

  } catch (error) {
    console.error("Create Project Error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

/* =========================================
   ✅ GET ALL PROJECTS
========================================= */
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

/* =========================================
   ✅ GET PROJECT BY ID
========================================= */
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

/* =========================================
   ✅ UPDATE PROJECT
========================================= */
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

    // 🔹 Parse budget again on update
    const cleanBudget = parseBudget(budget, currency);

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
        project_requirements ? JSON.stringify(project_requirements) : null,
        cleanBudget,
        currency,
        id
      ]
    );

    res.json({
      success: true,
      message: "Project updated successfully"
    });
  } catch (error) {
    console.error("Update Project Error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

/* =========================================
   ✅ DELETE PROJECT
========================================= */
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

/* =========================================
   ✅ GET PROJECTS BY STATUS
========================================= */
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
