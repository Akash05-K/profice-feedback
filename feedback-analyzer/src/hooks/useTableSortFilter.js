import { useMemo } from "react";

/**
 * Column filters are stored in one object keyed by column key. Shapes per type:
 *   text   -> "some string"        (case-insensitive "contains")
 *   select -> "exact value"        ("" means "any")
 *   number -> { min: "", max: "" }
 *   date   -> { from: "", to: "" }
 */
export const isFilterActive = (value) => {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (typeof value === "object") return Object.values(value).some((v) => String(v ?? "").trim() !== "");
  return true;
};

export const countActiveFilters = (filters = {}) =>
  Object.values(filters).filter(isFilterActive).length;

export const getCellValue = (column, row) => {
  if (typeof column.accessor === "function") return column.accessor(row);
  return row[column.key];
};

const toText = (value) => (value === undefined || value === null ? "" : String(value));

const toTime = (value) => {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
};

const matchesFilter = (column, row, value) => {
  const cell = getCellValue(column, row);
  const type = column.filter?.type || "text";

  if (type === "select") {
    return toText(cell) === toText(value);
  }

  if (type === "number") {
    const num = Number(cell);
    if (Number.isNaN(num)) return false;
    const { min, max } = value;
    if (String(min ?? "").trim() !== "" && num < Number(min)) return false;
    if (String(max ?? "").trim() !== "" && num > Number(max)) return false;
    return true;
  }

  if (type === "date") {
    const time = toTime(cell);
    if (time === null) return false;
    const { from, to } = value;
    if (from && time < new Date(`${from}T00:00:00`).getTime()) return false;
    if (to && time > new Date(`${to}T23:59:59`).getTime()) return false;
    return true;
  }

  return toText(cell).toLowerCase().includes(toText(value).trim().toLowerCase());
};

const compare = (column, a, b) => {
  const left = getCellValue(column, a);
  const right = getCellValue(column, b);

  if (column.sortType === "number") return (Number(left) || 0) - (Number(right) || 0);
  if (column.sortType === "date") return (toTime(left) ?? 0) - (toTime(right) ?? 0);

  const leftNum = Number(left);
  const rightNum = Number(right);
  if (left !== "" && right !== "" && !Number.isNaN(leftNum) && !Number.isNaN(rightNum)) {
    return leftNum - rightNum;
  }

  return toText(left).localeCompare(toText(right), undefined, { sensitivity: "base" });
};

/** Unique values of a column across the given rows, for auto-built select options. */
export const deriveOptions = (column, rows) => {
  const seen = new Map();
  rows.forEach((row) => {
    const raw = getCellValue(column, row);
    const text = toText(raw).trim();
    if (text === "") return;
    if (!seen.has(text)) seen.set(text, column.filter?.formatOption ? column.filter.formatOption(raw) : text);
  });
  return [...seen.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], undefined, { sensitivity: "base" }))
    .map(([value, label]) => ({ value, label }));
};

/**
 * Client-side sorting, column filtering and global search over a full row set.
 * Server-backed tables bypass this and pass their rows through untouched.
 */
export function useTableSortFilter({
  rows,
  columns,
  filters,
  sort,
  searchTerm,
  applyFilters = true,
  applySort = true,
  applySearch = true,
}) {
  return useMemo(() => {
    const activeFilters = applyFilters
      ? Object.entries(filters || {}).filter(([, value]) => isFilterActive(value))
      : [];
    const term = applySearch ? (searchTerm || "").trim().toLowerCase() : "";

    let result = rows;

    if (activeFilters.length > 0) {
      result = result.filter((row) =>
        activeFilters.every(([key, value]) => {
          const column = columns.find((col) => col.key === key);
          return column ? matchesFilter(column, row, value) : true;
        })
      );
    }

    if (term) {
      result = result.filter((row) =>
        columns.some((column) => toText(getCellValue(column, row)).toLowerCase().includes(term))
      );
    }

    if (applySort && sort?.key) {
      const column = columns.find((col) => col.key === sort.key);
      if (column) {
        const direction = sort.dir === "desc" ? -1 : 1;
        result = [...result].sort((a, b) => compare(column, a, b) * direction);
      }
    }

    return result;
  }, [rows, columns, filters, sort, searchTerm, applyFilters, applySort, applySearch]);
}
