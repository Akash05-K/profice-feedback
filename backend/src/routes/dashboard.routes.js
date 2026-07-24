import { Router } from "express";
import * as dashboardController from "../controllers/dashboard.controller.js";
import { authenticate, requireCapability } from "../middleware/auth.js";
import { CAPABILITIES } from "../config/permissions.js";

const router = Router();

router.use(authenticate);
router.use(requireCapability(CAPABILITIES.VIEW_DASHBOARD, CAPABILITIES.USE_AI));

router.get("/stats", dashboardController.getStats);
router.get("/trends", dashboardController.getTrends);
router.get("/sentiment", dashboardController.getSentiment);
router.get("/topics", dashboardController.getTopics);
router.get("/recent", dashboardController.getRecent);

export default router;
