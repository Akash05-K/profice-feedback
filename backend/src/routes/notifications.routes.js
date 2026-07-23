import { Router } from "express";
import * as notificationsController from "../controllers/notifications.controller.js";

const router = Router();

router.get("/", notificationsController.getList);
router.get("/summary", notificationsController.getSummary);
router.patch("/mark-all-read", notificationsController.markAllRead);
router.patch("/:id/read", notificationsController.toggleRead);
router.delete("/:id", notificationsController.remove);
router.post("/", notificationsController.create);
router.get("/settings", notificationsController.getSettings);
router.put("/settings", notificationsController.updateSettings);

export default router;
