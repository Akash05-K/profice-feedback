function SearchInput({ value, onChange, placeholder }) {
  return (
    <div className="search-input">
      <i className="bi bi-search search-input__icon" />
      <input
        type="text"
        className="search-input__field"
        placeholder={placeholder || "Search..."}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export default SearchInput;