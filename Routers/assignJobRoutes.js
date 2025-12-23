import express from "express";
import {
  createAssignJob,
  productionAssignToEmployee,
  employeeCompleteJob,
  productionCompleteJob,
  getJobsByEmployee,
  getJobsByProduction,
  deleteAssignJob,
  productionReturnJob,
  productionRejectJob
} from "../Controllers/assignJobCtrl.js";

const router = express.Router();

router.post("/assignjobs", createAssignJob);
router.put("/assignjobs/production-assign/:id", productionAssignToEmployee);
router.put("/assignjobs/employee-complete/:id", employeeCompleteJob);
router.put("/assignjobs/production-complete/:id", productionCompleteJob);
router.put("/assignjobs/production-return", productionReturnJob);
router.put("/assignjobs/production-reject", productionRejectJob);

router.get("/assignjobs/employee/:employee_id", getJobsByEmployee);
router.get("/assignjobs/production/:production_id", getJobsByProduction);

router.delete("/:id", deleteAssignJob);

export default router;
