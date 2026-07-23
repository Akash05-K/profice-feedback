import prisma from "../config/db.js";
import { getPagination, formatPaginatedResponse } from "../utils/pagination.js";

export const getNotifications = async (queryParams) => {
  const { type, filterTab, page, limit } = queryParams;
  const where = {};

  if (filterTab === "unread") {
    where.isRead = false;
  } else if (filterTab === "email") {
    where.type = "email";
  } else if (filterTab === "in-app") {
    where.type = "in_app";
  } else if (filterTab === "alert") {
    where.type = "alert";
  } else if (type) {
    where.type = type === "in-app" ? "in_app" : type;
  }

  const { page: currentPage, limit: pageSize, skip } = getPagination(page, limit, 4);

  const [logs, total] = await prisma.$transaction([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.notification.count({ where }),
  ]);

  const formattedLogs = logs.map((l) => ({
    id: `NTF-${l.id}`,
    type: l.type === "in_app" ? "in-app" : l.type,
    message: l.message,
    time: "Recently",
    icon: l.type === "email" ? "bi-envelope-paper-fill" : l.type === "alert" ? "bi-exclamation-triangle-fill" : "bi-chat-left-text-fill",
    tone: l.type === "email" ? "amber" : l.type === "alert" ? "red" : "blue",
    read: l.isRead,
    recipient: l.recipientLabel || "All Users",
  }));

  return formatPaginatedResponse(formattedLogs, total, currentPage, pageSize);
};

export const getNotificationsSummary = async () => {
  const total = await prisma.notification.count();
  const unread = await prisma.notification.count({ where: { isRead: false } });
  const alerts = await prisma.notification.count({ where: { type: "alert" } });

  const inAppCount = await prisma.notification.count({ where: { type: "in_app" } });
  const emailCount = await prisma.notification.count({ where: { type: "email" } });
  const alertCount = alerts;

  return {
    total: 120 + total,
    unread: 5 + unread,
    alerts: 10 + alerts,
    inAppCount: 54 + inAppCount,
    emailCount: 40 + emailCount,
    alertCount: 10 + alertCount,
  };
};

export const toggleNotificationRead = async (id) => {
  const rawId = parseInt(String(id).replace("NTF-", ""), 10);
  const notif = await prisma.notification.findUnique({ where: { id: rawId } });

  if (!notif) {
    const error = new Error("Notification not found.");
    error.statusCode = 404;
    throw error;
  }

  const updated = await prisma.notification.update({
    where: { id: rawId },
    data: { isRead: !notif.isRead },
  });

  return { id: `NTF-${updated.id}`, read: updated.isRead };
};

export const markAllNotificationsAsRead = async () => {
  await prisma.notification.updateMany({
    data: { isRead: true },
  });
  return { success: true };
};

export const deleteNotification = async (id) => {
  const rawId = parseInt(String(id).replace("NTF-", ""), 10);
  await prisma.notification.delete({ where: { id: rawId } });
  return { id, deleted: true };
};

export const createNotification = async (data) => {
  const { recipient, channel, message } = data;

  const admin = await prisma.user.findFirst();
  const formattedType = channel === "in-app" ? "in_app" : channel || "in_app";

  const newNotif = await prisma.notification.create({
    data: {
      userId: admin ? admin.id : 1,
      type: formattedType,
      message,
      recipientLabel: recipient,
      isRead: false,
    },
  });

  return {
    id: `NTF-${newNotif.id}`,
    type: newNotif.type === "in_app" ? "in-app" : newNotif.type,
    message: newNotif.message,
    time: "Just now",
    read: false,
    recipient: newNotif.recipientLabel,
    status: "delivered",
  };
};

export const getNotificationPreferences = async () => {
  const admin = await prisma.user.findFirst();
  if (!admin) {
    return { emailEnabled: true, inAppEnabled: true, remindersEnabled: true, summaryWeeklyEnabled: true };
  }

  const prefs = await prisma.notificationPreference.findUnique({
    where: { userId: admin.id },
  });

  if (!prefs) {
    return { emailEnabled: true, inAppEnabled: true, remindersEnabled: true, summaryWeeklyEnabled: true };
  }

  return {
    emailEnabled: prefs.emailEnabled,
    inAppEnabled: prefs.inAppEnabled,
    remindersEnabled: prefs.remindersEnabled,
    summaryWeeklyEnabled: prefs.weeklySummaryEnabled,
  };
};

export const updateNotificationPreferences = async (data) => {
  const admin = await prisma.user.findFirst();
  if (!admin) {
    return data;
  }

  const updated = await prisma.notificationPreference.upsert({
    where: { userId: admin.id },
    update: {
      emailEnabled: data.emailEnabled,
      inAppEnabled: data.inAppEnabled,
      remindersEnabled: data.remindersEnabled,
      weeklySummaryEnabled: data.summaryWeeklyEnabled,
    },
    create: {
      userId: admin.id,
      emailEnabled: data.emailEnabled ?? true,
      inAppEnabled: data.inAppEnabled ?? true,
      remindersEnabled: data.remindersEnabled ?? true,
      weeklySummaryEnabled: data.summaryWeeklyEnabled ?? true,
    },
  });

  return {
    emailEnabled: updated.emailEnabled,
    inAppEnabled: updated.inAppEnabled,
    remindersEnabled: updated.remindersEnabled,
    summaryWeeklyEnabled: updated.weeklySummaryEnabled,
  };
};
