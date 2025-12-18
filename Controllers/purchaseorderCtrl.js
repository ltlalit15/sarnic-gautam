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
      po_date,
      cost_estimation_id
    } = req.body;

    if (
      !po_number ||
      !project_id ||
      !client_id ||
      !po_amount ||
      !po_date ||
      !cost_estimation_id
    ) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    /* ===============================
       UPLOAD PO DOCUMENT
    =============================== */
    let po_document = null;

    if (req.files?.po_document) {
      const result = await cloudinary.uploader.upload(
        req.files.po_document.tempFilePath,
        { folder: "purchase_orders" }
      );

      po_document = result.secure_url;
      fs.unlinkSync(req.files.po_document.tempFilePath);
    }

    /* ===============================
       CREATE PURCHASE ORDER
    =============================== */
    const [result] = await pool.query(
      `INSERT INTO purchase_orders
      (
        po_number,
        project_id,
        client_id,
        po_amount,
        po_date,
        po_document,
        cost_estimation_id
      )
      VALUES (?,?,?,?,?,?,?)`,
      [
        po_number,
        project_id,
        client_id,
        po_amount,
        po_date,
        po_document,
        cost_estimation_id
      ]
    );

    /* ===============================
       UPDATE ESTIMATE PO STATUS
    =============================== */

    // Get current invoice status of estimate
    const [[estimate]] = await pool.query(
      `SELECT ce_invoice_status
       FROM estimates
       WHERE id = ?`,
      [cost_estimation_id]
    );

    if (!estimate) {
      return res.status(404).json({
        message: "Linked estimate not found"
      });
    }

    const ce_invoice_status = estimate.ce_invoice_status || "pending";

    // Recalculate flags
    let to_be_invoiced = false;
    let invoice = false;
    let invoiced = false;

    if (ce_invoice_status === "pending") {
      invoice = true; // PO received + invoice pending
    }

    if (ce_invoice_status === "received") {
      invoiced = true;
    }

    await pool.query(
      `UPDATE estimates SET
        ce_po_status = 'received',
        to_be_invoiced = ?,
        invoice = ?,
        invoiced = ?
      WHERE id = ?`,
      [
        to_be_invoiced,
        invoice,
        invoiced,
        cost_estimation_id
      ]
    );

    /* ===============================
       RESPONSE
    =============================== */
    res.status(201).json({
      success: true,
      message: "Purchase Order created & estimate updated successfully",
      id: result.insertId,
      estimate_status: {
        ce_po_status: "received",
        ce_invoice_status,
        to_be_invoiced,
        invoice,
        invoiced
      }
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
// export const deletePurchaseOrder = async (req, res) => {
//   try {
//     const { id } = req.params;

//     await pool.query(
//       "DELETE FROM purchase_orders WHERE id = ?",
//       [id]
//     );

//     res.json({
//       success: true,
//       message: "Purchase Order deleted successfully"
//     });

//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };


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


export const deletePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;

    /* Get linked estimate id */
    const [[po]] = await pool.query(
      `SELECT cost_estimation_id FROM purchase_orders WHERE id = ?`,
      [id]
    );

    if (!po) {
      return res.status(404).json({ message: "Purchase Order not found" });
    }

    /* Delete PO */
    await pool.query(
      "DELETE FROM purchase_orders WHERE id = ?",
      [id]
    );

    /* Rollback estimate status */
    await pool.query(
      `UPDATE estimates SET
        ce_po_status = 'pending',
        to_be_invoiced = 1,
        invoice = 0,
        invoiced = 0
      WHERE id = ?`,
      [po.cost_estimation_id]
    );

    res.json({
      success: true,
      message: "Purchase Order deleted & estimate status rolled back"
    });

  } catch (error) {
    console.error("Delete PO Error:", error);
    res.status(500).json({ message: error.message });
  }
};


