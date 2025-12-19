import { pool } from "../Config/dbConnect.js";
import fs from "fs";
import cloudinary from "../cloudinary/cloudinary.js";

export const createCompany = async (req, res) => {
  try {
    const {
      company_name,
      address,
      industry,
      trn,
      email,
      phone,
      bank_account_name,
      bank_name,
      iban,
      swift_code,
      tax_categories
    } = req.body;

    let company_logo = null;
    let company_stamp = null;

    // Upload company logo
    if (req.files?.company_logo) {
      const result = await cloudinary.uploader.upload(
        req.files.company_logo.tempFilePath,
        { folder: "company/logo" }
      );
      company_logo = result.secure_url;
      fs.unlinkSync(req.files.company_logo.tempFilePath);
    }

    // Upload company stamp
    if (req.files?.company_stamp) {
      const result = await cloudinary.uploader.upload(
        req.files.company_stamp.tempFilePath,
        { folder: "company/stamp" }
      );
      company_stamp = result.secure_url;
      fs.unlinkSync(req.files.company_stamp.tempFilePath);
    }

    const [response] = await pool.query(
      `INSERT INTO company_information
      (company_logo, company_stamp, company_name, address, industry, trn,
       email, phone, bank_account_name, bank_name, iban, swift_code, tax_categories)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        company_logo,
        company_stamp,
        company_name || null,
        address || null,
        industry || null,
        trn || null,
        email || null,
        phone || null,
        bank_account_name || null,
        bank_name || null,
        iban || null,
        swift_code || null,
        tax_categories ? JSON.stringify(tax_categories) : null
      ]
    );

    res.status(200).json({
      success: true,
      message: "Company information created successfully",
      id: response.insertId
    });
  } catch (error) {
    console.error("Create Company Error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const getCompanyById = async (req, res) => {
  try {
    const { id } = req.params;

    const [[company]] = await pool.query(
      "SELECT * FROM company_information WHERE id=?",
      [id]
    );

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    company.tax_categories = company.tax_categories
      ? JSON.parse(company.tax_categories)
      : [];

    res.json({ success: true, data: company });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteCompany = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      "DELETE FROM company_information WHERE id=?",
      [id]
    );

    res.json({ success: true, message: "Company deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      company_name,
      address,
      industry,
      trn,
      email,
      phone,
      bank_account_name,
      bank_name,
      iban,
      swift_code,
      tax_categories
    } = req.body;

    let company_logo = null;
    let company_stamp = null;

    if (req.files?.company_logo) {
      const result = await cloudinary.uploader.upload(
        req.files.company_logo.tempFilePath,
        { folder: "company/logo" }
      );
      company_logo = result.secure_url;
      fs.unlinkSync(req.files.company_logo.tempFilePath);
    }

    if (req.files?.company_stamp) {
      const result = await cloudinary.uploader.upload(
        req.files.company_stamp.tempFilePath,
        { folder: "company/stamp" }
      );
      company_stamp = result.secure_url;
      fs.unlinkSync(req.files.company_stamp.tempFilePath);
    }

    await pool.query(
      `UPDATE company_information SET
        company_logo = COALESCE(?, company_logo),
        company_stamp = COALESCE(?, company_stamp),
        company_name=?,
        address=?,
        industry=?,
        trn=?,
        email=?,
        phone=?,
        bank_account_name=?,
        bank_name=?,
        iban=?,
        swift_code=?,
        tax_categories=?
      WHERE id=?`,
      [
        company_logo,
        company_stamp,
        company_name,
        address,
        industry,
        trn,
        email,
        phone,
        bank_account_name,
        bank_name,
        iban,
        swift_code,
        tax_categories ? JSON.stringify(tax_categories) : null,
        id
      ]
    );

    res.json({ success: true, message: "Company information updated" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
