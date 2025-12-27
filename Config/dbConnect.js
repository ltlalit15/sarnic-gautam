import { JSONCookie } from "cookie-parser";
import { query } from "express";
import mysql from "mysql2/promise";
export const pool = mysql.createPool({
  host: "metro.proxy.rlwy.net", // ✅ Match CLI host
  port: 35697, // ✅ Match CLI port
  user: "root", // ✅ Match CLI user
  password: "eoEIBtsezDbAjaFVJckjZrfLZuHLVxgG", // ✅ Match CLI password
  database: "railway", // ✅ Match CLI DB name
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,
});

// Check connection
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log("✅ Successfully connected to Railway MySQL database");
    connection.release();
  } catch (error) {
    console.error("❌ Database connection error:", error);
  }
})();

// import { JSONCookie } from "cookie-parser";
// import { query } from "express";
// import mysql from "mysql2/promise";
// export const pool = mysql.createPool({
//   host: "localhost", // ✅ Match CLI host
//   port: 3306, // ✅ Match CLI port
//   user: "root", // ✅ Match CLI user
//   password: "", // ✅ Match CLI password
//   database: "sarnic_new", // ✅ Match CLI DB name
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0,
//   connectTimeout: 10000,
// });

// // Check connection
// (async () => {
//   try {
//     const connection = await pool.getConnection();
//     console.log("✅ Successfully connected to Railway MySQL database");
//     connection.release();
//   } catch (error) {
//     console.error("❌ Database connection error:", error);
//   }
// })();
