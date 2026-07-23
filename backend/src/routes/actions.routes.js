import { Router } from "express";
import * as actionsController from "../controllers/actions.controller.js";

const router = Router();

router.get("/", actionsController.getList);
router.get("/stats", actionsController.getStats);
router.get("/:id", actionsController.getById);
router.post("/", actionsController.create);
router.put("/:id", actionsController.update);
router.delete("/:id", actionsController.remove);

export default router;
