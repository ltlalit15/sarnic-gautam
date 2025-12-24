import express from "express";
import {
  createJob,
  getAllJobs,
  getJobById,
  getJobsByProjectId,
  updateJob,
  deleteJob,
  getJobHistoryByEmployeeId,
  getJobHistoryByProductionId
} from "../Controllers/JobCtrl.js";

const router = express.Router();

router.post("/jobs", createJob);
router.get("/jobs", getAllJobs);
router.get("/jobs/:id", getJobById);
router.get("/jobs/project/:projectId", getJobsByProjectId);
router.get("/jobs/jobhistoryemployee/:employeeId",getJobHistoryByEmployeeId);
router.get("/jobs/jobHistoryproduction/:productionId",getJobHistoryByProductionId)
router.put("/jobs/:id", updateJob);
router.delete("/jobs/:id", deleteJob);

export default router;
