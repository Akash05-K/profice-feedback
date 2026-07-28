/**
 * Add / edit form for a user account.
 *
 * Program is only asked for on program-scoped roles (Program Manager, Trainer);
 * college and specialties only for trainers, because those feed the linked
 * Trainer entity the backend provisions alongside the login.
 */
function UserForm({ value, onChange, meta, mode = "create", errors = {} }) {
  const updateField = (field, fieldValue) => onChange({ ...value, [field]: fieldValue });

  const needsProgram = (meta.programScopedRoles || []).includes(value.role);
  const isTrainer = value.role === "trainer";

  return (
    <div className="action-form">
      <div className="action-form__field">
        <label className="form-label" htmlFor="user-name">
          Full name
        </label>
        <input
          id="user-name"
          type="text"
          className="form-input"
          value={value.name}
          onChange={(event) => updateField("name", event.target.value)}
          placeholder="e.g. Anand R"
        />
        {errors.name && <span className="form-error">{errors.name}</span>}
      </div>

      <div className="action-form__field">
        <label className="form-label" htmlFor="user-email">
          Email
        </label>
        <input
          id="user-email"
          type="email"
          className="form-input"
          value={value.email}
          onChange={(event) => updateField("email", event.target.value)}
          placeholder="name@profice.edu"
          disabled={mode === "edit"}
        />
        {mode === "edit" && (
          <span className="form-hint">Email is the account identifier and cannot be changed.</span>
        )}
        {errors.email && <span className="form-error">{errors.email}</span>}
      </div>

      {mode === "create" && (
        <div className="action-form__field">
          <label className="form-label" htmlFor="user-password">
            Temporary password
          </label>
          <input
            id="user-password"
            type="text"
            className="form-input"
            value={value.password}
            onChange={(event) => updateField("password", event.target.value)}
            placeholder="At least 6 characters"
            autoComplete="new-password"
          />
          {errors.password && <span className="form-error">{errors.password}</span>}
        </div>
      )}

      <div className="action-form__field">
        <label className="form-label" htmlFor="user-role">
          Role
        </label>
        <select
          id="user-role"
          className="form-select"
          value={value.role}
          onChange={(event) => updateField("role", event.target.value)}
        >
          {(meta.roles || []).map((role) => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </select>
      </div>

      {needsProgram && (
        <div className="action-form__field">
          <label className="form-label" htmlFor="user-program">
            Program
          </label>
          <input
            id="user-program"
            list="user-program-options"
            className="form-input"
            value={value.program}
            onChange={(event) => updateField("program", event.target.value)}
            placeholder="e.g. IBM"
          />
          <datalist id="user-program-options">
            {(meta.programs || []).map((program) => (
              <option key={program} value={program} />
            ))}
          </datalist>
          <span className="form-hint">
            This is the only data this account will ever see.
          </span>
          {errors.program && <span className="form-error">{errors.program}</span>}
        </div>
      )}

      {isTrainer && mode === "create" && (
        <>
          <div className="action-form__field">
            <label className="form-label" htmlFor="user-college">
              College
            </label>
            <select
              id="user-college"
              className="form-select"
              value={value.collegeId}
              onChange={(event) => updateField("collegeId", event.target.value)}
            >
              {(meta.colleges || []).map((college) => (
                <option key={college.id} value={college.id}>
                  {college.name}
                </option>
              ))}
            </select>
          </div>

          <div className="action-form__field action-form__field--full">
            <label className="form-label" htmlFor="user-specialties">
              Subject specialties
            </label>
            <input
              id="user-specialties"
              type="text"
              className="form-input"
              value={value.specialties}
              onChange={(event) => updateField("specialties", event.target.value)}
              placeholder="Comma separated, e.g. AI &amp; ML, Data Analytics"
            />
            <span className="form-hint">
              A matching trainer profile is created automatically so this login has data on
              first sign-in.
            </span>
          </div>
        </>
      )}
    </div>
  );
}

export default UserForm;
