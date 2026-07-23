import * as batchesService from "../services/batches.service.js";

export const getList = async (req, res, next) => {
  try {
    const data = await batchesService.getBatchesList();
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getStats = async (req, res, next) => {
  try {
    const data = await batchesService.getBatchStats();
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
