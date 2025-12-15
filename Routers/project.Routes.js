import express from "express";
import {
  createProject,
  getAllProjects,
  getProjectById,
  updateProject,
  deleteProject,
  getProjectsByStatus
} from "../Controllers/projectCtrl.js";

const router = express.Router();

router.post("/projects", createProject);
router.get("/projects", getAllProjects);
router.get("/projects/:id", getProjectById);
router.put("/projects/:id", updateProject);
router.delete("/projects/:id", deleteProject);

// Status tabs
router.get("/projects/status/:status", getProjectsByStatus);

export default router;
