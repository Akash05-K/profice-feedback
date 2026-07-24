import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";

// Routes
import authRoutes from "./routes/auth.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import feedbackRoutes from "./routes/feedback.routes.js";
import trainersRoutes from "./routes/trainers.routes.js";
import coursesRoutes from "./routes/courses.routes.js";
import batchesRoutes from "./routes/batches.routes.js";
import reportsRoutes from "./routes/reports.routes.js";
import actionsRoutes from "./routes/actions.routes.js";
import notificationsRoutes from "./routes/notifications.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import aiRoutes from "./routes/ai.routes.js";

// Jobs
import { startOverdueCheckerJob } from "./jobs/overdueChecker.js";

const app = express();

// Middlewares
app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get("/api/v1/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date().toISOString(), service: "Profice SQL API" });
});

// API Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/feedback", feedbackRoutes);
app.use("/api/v1/trainers", trainersRoutes);
app.use("/api/v1/courses", coursesRoutes);
app.use("/api/v1/batches", batchesRoutes);
app.use("/api/v1/reports", reportsRoutes);
app.use("/api/v1/actions", actionsRoutes);
app.use("/api/v1/notifications", notificationsRoutes);
app.use("/api/v1/upload", uploadRoutes);
app.use("/api/v1/ai", aiRoutes);

// Global Error Handler
app.use(errorHandler);

// Start Cron Jobs
startOverdueCheckerJob();

// Start Server
const PORT = env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Profice SQL Backend Server running on http://localhost:${PORT}`);
  console.log(`📊 Health Check: http://localhost:${PORT}/api/v1/health`);
});
