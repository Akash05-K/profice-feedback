import * as batchesService from "../services/batches.service.js";
import { resolveUserScope } from "../services/auth.service.js";

export const getList = async (req, res, next) => {
  try {
    const userScope = await resolveUserScope(req.user);
    const data = await batchesService.getBatchesList(userScope);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getStats = async (req, res, next) => {
  try {
    const userScope = await resolveUserScope(req.user);
    const data = await batchesService.getBatchStats(userScope);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
