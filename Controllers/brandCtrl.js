import { pool } from "../Config/dbConnect.js";

export const createBrand = async (req, res) => {
  const { name } = req.body;
  const [result] = await pool.query(
    "INSERT INTO brand_names (name) VALUES (?)",
    [name]
  );
  res.json({ success: true, id: result.insertId });
};

export const getBrands = async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM brand_names");
  res.json({ success: true, data: rows });
};

export const deleteBrand = async (req, res) => {
  await pool.query("DELETE FROM brand_names WHERE id = ?", [req.params.id]);
  res.json({ success: true, message: "Brand deleted" });
};



/* ----------------------------------
   DELETE MULTIPLE BRANDS
---------------------------------- */
export const deleteMultipleBrands = async (req, res) => {
  try {
    const { ids } = req.body;

    // Validation
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        message: "ids array is required"
      });
    }

    // Create placeholders (?, ?, ?)
    const placeholders = ids.map(() => "?").join(",");

    await pool.query(
      `DELETE FROM brand_names WHERE id IN (${placeholders})`,
      ids
    );

    res.json({
      success: true,
      message: "Selected brands deleted successfully"
    });
  } catch (error) {
    console.error("Bulk Delete Brand Error:", error);
    res.status(500).json({ message: error.message });
  }
};

