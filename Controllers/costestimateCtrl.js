import { pool } from "../Config/dbConnect.js";

/* ======================================
   AMOUNT PARSER
====================================== */
export const parseAmountByCurrency = (amount, currency) => {
  if (!amount) return 0;

  let cleaned = amount.toString().trim();

  switch (currency) {
    case "INR":
    case "USD":
    case "GBP":
    case "AED":
    case "SAR":
    case "JPY":
      cleaned = cleaned.replace(/,/g, "");
      break;

    case "EUR":
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
      break;

    default:
      cleaned = cleaned.replace(/[,.]/g, "");
  }

  const value = Number(cleaned);

  if (isNaN(value)) {
    throw new Error("Invalid amount format for currency: " + currency);
  }

  return value;
};

/* ======================================
   STATUS LOGIC (COMMON)
====================================== */
const calculateInvoiceFlags = (ce_po_status, ce_invoice_status) => {
  let to_be_invoiced = false;
  let invoice = false;
  let invoiced = false;

  const poStatus = ce_po_status || "pending";
  const invoiceStatus = ce_invoice_status || "pending";

  if (poStatus === "pending" && invoiceStatus === "pending") {
    to_be_invoiced = true;
  }

  if (poStatus === "received" && invoiceStatus === "pending") {
    invoice = true;
  }

  if (poStatus === "received" && invoiceStatus === "received") {
    invoiced = true;
  }

  return { to_be_invoiced, invoice, invoiced };
};

/* ======================================
   CREATE ESTIMATE
====================================== */
export const createEstimate = async (req, res) => {
  try {
    const {
      client_id,
      project_id,
      estimate_date,
      valid_until,
      currency,
      ce_status,
      ce_po_status,
      ce_invoice_status,
      vat_rate,
      notes,
      line_items
    } = req.body;

    if (!client_id || !estimate_date || !currency) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    if (!Array.isArray(line_items) || line_items.length === 0) {
      return res.status(400).json({ message: "Line items required" });
    }

    const statusFlags = calculateInvoiceFlags(
      ce_po_status,
      ce_invoice_status
    );

    const [[row]] = await pool.query(
      "SELECT MAX(estimate_no) AS maxNo FROM estimates"
    );
    const estimateNo = (row.maxNo || 6607) + 1;

    let subtotal = 0;
    const parsedItems = line_items.map(item => {
      const rate = parseAmountByCurrency(item.rate, currency);
      const qty = Number(item.quantity);
      const amount = rate * qty;
      subtotal += amount;

      return { description: item.description, quantity: qty, rate, amount };
    });

    const vatAmount = (subtotal * (vat_rate || 0)) / 100;
    const totalAmount = subtotal + vatAmount;

    const [result] = await pool.query(
      `INSERT INTO estimates (
        estimate_no, client_id, project_id,
        estimate_date, valid_until, currency,
        ce_status, ce_po_status, ce_invoice_status,
        to_be_invoiced, invoice, invoiced,
        line_items, vat_rate, subtotal,
        vat_amount, total_amount, notes
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        estimateNo,
        client_id,
        project_id || null,
        estimate_date,
        valid_until || null,
        currency,
        ce_status || "Draft",
        ce_po_status || "pending",
        ce_invoice_status || "pending",
        statusFlags.to_be_invoiced,
        statusFlags.invoice,
        statusFlags.invoiced,
        JSON.stringify(parsedItems),
        vat_rate || 0,
        subtotal,
        vatAmount,
        totalAmount,
        notes || null
      ]
    );

    res.status(201).json({
      success: true,
      message: "Estimate created successfully",
      id: result.insertId,
      estimate_no: estimateNo,
      status_flags: statusFlags
    });

  } catch (error) {
    console.error("Create Estimate Error:", error);
    res.status(500).json({ message: error.message });
  }
};

/* ======================================
   GET ESTIMATES BY PROJECT
====================================== */
export const getEstimatesByProjectId = async (req, res) => {
  try {
    const { projectId } = req.params;

    const [rows] = await pool.query(`
      SELECT 
        e.*,

        /* Project details */
        p.project_name,
        p.project_no,

        /* Client details */
        cs.name AS client_name

      FROM estimates e

      LEFT JOIN projects p 
        ON p.id = e.project_id

      LEFT JOIN clients_suppliers cs 
        ON cs.id = e.client_id 
        AND cs.type = 'client'

      WHERE e.project_id = ?
      ORDER BY e.id DESC
    `, [projectId]);

    const data = rows.map(row => ({
      ...row,
      line_items: row.line_items ? JSON.parse(row.line_items) : []
    }));

    res.json({
      success: true,
      count: data.length,
      data
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


/* ======================================
   GET ALL ESTIMATES
====================================== */
export const getAllEstimates = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        e.*,

        /* Project details */
        p.project_name,
        p.project_no,

        /* Client details */
        cs.name AS client_name

      FROM estimates e

      /* Join projects */
      LEFT JOIN projects p 
        ON p.id = e.project_id

      /* Join clients_suppliers (ONLY CLIENT TYPE) */
      LEFT JOIN clients_suppliers cs 
        ON cs.id = e.client_id 
        AND cs.type = 'client'

      ORDER BY e.id DESC
    `);

    const data = rows.map(row => ({
      ...row,
      line_items: row.line_items ? JSON.parse(row.line_items) : []
    }));

    res.json({
      success: true,
      count: data.length,
      data
    });

  } catch (error) {
    console.error("Get All Estimates Error:", error);
    res.status(500).json({ message: error.message });
  }
};


/* ======================================
   GET ESTIMATE BY ID
====================================== */
export const getEstimateById = async (req, res) => {
  try {
    const { id } = req.params;

    const [[estimate]] = await pool.query(`
      SELECT 
        e.*,

        /* Project details */
        p.project_name,
        p.project_no,

        /* Client details */
        cs.name AS client_name

      FROM estimates e

      LEFT JOIN projects p 
        ON p.id = e.project_id

      LEFT JOIN clients_suppliers cs 
        ON cs.id = e.client_id 
        AND cs.type = 'client'

      WHERE e.id = ?
    `, [id]);

    if (!estimate) {
      return res.status(404).json({ message: "Estimate not found" });
    }

    estimate.line_items = JSON.parse(estimate.line_items);

    res.json({
      success: true,
      data: estimate
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


/* ======================================
   UPDATE ESTIMATE
====================================== */
export const updateEstimate = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      estimate_date,
      valid_until,
      currency,
      ce_status,
      ce_po_status,
      ce_invoice_status,
      vat_rate,
      notes,
      line_items
    } = req.body;

    let subtotal = 0;
    const parsedItems = line_items.map(item => {
      const rate = parseAmountByCurrency(item.rate, currency);
      const qty = Number(item.quantity);
      const amount = rate * qty;
      subtotal += amount;

      return { description: item.description, quantity: qty, rate, amount };
    });

    const vatAmount = (subtotal * (vat_rate || 0)) / 100;
    const totalAmount = subtotal + vatAmount;

    const statusFlags = calculateInvoiceFlags(
      ce_po_status,
      ce_invoice_status
    );

    await pool.query(
      `UPDATE estimates SET
        estimate_date = ?, valid_until = ?, currency = ?, ce_status = ?,
        ce_po_status = ?, ce_invoice_status = ?,
        to_be_invoiced = ?, invoice = ?, invoiced = ?,
        line_items = ?, vat_rate = ?, subtotal = ?,
        vat_amount = ?, total_amount = ?, notes = ?
      WHERE id = ?`,
      [
        estimate_date,
        valid_until,
        currency,
        ce_status,
        ce_po_status,
        ce_invoice_status,
        statusFlags.to_be_invoiced,
        statusFlags.invoice,
        statusFlags.invoiced,
        JSON.stringify(parsedItems),
        vat_rate,
        subtotal,
        vatAmount,
        totalAmount,
        notes,
        id
      ]
    );

    res.json({
      success: true,
      message: "Estimate updated successfully",
      status_flags: statusFlags
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ======================================
   DELETE ESTIMATE
====================================== */
export const deleteEstimate = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM estimates WHERE id = ?", [id]);
    res.json({ success: true, message: "Estimate deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
