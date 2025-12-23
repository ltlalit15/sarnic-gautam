import express from "express";
import { getEmployeeDashboard, getProductionDashboard } from "../Controllers/dashboard.js";
import e from "express";
// import getProductionDashboard from "../Controllers/dashboard.js"
const router = express.Router();
router.get("/dashboards/production/:productionId",getProductionDashboard)
router.get("/dashboards/employee/:employeeId",getEmployeeDashboard)
export default router;