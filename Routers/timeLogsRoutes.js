import express from "express";
import { createTimeLogs, getAllTimeLogs, getByIdTimeLogs, removeTimeLogs, updateTimeLogs } from "../Controllers/timeLogsCtrl.js";

const router = express.Router();



router.post("/time-logs", createTimeLogs);
router.get("/time-logs", getAllTimeLogs);
router.get("/time-logs/:id", getByIdTimeLogs);
router.put("/time-logs/:id", updateTimeLogs);
router.delete("/time-logs/:id", removeTimeLogs);

export default router;
