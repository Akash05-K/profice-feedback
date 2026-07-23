const priorityLabel = { high: "High", medium: "Medium", low: "Low" };
const statusLabel = { open: "Open", "in-progress": "In Progress", completed: "Completed", overdue: "Overdue" };

function ActionDetails({ action }) {
  return (
    <dl className="action-details">
      <div className="action-details__row">
        <dt>Action</dt>
        <dd>{action.title}</dd>
      </div>
      <div className="action-details__row">
        <dt>Assigned To</dt>
        <dd>{action.assignedTo}</dd>
      </div>
      <div className="action-details__row">
        <dt>Priority</dt>
        <dd>{priorityLabel[action.priority]}</dd>
      </div>
      <div className="action-details__row">
        <dt>Due Date</dt>
        <dd>{action.dueDate}</dd>
      </div>
      <div className="action-details__row">
        <dt>Status</dt>
        <dd>{statusLabel[action.status]}</dd>
      </div>
      <div className="action-details__row">
        <dt>Progress</dt>
        <dd>{action.progress}%</dd>
      </div>
      <div className="action-details__row action-details__row--full">
        <dt>Resolution Notes</dt>
        <dd>{action.notes || "No notes yet."}</dd>
      </div>
    </dl>
  );
}

export default ActionDetails;