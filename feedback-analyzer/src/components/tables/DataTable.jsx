import { useMemo, useState } from "react";
import TableFilterPanel from "./TableFilterPanel";
import {
  deriveOptions,
  getCellValue,
  isFilterActive,
  useTableSortFilter,
} from "../../hooks/useTableSortFilter";

const SORT_ICON = {
  asc: "bi-sort-up",
  desc: "bi-sort-down",
};

/** asc -> desc -> unsorted */
const nextSort = (current, key) => {
  if (current?.key !== key) return { key, dir: "asc" };
  if (current.dir === "asc") return { key, dir: "desc" };
  return null;
};

const chipLabel = (column, value) => {
  const type = column.filter?.type || "text";
  if (type === "select") {
    const option = (column.filter.options || []).find((opt) => String(opt.value) === String(value));
    return option ? option.label : value;
  }
  if (type === "number") {
    const { min, max } = value;
    if (min && max) return `${min}–${max}`;
    return min ? `≥ ${min}` : `≤ ${max}`;
  }
  if (type === "date") {
    const { from, to } = value;
    if (from && to) return `${from} → ${to}`;
    return from ? `from ${from}` : `until ${to}`;
  }
  return `"${value}"`;
};

/**
 * Shared table shell: sortable column headers, one Filter button covering every
 * column, active-filter chips and toolbar slots.
 *
 * Modes:
 *   uncontrolled — omit `sort`/`filters`; rows are sorted and filtered in place.
 *   controlled   — pass `sort` + `onSortChange` and/or `filters` + `onFiltersChange`
 *                  and the caller (usually a server query) owns the data.
 */
function DataTable({
  columns,
  rows = [],
  title,
  count,
  icon,
  isLoading = false,
  emptyTitle = "No records found",
  emptyMessage = "Try adjusting the filters above.",
  getRowKey = (row, index) => row.id ?? index,
  onRowClick,
  rowClassName,
  rowStyle,
  toolbarActions,
  search,
  footer,
  selection,
  minWidth,
  className = "",
  sort: controlledSort,
  onSortChange,
  filters: controlledFilters,
  onFiltersChange,
}) {
  const [localSort, setLocalSort] = useState(null);
  const [localFilters, setLocalFilters] = useState({});
  const [localSearch, setLocalSearch] = useState("");

  const isSortControlled = typeof onSortChange === "function";
  const isFilterControlled = typeof onFiltersChange === "function";
  const isSearchControlled = typeof search?.onChange === "function";
  const searchValue = isSearchControlled ? search.value : localSearch;

  const sort = isSortControlled ? controlledSort ?? null : localSort;
  const filters = (isFilterControlled ? controlledFilters : localFilters) || {};

  // Auto-fill select options from the data when the caller did not supply them.
  const resolvedColumns = useMemo(
    () =>
      columns.map((column) => {
        if (!column.filter || column.filter.type !== "select" || column.filter.options) return column;
        return { ...column, filter: { ...column.filter, options: deriveOptions(column, rows) } };
      }),
    [columns, rows]
  );

  // Whatever the caller controls is already applied server-side; the rest runs here.
  const finalRows = useTableSortFilter({
    rows,
    columns: resolvedColumns,
    filters,
    sort,
    searchTerm: searchValue,
    applyFilters: !isFilterControlled,
    applySort: !isSortControlled,
    applySearch: Boolean(search) && !isSearchControlled,
  });

  const handleSort = (column) => {
    if (column.sortable === false) return;
    const next = nextSort(sort, column.key);
    if (isSortControlled) onSortChange(next);
    else setLocalSort(next);
  };

  const handleFiltersChange = (next) => {
    if (isFilterControlled) onFiltersChange(next);
    else setLocalFilters(next);
  };

  const handleRemoveFilter = (key) => {
    const next = { ...filters };
    delete next[key];
    handleFiltersChange(next);
  };

  const activeChips = Object.entries(filters)
    .filter(([, value]) => isFilterActive(value))
    .map(([key, value]) => ({ key, value, column: resolvedColumns.find((col) => col.key === key) }))
    .filter((chip) => chip.column);

  const allSelected =
    selection && finalRows.length > 0 && finalRows.every((row) => selection.selectedIds.includes(row.id));

  const totalColumns = resolvedColumns.length + (selection ? 1 : 0);
  const hasToolbar = title || toolbarActions || search || resolvedColumns.some((col) => col.filter);

  return (
    <div className={`data-table-shell ${className}`}>
      {hasToolbar ? (
        <div className="table-toolbar">
          {title ? (
            <div className="table-toolbar__heading">
              {icon ? <i className={`bi ${icon} table-toolbar__icon`} /> : null}
              <h2 className="table-toolbar__title">{title}</h2>
              {count !== undefined && count !== null ? (
                <span className="table-toolbar__count">{count}</span>
              ) : null}
            </div>
          ) : null}

          <div className="table-toolbar__actions">
            {search ? (
              <div className="table-toolbar__search">
                <i className="bi bi-search" />
                <input
                  type="search"
                  value={searchValue}
                  onChange={(event) =>
                    isSearchControlled ? search.onChange(event.target.value) : setLocalSearch(event.target.value)
                  }
                  placeholder={search.placeholder || "Search…"}
                  aria-label={search.placeholder || "Search table"}
                />
              </div>
            ) : null}

            <TableFilterPanel
              columns={resolvedColumns}
              filters={filters}
              onChange={handleFiltersChange}
              onReset={() => handleFiltersChange({})}
            />

            {toolbarActions ? <div className="table-toolbar__extra">{toolbarActions}</div> : null}
          </div>
        </div>
      ) : null}

      {activeChips.length > 0 ? (
        <div className="table-chips">
          {activeChips.map((chip) => (
            <span className="table-chip" key={chip.key}>
              <span className="table-chip__label">{chip.column.label}:</span>
              <span className="table-chip__value">{chipLabel(chip.column, chip.value)}</span>
              <button
                type="button"
                onClick={() => handleRemoveFilter(chip.key)}
                aria-label={`Remove ${chip.column.label} filter`}
              >
                <i className="bi bi-x" />
              </button>
            </span>
          ))}
          <button type="button" className="table-chips__clear" onClick={() => handleFiltersChange({})}>
            Clear all
          </button>
        </div>
      ) : null}

      {isLoading ? (
        <div className="data-table-shell__loading">
          <div className="spinner-border text-primary me-2" role="status" />
          <span>Loading…</span>
        </div>
      ) : (
        <div className="table-panel">
          <table className="data-table" style={minWidth ? { minWidth } : undefined}>
            <thead>
              <tr>
                {selection ? (
                  <th className="data-table__checkbox-col">
                    <input
                      type="checkbox"
                      checked={Boolean(allSelected)}
                      onChange={(event) => selection.onToggleAll(event.target.checked)}
                      aria-label="Select all rows"
                    />
                  </th>
                ) : null}

                {resolvedColumns.map((column) => {
                  const isSorted = sort?.key === column.key;
                  const sortable = column.sortable !== false;
                  return (
                    <th
                      key={column.key}
                      className={`${column.headerClassName || ""} ${sortable ? "data-table__th--sortable" : ""}`}
                      style={column.width ? { width: column.width } : undefined}
                      aria-sort={isSorted ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}
                    >
                      {sortable ? (
                        <button type="button" className="data-table__sort" onClick={() => handleSort(column)}>
                          <span>{column.label}</span>
                          <i
                            className={`bi ${isSorted ? SORT_ICON[sort.dir] : "bi-chevron-expand"} data-table__sort-icon ${
                              isSorted ? "data-table__sort-icon--active" : ""
                            }`}
                          />
                        </button>
                      ) : (
                        column.label
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {finalRows.length === 0 ? (
                <tr>
                  <td colSpan={totalColumns} className="data-table__empty text-center py-5">
                    <h5 className="text-muted mb-1" style={{ fontSize: "1rem" }}>{emptyTitle}</h5>
                    <p className="text-secondary mb-0" style={{ fontSize: "0.85rem" }}>{emptyMessage}</p>
                  </td>
                </tr>
              ) : (
                finalRows.map((row, index) => (
                  <tr
                    key={getRowKey(row, index)}
                    className={rowClassName ? rowClassName(row) : undefined}
                    style={{
                      ...(rowStyle ? rowStyle(row) : null),
                      ...(onRowClick ? { cursor: "pointer" } : null),
                    }}
                    onClick={onRowClick ? (event) => onRowClick(row, event) : undefined}
                  >
                    {selection ? (
                      <td>
                        <input
                          type="checkbox"
                          checked={selection.selectedIds.includes(row.id)}
                          onChange={() => selection.onToggle(row.id)}
                          onClick={(event) => event.stopPropagation()}
                          aria-label={`Select row ${getRowKey(row, index)}`}
                        />
                      </td>
                    ) : null}

                    {resolvedColumns.map((column) => (
                      <td key={column.key} className={column.className} style={column.cellStyle}>
                        {column.render ? column.render(row, index) : getCellValue(column, row)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {footer}
    </div>
  );
}

export default DataTable;
