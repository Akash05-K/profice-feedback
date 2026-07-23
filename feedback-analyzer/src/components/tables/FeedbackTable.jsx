const sentimentBadge = {
  positive: { label: "Positive", tone: "green" },
  neutral: { label: "Neutral", tone: "amber" },
  negative: { label: "Negative", tone: "red" },
};

function StarRating({ rating }) {
  return (
    <span className="star-rating" style={{ whiteSpace: "nowrap" }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <i
          key={star}
          className={`bi ${star <= rating ? "bi-star-fill" : "bi-star"} star-rating__star`}
        />
      ))}
    </span>
  );
}

function FeedbackTable({
  rows,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onToggleArchive,
  onDeleteRow,
  onViewRow,
  sortBy,
  onSort,
}) {
  const allSelected = rows.length > 0 && rows.every((row) => selectedIds.includes(row.id));

  const getSortIcon = (field) => {
    if (field === "date") {
      if (sortBy === "oldest") return <i className="bi bi-arrow-up text-primary ms-1" />;
      if (sortBy === "newest") return <i className="bi bi-arrow-down text-primary ms-1" />;
      return <i className="bi bi-arrow-down-up text-muted ms-1" style={{ fontSize: "0.75rem" }} />;
    }
    if (sortBy === `${field}-asc`) return <i className="bi bi-arrow-up text-primary ms-1" />;
    if (sortBy === `${field}-desc`) return <i className="bi bi-arrow-down text-primary ms-1" />;
    return <i className="bi bi-arrow-down-up text-muted ms-1" style={{ fontSize: "0.75rem" }} />;
  };

  const handleRowClick = (e, row) => {
    if (
      e.target.tagName === "INPUT" ||
      e.target.closest("input[type='checkbox']") ||
      e.target.closest(".data-table__actions") ||
      e.target.closest("button")
    ) {
      return;
    }
    onViewRow(row);
  };

  return (
    <div className="table-panel table-responsive" style={{ overflowX: "auto", width: "100%" }}>
      <table className="data-table" style={{ width: "100%", minWidth: "1200px" }}>
        <thead>
          <tr>
            <th className="data-table__checkbox-col">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(event) => onToggleSelectAll(event.target.checked)}
                aria-label="Select all rows"
              />
            </th>
            <th onClick={() => onSort("student")} style={{ cursor: "pointer", whiteSpace: "nowrap" }}>
              Student Name {getSortIcon("student")}
            </th>
            <th onClick={() => onSort("college")} style={{ cursor: "pointer", whiteSpace: "nowrap" }}>
              College {getSortIcon("college")}
            </th>
            <th onClick={() => onSort("course")} style={{ cursor: "pointer", whiteSpace: "nowrap" }}>
              Course We Provide {getSortIcon("course")}
            </th>
            <th onClick={() => onSort("trainer")} style={{ cursor: "pointer", whiteSpace: "nowrap" }}>
              Trainer {getSortIcon("trainer")}
            </th>
            <th onClick={() => onSort("rating")} style={{ cursor: "pointer", whiteSpace: "nowrap" }}>
              Rating {getSortIcon("rating")}
            </th>
            <th onClick={() => onSort("sentiment")} style={{ cursor: "pointer", whiteSpace: "nowrap" }}>
              Sentiment {getSortIcon("sentiment")}
            </th>
            <th style={{ whiteSpace: "nowrap" }}>Feedback Preview</th>
            <th onClick={() => onSort("date")} style={{ cursor: "pointer", whiteSpace: "nowrap" }}>
              Submitted Date {getSortIcon("date")}
            </th>
            <th style={{ whiteSpace: "nowrap" }}>Status</th>
            <th className="data-table__actions-col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={11} className="data-table__empty text-center py-5">
                <h5 className="text-muted font-weight-bold mb-1">No Feedback Found</h5>
                <p className="text-secondary mb-0" style={{ fontSize: "0.85rem" }}>
                  Try changing your filters or search keyword.
                </p>
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const sentiment = sentimentBadge[row.sentiment] || { label: "Neutral", tone: "amber" };
              const isSelected = selectedIds.includes(row.id);
              const previewText = row.text.slice(0, 60) + "...";

              return (
                <tr
                  key={row.id}
                  onClick={(e) => handleRowClick(e, row)}
                  style={{ cursor: "pointer" }}
                >
                  <td>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect(row.id)}
                      aria-label={`Select feedback ${row.id}`}
                    />
                  </td>
                  <td style={{ fontWeight: "600", color: "var(--color-text-primary)" }}>{row.student}</td>
                  <td>{row.college || "PSG College of Technology"}</td>
                  <td>{row.subject || row.course}</td>
                  <td>{row.trainer}</td>
                  <td>
                    <StarRating rating={row.rating} />
                  </td>
                  <td>
                    <span className={`badge-pill badge-pill--${sentiment.tone}`}>
                      {sentiment.label}
                    </span>
                  </td>
                  <td style={{ color: "var(--color-text-secondary)", fontStyle: "italic", fontSize: "0.85rem" }}>
                    "{previewText}"
                  </td>
                  <td>{row.date}</td>
                  <td>
                    <span
                      className={`status-pill ${row.status === "archived" ? "status-pill--archived" : "status-pill--active"
                        }`}
                    >
                      {row.status === "archived" ? "Archived" : "Active"}
                    </span>
                  </td>
                  <td>
                    <div className="data-table__actions">
                      <button
                        type="button"
                        className="table-icon-btn"
                        aria-label="View feedback"
                        onClick={() => onViewRow(row)}
                      >
                        <i className="bi bi-eye" />
                      </button>
                      <button
                        type="button"
                        className="table-icon-btn"
                        aria-label={row.status === "archived" ? "Restore feedback" : "Archive feedback"}
                        onClick={() => onToggleArchive(row.id)}
                      >
                        <i className={`bi ${row.status === "archived" ? "bi-arrow-counterclockwise" : "bi-archive"}`} />
                      </button>
                      <button
                        type="button"
                        className="table-icon-btn"
                        aria-label="Delete feedback"
                        style={{ color: "#EF4444" }}
                        onClick={() => onDeleteRow(row.id)}
                      >
                        <i className="bi bi-trash" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

export default FeedbackTable;