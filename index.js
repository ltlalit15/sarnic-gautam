import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import morgan from "morgan";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import routes from "./app.js";
import cookieParser from "cookie-parser";
import fileUpload from "express-fileupload";
import "./cron/dailyEmailSender.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3001;

// -----------------------------------------------------
// ICS PROXY (UNCHANGED)
// -----------------------------------------------------
app.get("/api/ics-proxy", async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ error: "URL required" });
    }
    const response = await fetch(url);
    const text = await response.text();
    res.setHeader("Content-Type", "text/calendar");
    res.send(text);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// -----------------------------------------------------
// MIDDLEWARES
// -----------------------------------------------------

// app.use(cors({ origin: "*", credentials: true }));

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

app.use(morgan("dev"));
app.use(cookieParser());

// ✅ REQUIRED FOR req.body (JSON)
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

// ✅ REQUIRED FOR req.files (Cloudinary)
app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "./tmp",
    createParentPath: true,
  })
);

// -----------------------------------------------------
// ROUTES
// -----------------------------------------------------
app.use(routes);

// -----------------------------------------------------
// SERVER
// -----------------------------------------------------
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
