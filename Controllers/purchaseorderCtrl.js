import { pool } from "../Config/dbConnect.js";
import fs from "fs";
import cloudinary from "../cloudinary/cloudinary.js";

/* ======================================
   CREATE PURCHASE ORDER
====================================== */
export const createPurchaseOrder = async (req, res) => {
  try {
    const {
      po_number,
      project_id,
      client_id,
      po_amount,
      po_date
    } = req.body;

    if (!po_number || !project_id || !client_id || !po_amount || !po_date) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    let po_document = null;

    if (req.files?.po_document) {
      const result = await cloudinary.uploader.upload(
        req.files.po_document.tempFilePath,
        { folder: "purchase_orders" }
      );

      po_document = result.secure_url;
      fs.unlinkSync(req.files.po_document.tempFilePath);
    }

    const [result] = await pool.query(
      `INSERT INTO purchase_orders
      (po_number, project_id, client_id, po_amount, po_date, po_document)
      VALUES (?,?,?,?,?,?)`,
      [
        po_number,
        project_id,
        client_id,
        po_amount,
        po_date,
        po_document
      ]
    );

    res.status(201).json({
      success: true,
      message: "Purchase Order created successfully",
      id: result.insertId
    });

  } catch (error) {
    console.error("Create PO Error:", error);
    res.status(500).json({ message: error.message });
  }
};

/* ======================================
   GET ALL PURCHASE ORDERS
====================================== */
export const getAllPurchaseOrders = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        po.*,
        p.project_name,
        p.project_no,
        cs.name AS client_name
      FROM purchase_orders po
      LEFT JOIN projects p ON p.id = po.project_id
      LEFT JOIN clients_suppliers cs ON cs.id = po.client_id AND cs.type = 'client'
      ORDER BY po.id DESC
    `);

    res.json({
      success: true,
      count: rows.length,
      data: rows
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ======================================
   GET PURCHASE ORDER BY ID
====================================== */
export const getPurchaseOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const [[po]] = await pool.query(`
      SELECT 
        po.*,
        p.project_name,
        p.project_no,
        cs.name AS client_name
      FROM purchase_orders po
      LEFT JOIN projects p ON p.id = po.project_id
      LEFT JOIN clients_suppliers cs ON cs.id = po.client_id AND cs.type = 'client'
      WHERE po.id = ?
    `, [id]);

    if (!po) {
      return res.status(404).json({ message: "Purchase Order not found" });
    }

    res.json({ success: true, data: po });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ======================================
   UPDATE PURCHASE ORDER
====================================== */
export const updatePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      po_number,
      project_id,
      client_id,
      po_amount,
      po_date
    } = req.body;

    let po_document = null;

    if (req.files?.po_document) {
      const result = await cloudinary.uploader.upload(
        req.files.po_document.tempFilePath,
        { folder: "purchase_orders" }
      );
      po_document = result.secure_url;
      fs.unlinkSync(req.files.po_document.tempFilePath);
    }

    await pool.query(
      `UPDATE purchase_orders SET
        po_number = ?,
        project_id = ?,
        client_id = ?,
        po_amount = ?,
        po_date = ?,
        po_document = COALESCE(?, po_document)
      WHERE id = ?`,
      [
        po_number,
        project_id,
        client_id,
        po_amount,
        po_date,
        po_document,
        id
      ]
    );

    res.json({
      success: true,
      message: "Purchase Order updated successfully"
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ======================================
   DELETE PURCHASE ORDER
====================================== */
export const deletePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      "DELETE FROM purchase_orders WHERE id = ?",
      [id]
    );

    res.json({
      success: true,
      message: "Purchase Order deleted successfully"
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const getPurchaseOrdersByProjectId = async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!projectId) {
      return res.status(400).json({ message: "projectId is required" });
    }

    const [rows] = await pool.query(`
      SELECT 
        po.*,

        /* Project details */
        p.project_name,
        p.project_no,

        /* Client details */
        cs.name AS client_name

      FROM purchase_orders po

      LEFT JOIN projects p 
        ON p.id = po.project_id

      LEFT JOIN clients_suppliers cs 
        ON cs.id = po.client_id
        AND cs.type = 'client'

      WHERE po.project_id = ?
      ORDER BY po.id DESC
    `, [projectId]);

    res.json({
      success: true,
      count: rows.length,
      data: rows
    });

  } catch (error) {
    console.error("Get PO By Project Error:", error);
    res.status(500).json({ message: error.message });
  }
};

