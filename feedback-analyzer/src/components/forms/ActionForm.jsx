const assigneeOptions = ["Karthik S", "Priya N", "Arjun D", "Meera J"];

function ActionForm({ value, onChange }) {
  function updateField(field, fieldValue) {
    onChange({ ...value, [field]: fieldValue });
  }

  return (
    <div className="action-form">
      <div className="action-form__field action-form__field--full">
        <label className="form-label" htmlFor="action-title">
          Action
        </label>
        <input
          id="action-title"
          type="text"
          className="form-input"
          value={value.title}
          onChange={(event) => updateField("title", event.target.value)}
          placeholder="e.g. Add more practical sessions"
        />
      </div>

      <div className="action-form__field">
        <label className="form-label" htmlFor="action-assignee">
          Assigned To
        </label>
        <select
          id="action-assignee"
          className="form-select"
          value={value.assignedTo}
          onChange={(event) => updateField("assignedTo", event.target.value)}
        >
          {assigneeOptions.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <div className="action-form__field">
        <label className="form-label" htmlFor="action-priority">
          Priority
        </label>
        <select
          id="action-priority"
          className="form-select"
          value={value.priority}
          onChange={(event) => updateField("priority", event.target.value)}
        >
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      <div className="action-form__field">
        <label className="form-label" htmlFor="action-due-date">
          Due Date
        </label>
        <input
          id="action-due-date"
          type="date"
          className="form-input"
          value={value.dueDate}
          onChange={(event) => updateField("dueDate", event.target.value)}
        />
      </div>

      <div className="action-form__field">
        <label className="form-label" htmlFor="action-status">
          Status
        </label>
        <select
          id="action-status"
          className="form-select"
          value={value.status}
          onChange={(event) => updateField("status", event.target.value)}
        >
          <option value="open">Open</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      <div className="action-form__field action-form__field--full">
        <label className="form-label" htmlFor="action-progress">
          Progress ({value.progress}%)
        </label>
        <input
          id="action-progress"
          type="range"
          min="0"
          max="100"
          step="5"
          className="form-range"
          value={value.progress}
          onChange={(event) => updateField("progress", Number(event.target.value))}
        />
      </div>

      <div className="action-form__field action-form__field--full">
        <label className="form-label" htmlFor="action-notes">
          Resolution Notes
        </label>
        <textarea
          id="action-notes"
          className="form-textarea"
          value={value.notes}
          onChange={(event) => updateField("notes", event.target.value)}
          placeholder="Optional notes on progress or resolution..."
        />
      </div>
    </div>
  );
}

export default ActionForm;