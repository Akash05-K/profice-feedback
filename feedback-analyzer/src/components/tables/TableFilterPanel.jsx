import { useEffect, useRef, useState } from "react";
import { countActiveFilters, isFilterActive } from "../../hooks/useTableSortFilter";

const EMPTY_BY_TYPE = {
  text: "",
  select: "",
  number: { min: "", max: "" },
  date: { from: "", to: "" },
};

const emptyValue = (type) => {
  const blank = EMPTY_BY_TYPE[type] ?? "";
  return typeof blank === "object" ? { ...blank } : blank;
};

function FilterField({ column, value, onChange }) {
  const { type = "text", options = [], placeholder, anyLabel = "Any" } = column.filter;

  if (type === "select") {
    return (
      <div className="filter-panel__control">
        <select
          className="filter-panel__input"
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">{anyLabel}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (type === "number") {
    const current = value ?? emptyValue("number");
    return (
      <div className="filter-panel__control filter-panel__control--split">
        <input
          type="number"
          className="filter-panel__input"
          placeholder="Min"
          value={current.min ?? ""}
          onChange={(event) => onChange({ ...current, min: event.target.value })}
        />
        <span className="filter-panel__range-sep">to</span>
        <input
          type="number"
          className="filter-panel__input"
          placeholder="Max"
          value={current.max ?? ""}
          onChange={(event) => onChange({ ...current, max: event.target.value })}
        />
      </div>
    );
  }

  if (type === "date") {
    const current = value ?? emptyValue("date");
    return (
      <div className="filter-panel__control filter-panel__control--split">
        <input
          type="date"
          className="filter-panel__input"
          value={current.from ?? ""}
          onChange={(event) => onChange({ ...current, from: event.target.value })}
        />
        <span className="filter-panel__range-sep">to</span>
        <input
          type="date"
          className="filter-panel__input"
          value={current.to ?? ""}
          onChange={(event) => onChange({ ...current, to: event.target.value })}
        />
      </div>
    );
  }

  return (
    <div className="filter-panel__control">
      <input
        type="text"
        className="filter-panel__input"
        placeholder={placeholder || `Contains…`}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

/**
 * One button that opens a panel with a filter control for every filterable column.
 * Text inputs are debounced so server-backed tables do not refetch on each keystroke.
 */
function TableFilterPanel({ columns, filters, onChange, onReset }) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState(filters);
  const wrapperRef = useRef(null);
  const debounceRef = useRef(null);

  const filterable = columns.filter((column) => column.filter);
  const activeCount = countActiveFilters(filters);

  useEffect(() => {
    setDraft(filters);
  }, [filters]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setIsOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const commit = (next, debounced) => {
    setDraft(next);
    clearTimeout(debounceRef.current);
    if (debounced) {
      debounceRef.current = setTimeout(() => onChange(next), 350);
    } else {
      onChange(next);
    }
  };

  const handleFieldChange = (column, value) => {
    const next = { ...draft, [column.key]: value };
    if (!isFilterActive(value)) delete next[column.key];
    commit(next, (column.filter.type || "text") === "text");
  };

  const handleReset = () => {
    clearTimeout(debounceRef.current);
    setDraft({});
    onReset();
  };

  if (filterable.length === 0) return null;

  return (
    <div className="filter-panel" ref={wrapperRef}>
      <button
        type="button"
        className={`filter-panel__trigger ${activeCount > 0 ? "filter-panel__trigger--active" : ""}`}
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <i className="bi bi-funnel" />
        <span>Filter</span>
        {activeCount > 0 ? <span className="filter-panel__badge">{activeCount}</span> : null}
        <i className={`bi bi-chevron-${isOpen ? "up" : "down"} filter-panel__caret`} />
      </button>

      {isOpen ? (
        <div className="filter-panel__popover" role="dialog" aria-label="Filter table">
          <div className="filter-panel__head">
            <span className="filter-panel__head-title">Filter by column</span>
            <button
              type="button"
              className="filter-panel__reset"
              onClick={handleReset}
              disabled={activeCount === 0}
            >
              Reset all
            </button>
          </div>

          <div className="filter-panel__body">
            {filterable.map((column) => (
              <div className="filter-panel__field" key={column.key}>
                <label className="filter-panel__label">{column.filter.label || column.label}</label>
                <FilterField
                  column={column}
                  value={draft[column.key]}
                  onChange={(value) => handleFieldChange(column, value)}
                />
              </div>
            ))}
          </div>

          <div className="filter-panel__foot">
            <button type="button" className="filter-panel__done" onClick={() => setIsOpen(false)}>
              Done
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default TableFilterPanel;
