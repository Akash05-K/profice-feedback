import * as actionsService from "../services/actions.service.js";
import { resolveUserScope } from "../services/auth.service.js";

export const getList = async (req, res, next) => {
  try {
    const userScope = await resolveUserScope(req.user);
    const result = await actionsService.getActions(req.query, userScope);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const getStats = async (req, res, next) => {
  try {
    const userScope = await resolveUserScope(req.user);
    const data = await actionsService.getActionStats(userScope);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getById = async (req, res, next) => {
  try {
    const userScope = await resolveUserScope(req.user);
    const data = await actionsService.getActionById(req.params.id, userScope);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const create = async (req, res, next) => {
  try {
    const userScope = await resolveUserScope(req.user);
    const data = await actionsService.createAction(req.body, userScope);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const update = async (req, res, next) => {
  try {
    const userScope = await resolveUserScope(req.user);
    const data = await actionsService.updateAction(req.params.id, req.body, userScope);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const remove = async (req, res, next) => {
  try {
    const userScope = await resolveUserScope(req.user);
    const data = await actionsService.deleteAction(req.params.id, userScope);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
