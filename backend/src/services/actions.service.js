import prisma from "../config/db.js";
import { getPagination, formatPaginatedResponse } from "../utils/pagination.js";
import { generateActionCode } from "../utils/codeGenerator.js";

const buildActionOrderBy = (sortBy) => {
  const [field, direction] = String(sortBy || "").split("-");
  const dir = direction === "asc" ? "asc" : "desc";

  switch (field) {
    case "title":
      return { title: dir };
    case "assignedTo":
      return { assignedTo: { name: dir } };
    case "priority":
      return { priority: dir };
    case "dueDate":
      return { dueDate: dir };
    case "status":
      return { status: dir };
    default:
      return { createdAt: "desc" };
  }
};

const applyActionScope = (where, userScope) => {
  if (!userScope || userScope.isUnrestricted) return where;

  if (userScope.isProgramManager) {
    where.assignedTo = {
      ...where.assignedTo,
      OR: [
        { program: userScope.program },
        { id: { in: userScope.trainerIds } },
      ],
    };
  } else if (userScope.isTrainer) {
    const scopeTrainerId = userScope.trainerId;
    where.assignedToTrainerId = scopeTrainerId ? (Array.isArray(scopeTrainerId) ? { in: scopeTrainerId } : scopeTrainerId) : -1;
  }
  return where;
};

export const getActions = async (queryParams, userScope = null) => {
  const { priority, status, search, title, assignedTo, dueFrom, dueTo, sortBy, page, limit } = queryParams;

  let where = {};
  where = applyActionScope(where, userScope);

  if (priority && priority !== "all") {
    where.priority = priority;
  }

  if (status && status !== "all") {
    where.status = status === "in-progress" ? "in_progress" : status;
  }

  if (title && title.trim()) {
    where.title = { contains: title.trim() };
  }

  if (assignedTo && assignedTo.trim()) {
    where.assignedTo = { ...where.assignedTo, name: { contains: assignedTo.trim() } };
  }

  if (dueFrom || dueTo) {
    where.dueDate = {};
    if (dueFrom) where.dueDate.gte = new Date(dueFrom);
    if (dueTo) where.dueDate.lte = new Date(`${dueTo}T23:59:59`);
  }

  if (search && search.trim()) {
    const term = search.trim();
    where.OR = [
      { title: { contains: term } },
      { assignedTo: { name: { contains: term } } },
    ];
  }

  const { page: currentPage, limit: pageSize, skip } = getPagination(page, limit, 20);

  const [actions, total] = await prisma.$transaction([
    prisma.actionItem.findMany({
      where,
      include: { assignedTo: true },
      orderBy: buildActionOrderBy(sortBy),
      skip,
      take: pageSize,
    }),
    prisma.actionItem.count({ where }),
  ]);

  const formattedRows = actions.map((a) => ({
    id: a.actionCode,
    title: a.title,
    assignedTo: a.assignedTo ? a.assignedTo.name : "Unassigned",
    priority: a.priority,
    dueDate: a.dueDate.toISOString().slice(0, 10),
    status: a.status === "in_progress" ? "in-progress" : a.status,
    progress: a.progressPercent,
    notes: a.notes || "",
    completedDate: a.completedAt ? a.completedAt.toISOString().slice(0, 10) : undefined,
  }));

  return formatPaginatedResponse(formattedRows, total, currentPage, pageSize);
};

export const getActionStats = async (userScope = null) => {
  const base = applyActionScope({}, userScope);

  const total = await prisma.actionItem.count({ where: base });
  const inProgress = await prisma.actionItem.count({ where: { ...base, status: "in_progress" } });
  const completed = await prisma.actionItem.count({ where: { ...base, status: "completed" } });
  const overdue = await prisma.actionItem.count({ where: { ...base, status: "overdue" } });
  const open = await prisma.actionItem.count({ where: { ...base, status: "open" } });

  return {
    totalActions: total,
    inProgressCount: inProgress,
    completedCount: completed,
    overdueCount: overdue,
    openCount: open,
  };
};

export const getActionById = async (id, userScope = null) => {
  let where = {
    OR: [{ id: isNaN(Number(id)) ? -1 : Number(id) }, { actionCode: id }],
  };
  where = applyActionScope(where, userScope);

  const action = await prisma.actionItem.findFirst({
    where,
    include: { assignedTo: true },
  });

  if (!action) {
    const error = new Error("Action item not found or access denied.");
    error.statusCode = 404;
    throw error;
  }

  return {
    id: action.actionCode,
    title: action.title,
    assignedTo: action.assignedTo ? action.assignedTo.name : "Unassigned",
    priority: action.priority,
    dueDate: action.dueDate.toISOString().slice(0, 10),
    status: action.status === "in_progress" ? "in-progress" : action.status,
    progress: action.progressPercent,
    notes: action.notes || "",
    completedDate: action.completedAt ? action.completedAt.toISOString().slice(0, 10) : undefined,
  };
};

export const createAction = async (data, userScope = null) => {
  const { title, assignedTo, priority, dueDate, status, progress, notes } = data;

  let trainerWhere = {};
  if (userScope?.isProgramManager) {
    trainerWhere.program = userScope.program;
  }

  let trainer = await prisma.trainer.findFirst({
    where: {
      name: assignedTo,
      ...trainerWhere,
    },
  });

  if (!trainer) {
    trainer = await prisma.trainer.findFirst({ where: trainerWhere });
  }

  if (!trainer) {
    const error = new Error("No trainer found in your assigned program to assign this action item to.");
    error.statusCode = 400;
    throw error;
  }

  let maxCodeNum = 112;
  const lastAction = await prisma.actionItem.findFirst({
    orderBy: { id: "desc" },
    select: { id: true, actionCode: true },
  });
  if (lastAction) {
    const match = lastAction.actionCode && lastAction.actionCode.match(/\d+/);
    if (match) maxCodeNum = parseInt(match[0], 10);
  }
  const actionCode = generateActionCode(maxCodeNum + 1);

  const dbStatus = status === "in-progress" ? "in_progress" : status || "open";

  const newAction = await prisma.actionItem.create({
    data: {
      actionCode,
      title,
      assignedToTrainerId: trainer.id,
      priority: priority || "medium",
      dueDate: dueDate ? new Date(dueDate) : new Date(),
      status: dbStatus,
      progressPercent: progress !== undefined ? parseInt(progress, 10) : 0,
      notes: notes || null,
      completedAt: dbStatus === "completed" ? new Date() : null,
    },
    include: { assignedTo: true },
  });

  return {
    id: newAction.actionCode,
    title: newAction.title,
    assignedTo: newAction.assignedTo ? newAction.assignedTo.name : "Unassigned",
    priority: newAction.priority,
    dueDate: newAction.dueDate.toISOString().slice(0, 10),
    status: newAction.status === "in_progress" ? "in-progress" : newAction.status,
    progress: newAction.progressPercent,
    notes: newAction.notes || "",
  };
};

export const updateAction = async (id, data, userScope = null) => {
  let findWhere = {
    OR: [{ id: isNaN(Number(id)) ? -1 : Number(id) }, { actionCode: id }],
  };
  findWhere = applyActionScope(findWhere, userScope);

  const existing = await prisma.actionItem.findFirst({ where: findWhere });

  if (!existing) {
    const error = new Error("Action item not found or access denied.");
    error.statusCode = 404;
    throw error;
  }

  const { title, assignedTo, priority, dueDate, status, progress, notes } = data;

  const updateData = {};
  if (title !== undefined) updateData.title = title;
  if (priority !== undefined) updateData.priority = priority;
  if (dueDate !== undefined) updateData.dueDate = new Date(dueDate);
  if (progress !== undefined) updateData.progressPercent = parseInt(progress, 10);
  if (notes !== undefined) updateData.notes = notes;

  if (status !== undefined) {
    const dbStatus = status === "in-progress" ? "in_progress" : status;
    updateData.status = dbStatus;
    if (dbStatus === "completed" && existing.status !== "completed") {
      updateData.completedAt = new Date();
    } else if (dbStatus !== "completed") {
      updateData.completedAt = null;
    }
  }

  if (assignedTo !== undefined) {
    let trainerWhere = {};
    if (userScope?.isProgramManager) {
      trainerWhere.program = userScope.program;
    }
    const trainer = await prisma.trainer.findFirst({
      where: { name: assignedTo, ...trainerWhere },
    });
    if (trainer) {
      updateData.assignedToTrainerId = trainer.id;
    }
  }

  const updated = await prisma.actionItem.update({
    where: { id: existing.id },
    data: updateData,
    include: { assignedTo: true },
  });

  return {
    id: updated.actionCode,
    title: updated.title,
    assignedTo: updated.assignedTo ? updated.assignedTo.name : "Unassigned",
    priority: updated.priority,
    dueDate: updated.dueDate.toISOString().slice(0, 10),
    status: updated.status === "in_progress" ? "in-progress" : updated.status,
    progress: updated.progressPercent,
    notes: updated.notes || "",
  };
};

export const deleteAction = async (id, userScope = null) => {
  let findWhere = {
    OR: [{ id: isNaN(Number(id)) ? -1 : Number(id) }, { actionCode: id }],
  };
  findWhere = applyActionScope(findWhere, userScope);

  const existing = await prisma.actionItem.findFirst({ where: findWhere });

  if (!existing) {
    const error = new Error("Action item not found or access denied.");
    error.statusCode = 404;
    throw error;
  }

  await prisma.actionItem.delete({ where: { id: existing.id } });
  return { id: existing.actionCode, deleted: true };
};
