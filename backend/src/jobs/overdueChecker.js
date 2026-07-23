import cron from "node-cron";
import prisma from "../config/db.js";

export const startOverdueCheckerJob = () => {
  // Runs every day at 00:05 AM
  cron.schedule("5 0 * * *", async () => {
    console.log("⏰ Running Daily Overdue Actions Job...");
    try {
      const now = new Date();
      const updated = await prisma.actionItem.updateMany({
        where: {
          dueDate: { lt: now },
          status: { in: ["open", "in_progress"] },
        },
        data: {
          status: "overdue",
        },
      });
      console.log(`✅ Marked ${updated.count} actions as overdue.`);
    } catch (err) {
      console.error("❌ Overdue actions cron error:", err);
    }
  });

  console.log("⏰ Overdue action item background cron job scheduled.");
};
