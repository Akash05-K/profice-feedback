function SelectDropdown({ icon, value, onChange, options }) {
  return (
    <div className="select-dropdown">
      {icon ? <i className={`bi ${icon} select-dropdown__icon`} /> : null}
      <select
        className="select-dropdown__field"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <i className="bi bi-chevron-down select-dropdown__caret" />
    </div>
  );
}

export default SelectDropdown;