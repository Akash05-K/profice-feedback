const priorityMeta = {
  high: { label: "High", tone: "red" },
  medium: { label: "Medium", tone: "amber" },
  low: { label: "Low", tone: "blue" },
};

const statusMeta = {
  open: { label: "Open", tone: "blue" },
  "in-progress": { label: "In Progress", tone: "violet" },
  completed: { label: "Completed", tone: "green" },
  overdue: { label: "Overdue", tone: "red" },
};

function ActionTable({ rows, onView, onEdit }) {
  return (
    <div className="table-panel">
      <table className="data-table">
        <thead>
          <tr>
            <th>Action</th>
            <th>Assigned To</th>
            <th>Priority</th>
            <th>Due Date</th>
            <th>Status</th>
            <th className="data-table__actions-col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="data-table__empty">
                No actions match your filters.
              </td>
            </tr>
          ) : (
            rows.map((action) => {
              const priority = priorityMeta[action.priority];
              const status = statusMeta[action.status];
              return (
                <tr key={action.id}>
                  <td>
                    <span className="action-cell__title">{action.title}</span>
                  </td>
                  <td>{action.assignedTo}</td>
                  <td>
                    <span className={`badge-pill badge-pill--${priority.tone}`}>{priority.label}</span>
                  </td>
                  <td>{action.dueDate}</td>
                  <td>
                    <span className={`badge-pill badge-pill--${status.tone}`}>{status.label}</span>
                  </td>
                  <td>
                    <div className="data-table__actions">
                      <button
                        type="button"
                        className="table-icon-btn"
                        aria-label="View action"
                        onClick={() => onView(action)}
                      >
                        <i className="bi bi-eye" />
                      </button>
                      <button
                        type="button"
                        className="table-icon-btn"
                        aria-label="Edit action"
                        onClick={() => onEdit(action)}
                      >
                        <i className="bi bi-pencil" />
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

export default ActionTable;