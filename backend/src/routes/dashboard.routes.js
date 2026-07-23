import { Router } from "express";
import * as dashboardController from "../controllers/dashboard.controller.js";

const router = Router();

router.get("/stats", dashboardController.getStats);
router.get("/trends", dashboardController.getTrends);
router.get("/sentiment", dashboardController.getSentiment);
router.get("/topics", dashboardController.getTopics);
router.get("/recent", dashboardController.getRecent);

export default router;
