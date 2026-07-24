import { Router } from "express";
import * as aiController from "../controllers/ai.controller.js";
import { authenticate, requireCapability } from "../middleware/auth.js";
import { CAPABILITIES } from "../config/permissions.js";

const router = Router();

// Executive dashboard summary — anyone who can view the dashboard or use AI.
router.get(
  "/dashboard-summary",
  authenticate,
  requireCapability(CAPABILITIES.VIEW_DASHBOARD, CAPABILITIES.USE_AI),
  aiController.getDashboardSummary
);

// AI Recommendation Engine — AI users (management, ace_lead, super_admin).
router.get(
  "/recommendations",
  authenticate,
  requireCapability(CAPABILITIES.USE_AI),
  aiController.getRecommendations
);


export default router;
