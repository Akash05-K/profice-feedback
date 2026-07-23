import prisma from "../config/db.js";
import { getPagination, formatPaginatedResponse } from "../utils/pagination.js";
import { generateActionCode } from "../utils/codeGenerator.js";

export const getActions = async (queryParams) => {
  const { priority, status, search, page, limit } = queryParams;

  const where = {};

  if (priority && priority !== "all") {
    where.priority = priority;
  }

  if (status && status !== "all") {
    where.status = status;
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
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.actionItem.count({ where }),
  ]);

  const formattedRows = actions.map((a) => ({
    id: a.actionCode,
    title: a.title,
    assignedTo: a.assignedTo.name,
    priority: a.priority,
    dueDate: a.dueDate.toISOString().slice(0, 10),
    status: a.status === "in_progress" ? "in-progress" : a.status,
    progress: a.progressPercent,
    notes: a.notes || "",
    completedDate: a.completedAt ? a.completedAt.toISOString().slice(0, 10) : undefined,
  }));

  return formatPaginatedResponse(formattedRows, total, currentPage, pageSize);
};

export const getActionStats = async () => {
  const total = await prisma.actionItem.count();
  const inProgress = await prisma.actionItem.count({ where: { status: "in_progress" } });
  const completed = await prisma.actionItem.count({ where: { status: "completed" } });
  const overdue = await prisma.actionItem.count({ where: { status: "overdue" } });
  const open = await prisma.actionItem.count({ where: { status: "open" } });

  return {
    totalActions: total,
    inProgressCount: inProgress,
    completedCount: completed,
    overdueCount: overdue,
    openCount: open,
  };
};

export const getActionById = async (id) => {
  const action = await prisma.actionItem.findFirst({
    where: {
      OR: [{ id: isNaN(Number(id)) ? -1 : Number(id) }, { actionCode: id }],
    },
    include: { assignedTo: true },
  });

  if (!action) {
    const error = new Error("Action item not found.");
    error.statusCode = 404;
    throw error;
  }

  return {
    id: action.actionCode,
    title: action.title,
    assignedTo: action.assignedTo.name,
    priority: action.priority,
    dueDate: action.dueDate.toISOString().slice(0, 10),
    status: action.status === "in_progress" ? "in-progress" : action.status,
    progress: action.progressPercent,
    notes: action.notes || "",
    completedDate: action.completedAt ? action.completedAt.toISOString().slice(0, 10) : undefined,
  };
};

export const createAction = async (data) => {
  const { title, assignedTo, priority, dueDate, status, progress, notes } = data;

  let trainer = await prisma.trainer.findFirst({
    where: { name: assignedTo },
  });

  if (!trainer) {
    trainer = await prisma.trainer.findFirst();
  }

  const count = await prisma.actionItem.count();
  const actionCode = generateActionCode(count);

  const formattedStatus = status === "in-progress" ? "in_progress" : status || "open";

  const newAction = await prisma.actionItem.create({
    data: {
      actionCode,
      title,
      assignedToTrainerId: trainer.id,
      priority: priority || "medium",
      dueDate: new Date(dueDate || Date.now()),
      status: formattedStatus,
      progressPercent: Number(progress) || 0,
      notes: notes || "",
      completedAt: formattedStatus === "completed" ? new Date() : null,
    },
    include: { assignedTo: true },
  });

  return {
    id: newAction.actionCode,
    title: newAction.title,
    assignedTo: newAction.assignedTo.name,
    priority: newAction.priority,
    dueDate: newAction.dueDate.toISOString().slice(0, 10),
    status: newAction.status === "in_progress" ? "in-progress" : newAction.status,
    progress: newAction.progressPercent,
    notes: newAction.notes,
  };
};

export const updateAction = async (id, data) => {
  const action = await prisma.actionItem.findFirst({
    where: {
      OR: [{ id: isNaN(Number(id)) ? -1 : Number(id) }, { actionCode: id }],
    },
  });

  if (!action) {
    const error = new Error("Action item not found.");
    error.statusCode = 404;
    throw error;
  }

  let trainerId = action.assignedToTrainerId;
  if (data.assignedTo) {
    const trainer = await prisma.trainer.findFirst({ where: { name: data.assignedTo } });
    if (trainer) trainerId = trainer.id;
  }

  const formattedStatus = data.status === "in-progress" ? "in_progress" : data.status;

  const updated = await prisma.actionItem.update({
    where: { id: action.id },
    data: {
      title: data.title !== undefined ? data.title : action.title,
      assignedToTrainerId: trainerId,
      priority: data.priority !== undefined ? data.priority : action.priority,
      dueDate: data.dueDate ? new Date(data.dueDate) : action.dueDate,
      status: formattedStatus !== undefined ? formattedStatus : action.status,
      progressPercent: data.progress !== undefined ? Number(data.progress) : action.progressPercent,
      notes: data.notes !== undefined ? data.notes : action.notes,
      completedAt: formattedStatus === "completed" ? new Date() : action.completedAt,
    },
    include: { assignedTo: true },
  });

  return {
    id: updated.actionCode,
    title: updated.title,
    assignedTo: updated.assignedTo.name,
    priority: updated.priority,
    dueDate: updated.dueDate.toISOString().slice(0, 10),
    status: updated.status === "in_progress" ? "in-progress" : updated.status,
    progress: updated.progressPercent,
    notes: updated.notes,
  };
};

export const deleteAction = async (id) => {
  const action = await prisma.actionItem.findFirst({
    where: {
      OR: [{ id: isNaN(Number(id)) ? -1 : Number(id) }, { actionCode: id }],
    },
  });

  if (!action) {
    const error = new Error("Action item not found.");
    error.statusCode = 404;
    throw error;
  }

  await prisma.actionItem.delete({ where: { id: action.id } });
  return { id: action.actionCode, deleted: true };
};
