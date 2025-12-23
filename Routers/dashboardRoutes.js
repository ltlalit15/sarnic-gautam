import express from "express";
import { getProductionDashboard } from "../Controllers/dashboard.js";
import e from "express";
// import getProductionDashboard from "../Controllers/dashboard.js"
const router = express.Router();
router.get("/dashboards/production/:id",getProductionDashboard)
export default router;