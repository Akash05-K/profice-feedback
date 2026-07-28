import prisma from "../config/db.js";
import { getPagination, formatPaginatedResponse } from "../utils/pagination.js";

// Column sorting sent by the shared DataTable as "<column>-<asc|desc>".
const buildNotificationOrderBy = (sortBy) => {
  const [field, direction] = String(sortBy || "").split("-");
  const dir = direction === "asc" ? "asc" : "desc";

  switch (field) {
    case "message":
      return { message: dir };
    case "type":
      return { type: dir };
    case "read":
      return { isRead: dir };
    case "time":
      return { createdAt: dir };
    default:
      return { createdAt: "desc" };
  }
};

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const relativeTime = (date) => {
  const elapsed = Date.now() - date.getTime();
  if (elapsed < MINUTE) return "Just now";
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}m ago`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}h ago`;
  if (elapsed < 7 * DAY) return `${Math.floor(elapsed / DAY)}d ago`;
  return date.toISOString().slice(0, 10);
};

/**
 * Every notification belongs to exactly one user. Each query is keyed on the
 * caller's own id — previously they were unfiltered, so any signed-in user
 * could read, mark and delete everyone else's notifications.
 */
const ownedBy = (userId) => ({ userId: Number(userId) });

export const getNotifications = async (queryParams, userId) => {
  const { type, filterTab, read, message, startDate, endDate, sortBy, page, limit } = queryParams;
  const where = ownedBy(userId);

  if (filterTab === "unread") {
    where.isRead = false;
  } else if (filterTab === "email") {
    where.type = "email";
  } else if (filterTab === "in-app") {
    where.type = "in_app";
  } else if (filterTab === "alert") {
    where.type = "alert";
  } else if (type && type !== "all") {
    where.type = type === "in-app" ? "in_app" : type;
  }

  if (read === "read" || read === "unread") {
    where.isRead = read === "read";
  }

  if (message && message.trim()) {
    where.message = { contains: message.trim() };
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(`${endDate}T23:59:59`);
  }

  const { page: currentPage, limit: pageSize, skip } = getPagination(page, limit, 4);

  const [logs, total] = await prisma.$transaction([
    prisma.notification.findMany({
      where,
      orderBy: buildNotificationOrderBy(sortBy),
      skip,
      take: pageSize,
    }),
    prisma.notification.count({ where }),
  ]);

  const formattedLogs = logs.map((l) => ({
    id: `NTF-${l.id}`,
    type: l.type === "in_app" ? "in-app" : l.type,
    message: l.message,
    time: relativeTime(l.createdAt),
    createdAt: l.createdAt.toISOString(),
    icon: l.type === "email" ? "bi-envelope-paper-fill" : l.type === "alert" ? "bi-exclamation-triangle-fill" : "bi-chat-left-text-fill",
    tone: l.type === "email" ? "amber" : l.type === "alert" ? "red" : "blue",
    read: l.isRead,
    recipient: l.recipientLabel || "All Users",
  }));

  return formatPaginatedResponse(formattedLogs, total, currentPage, pageSize);
};

export const getNotificationsSummary = async (userId) => {
  const scope = ownedBy(userId);

  const [total, unread, alerts, inAppCount, emailCount] = await Promise.all([
    prisma.notification.count({ where: scope }),
    prisma.notification.count({ where: { ...scope, isRead: false } }),
    prisma.notification.count({ where: { ...scope, type: "alert" } }),
    prisma.notification.count({ where: { ...scope, type: "in_app" } }),
    prisma.notification.count({ where: { ...scope, type: "email" } }),
  ]);

  return {
    total,
    unread,
    alerts,
    inAppCount,
    emailCount,
    alertCount: alerts,
  };
};

/** Look up a notification the caller owns, or 404. */
const findOwnNotification = async (id, userId) => {
  const rawId = parseInt(String(id).replace("NTF-", ""), 10);
  if (isNaN(rawId)) {
    const error = new Error("Invalid notification id.");
    error.statusCode = 400;
    throw error;
  }

  const notif = await prisma.notification.findFirst({
    where: { id: rawId, ...ownedBy(userId) },
  });

  if (!notif) {
    const error = new Error("Notification not found.");
    error.statusCode = 404;
    throw error;
  }

  return notif;
};

export const toggleNotificationRead = async (id, userId) => {
  const notif = await findOwnNotification(id, userId);

  const updated = await prisma.notification.update({
    where: { id: notif.id },
    data: { isRead: !notif.isRead },
  });

  return { id: `NTF-${updated.id}`, read: updated.isRead };
};

export const markAllNotificationsAsRead = async (userId) => {
  await prisma.notification.updateMany({
    where: ownedBy(userId),
    data: { isRead: true },
  });
  return { success: true };
};

export const deleteNotification = async (id, userId) => {
  const notif = await findOwnNotification(id, userId);
  await prisma.notification.delete({ where: { id: notif.id } });
  return { id: `NTF-${notif.id}`, deleted: true };
};

export const createNotification = async (data, userId) => {
  const { recipient, channel, message } = data;

  const formattedType = channel === "in-app" ? "in_app" : channel || "in_app";

  const newNotif = await prisma.notification.create({
    data: {
      userId: Number(userId),
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

const DEFAULT_PREFERENCES = {
  emailEnabled: true,
  inAppEnabled: true,
  remindersEnabled: true,
  summaryWeeklyEnabled: true,
};

export const getNotificationPreferences = async (userId) => {
  const prefs = await prisma.notificationPreference.findUnique({
    where: { userId: Number(userId) },
  });

  if (!prefs) {
    return { ...DEFAULT_PREFERENCES };
  }

  return {
    emailEnabled: prefs.emailEnabled,
    inAppEnabled: prefs.inAppEnabled,
    remindersEnabled: prefs.remindersEnabled,
    summaryWeeklyEnabled: prefs.weeklySummaryEnabled,
  };
};

export const updateNotificationPreferences = async (data, userId) => {
  const updated = await prisma.notificationPreference.upsert({
    where: { userId: Number(userId) },
    update: {
      emailEnabled: data.emailEnabled,
      inAppEnabled: data.inAppEnabled,
      remindersEnabled: data.remindersEnabled,
      weeklySummaryEnabled: data.summaryWeeklyEnabled,
    },
    create: {
      userId: Number(userId),
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
