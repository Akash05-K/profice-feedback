import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import AppLayout from "../../components/layout/AppLayout";
import StatCard from "../../components/cards/StatCard";
import DataTable from "../../components/tables/DataTable";
import Modal from "../../components/common/Modal";
import UserForm from "./UserForm";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { ROLE_LABELS } from "../../lib/permissions";

const ROLE_TONE = {
  super_admin: "purple",
  ace_lead: "blue",
  program_manager: "amber",
  management: "green",
  trainer: "grey",
};

const EMPTY_FORM = {
  name: "",
  email: "",
  password: "",
  role: "trainer",
  program: "",
  collegeId: "",
  specialties: "",
};

function Users() {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState({ roles: [], programs: [], colleges: [], programScopedRoles: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [modal, setModal] = useState(null); // "create" | "edit" | "password" | "delete"
  const [activeUser, setActiveUser] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [newPassword, setNewPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.getUsers();
      setUsers(res.data || []);
    } catch (err) {
      toast.error(err.message || "Could not load users.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
    api
      .getUserMeta()
      .then((res) => {
        if (res.data) setMeta(res.data);
      })
      .catch(() => {
        // The form falls back to free-text entry if meta is unavailable.
      });
  }, [loadUsers]);

  const closeModal = () => {
    setModal(null);
    setActiveUser(null);
    setForm(EMPTY_FORM);
    setNewPassword("");
  };

  const openCreate = () => {
    setForm({
      ...EMPTY_FORM,
      collegeId: meta.colleges?.[0]?.id ? String(meta.colleges[0].id) : "",
    });
    setModal("create");
  };

  const openEdit = (row) => {
    setActiveUser(row);
    setForm({ ...EMPTY_FORM, name: row.name, email: row.email, role: row.role, program: row.program || "" });
    setModal("edit");
  };

  const openPassword = (row) => {
    setActiveUser(row);
    setNewPassword("");
    setModal("password");
  };

  const openDelete = (row) => {
    setActiveUser(row);
    setModal("delete");
  };

  const handleCreate = async () => {
    setIsSaving(true);
    try {
      await api.createUser({
        ...form,
        collegeId: form.collegeId ? Number(form.collegeId) : undefined,
      });
      toast.success(`${form.name} can now sign in as ${ROLE_LABELS[form.role] || form.role}.`);
      closeModal();
      await loadUsers();
    } catch (err) {
      toast.error(err.message || "Could not create the user.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async () => {
    setIsSaving(true);
    try {
      await api.updateUser(activeUser.id, {
        name: form.name,
        role: form.role,
        program: form.program,
      });
      toast.success(`${form.name} updated.`);
      closeModal();
      await loadUsers();
    } catch (err) {
      toast.error(err.message || "Could not update the user.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetPassword = async () => {
    setIsSaving(true);
    try {
      await api.resetUserPassword(activeUser.id, newPassword);
      toast.success(`Password reset for ${activeUser.name}. Share it securely.`);
      closeModal();
    } catch (err) {
      toast.error(err.message || "Could not reset the password.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsSaving(true);
    try {
      const res = await api.deleteUser(activeUser.id);
      toast.success(`${activeUser.name} deleted.`);
      if (res.data?.trainerProfileRetained) {
        toast.info(
          `${activeUser.name}'s trainer profile and past feedback were kept — only the login was removed.`,
          { autoClose: 8000 }
        );
      }
      closeModal();
      await loadUsers();
    } catch (err) {
      toast.error(err.message || "Could not delete the user.");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return users;
    return users.filter((u) =>
      [u.name, u.email, u.roleLabel, u.program].filter(Boolean).some((field) =>
        String(field).toLowerCase().includes(term)
      )
    );
  }, [users, searchTerm]);

  const statCards = useMemo(() => {
    const byRole = users.reduce((acc, u) => {
      acc[u.role] = (acc[u.role] || 0) + 1;
      return acc;
    }, {});
    return [
      { id: "total", label: "Total Users", value: String(users.length), icon: "bi-people-fill", tone: "blue" },
      {
        id: "managers",
        label: "Program Managers",
        value: String(byRole.program_manager || 0),
        icon: "bi-diagram-3-fill",
        tone: "amber",
      },
      { id: "trainers", label: "Trainers", value: String(byRole.trainer || 0), icon: "bi-person-workspace", tone: "green" },
    ];
  }, [users]);

  const columns = useMemo(
    () => [
      {
        key: "name",
        label: "Name",
        render: (row) => (
          <div className="user-cell">
            <span className="user-cell__name">{row.name}</span>
            <span className="user-cell__email">{row.email}</span>
          </div>
        ),
      },
      {
        key: "roleLabel",
        label: "Role",
        filter: {
          type: "select",
          options: (meta.roles || []).map((r) => ({ value: r.label, label: r.label })),
          anyLabel: "All Roles",
        },
        render: (row) => (
          <span className={`badge-pill badge-pill--${ROLE_TONE[row.role] || "grey"}`}>{row.roleLabel}</span>
        ),
      },
      {
        key: "program",
        label: "Program",
        render: (row) => {
          if (row.program) return <span className="badge-pill badge-pill--blue">{row.program}</span>;
          if ((meta.programScopedRoles || []).includes(row.role)) {
            return (
              <span className="badge-pill badge-pill--red" title="This account will see no data until a program is set">
                Not set
              </span>
            );
          }
          return <span className="text-muted">All programs</span>;
        },
      },
      {
        key: "isLinked",
        label: "Profile",
        render: (row) =>
          row.isLinked ? (
            <span className="text-muted">Ready</span>
          ) : (
            <span
              className="badge-pill badge-pill--red"
              title="No matching trainer profile — this login will open to an empty app"
            >
              No trainer profile
            </span>
          ),
      },
      { key: "createdAt", label: "Created", sortType: "date" },
      {
        key: "actions",
        label: "Actions",
        sortable: false,
        headerClassName: "data-table__actions-col",
        render: (row) => {
          const isSelf = currentUser?.id === row.id;
          return (
            <div className="data-table__actions">
              <button type="button" className="table-icon-btn" aria-label={`Edit ${row.name}`} onClick={() => openEdit(row)}>
                <i className="bi bi-pencil" />
              </button>
              <button
                type="button"
                className="table-icon-btn"
                aria-label={`Reset password for ${row.name}`}
                onClick={() => openPassword(row)}
              >
                <i className="bi bi-key" />
              </button>
              <button
                type="button"
                className="table-icon-btn"
                aria-label={`Delete ${row.name}`}
                style={{ color: "var(--color-danger)" }}
                disabled={isSelf}
                title={isSelf ? "You cannot delete your own account" : undefined}
                onClick={() => openDelete(row)}
              >
                <i className="bi bi-trash" />
              </button>
            </div>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [meta, currentUser]
  );

  return (
    <AppLayout title="User Management">
      <div className="stat-card-grid stat-card-grid--three">
        {statCards.map((card) => (
          <StatCard key={card.id} {...card} />
        ))}
      </div>

      <div className="panel repository-table-card p-0 overflow-hidden">
        <DataTable
          title="Users"
          count={filteredUsers.length}
          columns={columns}
          rows={filteredUsers}
          isLoading={isLoading}
          getRowKey={(row) => row.id}
          emptyTitle="No users found"
          emptyMessage="No users match your search."
          search={{
            value: searchTerm,
            onChange: setSearchTerm,
            placeholder: "Search by name, email, role or program…",
          }}
          toolbarActions={
            <button type="button" className="btn-primary-pill" onClick={openCreate}>
              <i className="bi bi-plus-lg" />
              <span>Add User</span>
            </button>
          }
        />
      </div>

      {(modal === "create" || modal === "edit") && (
        <Modal
          title={modal === "create" ? "Add User" : `Edit ${activeUser?.name}`}
          onClose={closeModal}
          footer={
            <>
              <button type="button" className="btn-secondary" onClick={closeModal} disabled={isSaving}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={modal === "create" ? handleCreate : handleUpdate}
                disabled={isSaving}
              >
                {isSaving ? "Saving…" : modal === "create" ? "Create User" : "Save Changes"}
              </button>
            </>
          }
        >
          <UserForm value={form} onChange={setForm} meta={meta} mode={modal} />
        </Modal>
      )}

      {modal === "password" && (
        <Modal
          title={`Reset password — ${activeUser?.name}`}
          onClose={closeModal}
          size="sm"
          footer={
            <>
              <button type="button" className="btn-secondary" onClick={closeModal} disabled={isSaving}>
                Cancel
              </button>
              <button type="button" className="btn-primary" onClick={handleResetPassword} disabled={isSaving}>
                {isSaving ? "Resetting…" : "Reset Password"}
              </button>
            </>
          }
        >
          <div className="action-form">
            <div className="action-form__field action-form__field--full">
              <label className="form-label" htmlFor="reset-password">
                New password
              </label>
              <input
                id="reset-password"
                type="text"
                className="form-input"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="At least 6 characters"
                autoComplete="new-password"
              />
              <span className="form-hint">
                The user is not notified automatically — share this with them directly.
              </span>
            </div>
          </div>
        </Modal>
      )}

      {modal === "delete" && (
        <Modal
          title="Delete user"
          onClose={closeModal}
          size="sm"
          footer={
            <>
              <button type="button" className="btn-secondary" onClick={closeModal} disabled={isSaving}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{ background: "var(--color-danger)" }}
                onClick={handleDelete}
                disabled={isSaving}
              >
                {isSaving ? "Deleting…" : "Delete permanently"}
              </button>
            </>
          }
        >
          <p>
            Permanently delete <strong>{activeUser?.name}</strong> ({activeUser?.email})? They will lose
            access immediately. This cannot be undone.
          </p>
          {activeUser?.role === "trainer" && (
            <p className="form-hint">
              Their trainer profile and existing feedback records are kept, so dashboards and
              reports stay intact. Only the ability to sign in is removed.
            </p>
          )}
        </Modal>
      )}
    </AppLayout>
  );
}

export default Users;
