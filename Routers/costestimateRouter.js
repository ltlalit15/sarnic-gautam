import express from "express";
import {
  createEstimate,
  getAllEstimates,
  getEstimateById,
  updateEstimate,
  deleteEstimate,
  getEstimatesByProjectId
} from "../Controllers/costestimateCtrl.js";
const router = express.Router();
router.post("/costestimates", createEstimate);
router.get("/costestimates", getAllEstimates);
router.get("/costestimates/:id", getEstimateById);
router.put("/costestimates/:id", updateEstimate);
router.delete("/costestimates/:id", deleteEstimate);
router.get("/costestimates/project/:projectId", getEstimatesByProjectId);

export default router;
