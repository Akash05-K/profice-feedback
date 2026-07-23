import { Router } from "express";
import * as feedbackController from "../controllers/feedback.controller.js";

const router = Router();

router.get("/", feedbackController.getList);
router.get("/stats", feedbackController.getStats);
router.get("/filter-options", feedbackController.getFilterOptions);
router.get("/:id", feedbackController.getById);
router.patch("/:id/toggle-status", feedbackController.toggleStatus);
router.patch("/:id/status", feedbackController.toggleStatus);
router.delete("/:id", feedbackController.remove);
router.post("/bulk-action", feedbackController.bulkAction);
router.patch("/bulk", feedbackController.bulkAction);
router.get("/export", feedbackController.exportRecords);
router.post("/export", feedbackController.exportRecords);

export default router;
