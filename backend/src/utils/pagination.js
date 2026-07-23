export const getPagination = (pageParam, limitParam, defaultLimit = 20) => {
  const page = Math.max(1, parseInt(pageParam, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(limitParam, 10) || defaultLimit));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

export const formatPaginatedResponse = (items, total, page, limit) => {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    data: items,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};
