import * as notificationsService from "../services/notifications.service.js";

// Notifications are private to the signed-in user. Every handler passes
// req.user.id down so the service can key its queries on the owner.

export const getList = async (req, res, next) => {
  try {
    const result = await notificationsService.getNotifications(req.query, req.user.id);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const getSummary = async (req, res, next) => {
  try {
    const data = await notificationsService.getNotificationsSummary(req.user.id);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const toggleRead = async (req, res, next) => {
  try {
    const data = await notificationsService.toggleNotificationRead(req.params.id, req.user.id);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const markAllRead = async (req, res, next) => {
  try {
    const data = await notificationsService.markAllNotificationsAsRead(req.user.id);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const remove = async (req, res, next) => {
  try {
    const data = await notificationsService.deleteNotification(req.params.id, req.user.id);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const create = async (req, res, next) => {
  try {
    const data = await notificationsService.createNotification(req.body, req.user.id);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getSettings = async (req, res, next) => {
  try {
    const data = await notificationsService.getNotificationPreferences(req.user.id);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const updateSettings = async (req, res, next) => {
  try {
    const data = await notificationsService.updateNotificationPreferences(req.body, req.user.id);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
