import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "react-toastify";
import AppLayout from "../../components/layout/AppLayout";
import StatCard from "../../components/cards/StatCard";
import DataTable from "../../components/tables/DataTable";
import Pagination from "../../components/widgets/Pagination";
import Modal from "../../components/common/Modal";
import ActionForm from "../../components/forms/ActionForm";
import ActionDetails from "../../components/common/ActionDetails";
import SentimentDonutChart from "../../components/charts/SentimentDonutChart";
import SentimentLegend from "../../components/widgets/SentimentLegend";
import ActivityList from "../../components/widgets/ActivityList";
import api from "../../services/api";
import { priorityOptions, statusOptions, actions as fallbackActions } from "../../data/actiontrackerData";

const PAGE_SIZE = 8;

const emptyAction = {
  title: "",
  assignedTo: "Karthik S",
  priority: "medium",
  dueDate: new Date().toISOString().slice(0, 10),
  status: "open",
  progress: 0,
  notes: "",
};

const statusChartTone = {
  open: "#2563EB",
  "in-progress": "#6366F1",
  completed: "#16A34A",
  overdue: "#EF4444",
};

const statusChartLabel = {
  open: "Open",
  "in-progress": "In Progress",
  completed: "Completed",
  overdue: "Overdue",
};

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

// The shared filter panel uses "" for "any", so the "all" sentinel is dropped.
const toFilterOptions = (options) => options.filter((option) => option.value !== "all");

function daysUntil(dateStr) {
  if (!dateStr) return "";
  const diff = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff === 0) return "Due today";
  return `${diff}d left`;
}

function ActionTracker() {
  const [actions, setActions] = useState(fallbackActions);
  const [totalItems, setTotalItems] = useState(fallbackActions.length);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({
    totalActions: fallbackActions.length,
    inProgressCount: 0,
    completedCount: 0,
    overdueCount: 0,
    openCount: 0,
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({});
  const [sort, setSort] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const [modalMode, setModalMode] = useState(null);
  const [activeAction, setActiveAction] = useState(null);
  const [formDraft, setFormDraft] = useState(emptyAction);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [assigneeOptions, setAssigneeOptions] = useState(["Karthik S", "Priya N", "Arjun D", "Meera J"]);

  // Load real trainer names for the "Assigned To" selector.
  useEffect(() => {
    api
      .getTrainerFilterOptions()
      .then((res) => {
        const names = (res.data?.trainers || []).filter((t) => t.id !== "overall").map((t) => t.name);
        if (names.length) setAssigneeOptions(names);
      })
      .catch(() => {});
  }, []);

  // Every column filter maps to a server query param so paging stays correct.
  const queryParams = useMemo(
    () => ({
      title: filters.title || undefined,
      assignedTo: filters.assignedTo || undefined,
      priority: filters.priority || undefined,
      status: filters.status || undefined,
      dueFrom: filters.dueDate?.from || undefined,
      dueTo: filters.dueDate?.to || undefined,
      sortBy: sort ? `${sort.key}-${sort.dir}` : undefined,
    }),
    [filters, sort]
  );

  const fetchActions = useCallback(async () => {
    setIsLoading(true);
    try {
      const [actionsRes, statsRes] = await Promise.all([
        api.getActions({
          ...queryParams,
          search: searchTerm,
          page: currentPage,
          limit: PAGE_SIZE,
        }),
        api.getActionStats(),
      ]);

      if (actionsRes.data) {
        setActions(actionsRes.data);
        setTotalItems(actionsRes.pagination.total);
        setTotalPages(actionsRes.pagination.totalPages);
      }
      if (statsRes.data) {
        setStats(statsRes.data);
      }
    } catch (e) {
      toast.error(e.message || "Failed to load actions.");
      setActions([]);
    } finally {
      setIsLoading(false);
    }
  }, [queryParams, searchTerm, currentPage]);

  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  const statCards = [
    { id: "total", label: "Total Actions", value: String(stats.totalActions), icon: "bi-list-task", tone: "violet" },
    { id: "in-progress", label: "In Progress", value: String(stats.inProgressCount), icon: "bi-arrow-repeat", tone: "blue" },
    { id: "completed", label: "Completed", value: String(stats.completedCount), icon: "bi-check-circle-fill", tone: "green" },
    { id: "overdue", label: "Overdue", value: String(stats.overdueCount), icon: "bi-exclamation-triangle-fill", tone: "amber" },
  ];

  function updateFilters(next) {
    setFilters(next);
    setCurrentPage(1);
  }

  function updateSort(next) {
    setSort(next);
    setCurrentPage(1);
  }

  function updateSearch(value) {
    setSearchTerm(value);
    setCurrentPage(1);
  }

  // Chart data
  const chartData = ["open", "in-progress", "completed", "overdue"].map((status) => {
    let count = 0;
    if (status === "open") count = stats.openCount;
    else if (status === "in-progress") count = stats.inProgressCount;
    else if (status === "completed") count = stats.completedCount;
    else if (status === "overdue") count = stats.overdueCount;

    return {
      name: statusChartLabel[status],
      value: stats.totalActions ? Math.round((count / stats.totalActions) * 100) : 0,
      count: String(count),
      color: statusChartTone[status],
    };
  });

  // Recent completed and upcoming deadlines
  const recentCompleted = [...actions]
    .filter((a) => a.status === "completed")
    .map((a) => ({
      id: a.id,
      icon: "bi-check-circle-fill",
      tone: "green",
      title: a.title,
      subtitle: `${a.assignedTo} · Completed ${a.completedDate || a.dueDate}`,
      meta: "",
    }));

  const upcomingDeadlines = [...actions]
    .filter((a) => a.status !== "completed")
    .map((a) => ({
      id: a.id,
      icon: a.status === "overdue" ? "bi-exclamation-triangle-fill" : "bi-calendar-event-fill",
      tone: a.status === "overdue" ? "red" : "amber",
      title: a.title,
      subtitle: `${a.assignedTo} · Due ${a.dueDate}`,
      meta: daysUntil(a.dueDate),
    }));

  // Modal handlers
  function openAdd() {
    setFormDraft({ ...emptyAction, assignedTo: assigneeOptions[0] || "" });
    setModalMode("add");
  }
  function openEdit(action) {
    setActiveAction(action);
    setFormDraft(action);
    setModalMode("edit");
  }
  function openView(action) {
    setActiveAction(action);
    setModalMode("view");
  }
  function closeModal() {
    setModalMode(null);
    setActiveAction(null);
  }

  async function saveAction() {
    // Validation
    if (!formDraft.title || !formDraft.title.trim()) {
      toast.error("Please enter an action title.");
      return;
    }
    if (!formDraft.assignedTo) {
      toast.error("Please assign the action to a trainer.");
      return;
    }
    if (!formDraft.dueDate) {
      toast.error("Please set a due date.");
      return;
    }
    setIsSaving(true);
    try {
      if (modalMode === "add") {
        await api.createAction(formDraft);
        toast.success("Action item created successfully!");
      } else if (modalMode === "edit" && activeAction) {
        await api.updateAction(activeAction.id, formDraft);
        toast.success("Action item updated successfully!");
      }
      closeModal();
      fetchActions();
    } catch (e) {
      toast.error(e.message || "Failed to save action.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(action) {
    if (!window.confirm(`Delete action "${action.title}"? This cannot be undone.`)) return;
    setDeletingId(action.id);
    try {
      await api.deleteAction(action.id);
      toast.success("Action deleted.");
      fetchActions();
    } catch (e) {
      toast.error(e.message || "Failed to delete action.");
    } finally {
      setDeletingId(null);
    }
  }

  const columns = useMemo(
    () => [
      {
        key: "title",
        label: "Action",
        filter: { type: "text", placeholder: "Action title contains…" },
        render: (row) => <span className="action-cell__title">{row.title}</span>,
      },
      {
        key: "assignedTo",
        label: "Assigned To",
        filter: { type: "text", label: "Assignee", placeholder: "Assignee name contains…" },
      },
      {
        key: "priority",
        label: "Priority",
        filter: { type: "select", options: toFilterOptions(priorityOptions), anyLabel: "All Priorities" },
        render: (row) => {
          const meta = priorityMeta[row.priority] || priorityMeta.medium;
          return <span className={`badge-pill badge-pill--${meta.tone}`}>{meta.label}</span>;
        },
      },
      {
        key: "dueDate",
        label: "Due Date",
        sortType: "date",
        filter: { type: "date", label: "Due date" },
      },
      {
        key: "status",
        label: "Status",
        filter: { type: "select", options: toFilterOptions(statusOptions), anyLabel: "All Statuses" },
        render: (row) => {
          const meta = statusMeta[row.status] || statusMeta.open;
          return <span className={`badge-pill badge-pill--${meta.tone}`}>{meta.label}</span>;
        },
      },
      {
        key: "actions",
        label: "Actions",
        sortable: false,
        headerClassName: "data-table__actions-col",
        render: (row) => (
          <div className="data-table__actions">
            <button type="button" className="table-icon-btn" aria-label="View action" onClick={() => openView(row)}>
              <i className="bi bi-eye" />
            </button>
            <button type="button" className="table-icon-btn" aria-label="Edit action" onClick={() => openEdit(row)}>
              <i className="bi bi-pencil" />
            </button>
            <button
              type="button"
              className="table-icon-btn"
              aria-label="Delete action"
              style={{ color: "var(--color-danger)" }}
              disabled={deletingId === row.id}
              onClick={() => handleDelete(row)}
            >
              <i className="bi bi-trash" />
            </button>
          </div>
        ),
      },
    ],
    [deletingId]
  );

  return (
    <AppLayout title="Action Tracker">
      {/* Stat cards */}
      <div className="stat-card-grid stat-card-grid--three">
        {statCards.map((card) => (
          <StatCard key={card.id} {...card} />
        ))}
      </div>

      {/* Table + pagination */}
      <div className="panel repository-table-card p-0 overflow-hidden">
        <DataTable
          title="Action Items"
          count={totalItems}
          columns={columns}
          rows={actions}
          isLoading={isLoading}
          getRowKey={(row) => row.id}
          emptyTitle="No actions found"
          emptyMessage="No actions match your filters."
          search={{
            value: searchTerm,
            onChange: updateSearch,
            placeholder: "Search by action or assignee…",
          }}
          filters={filters}
          onFiltersChange={updateFilters}
          sort={sort}
          onSortChange={updateSort}
          toolbarActions={
            <button type="button" className="btn-primary-pill" onClick={openAdd}>
              <i className="bi bi-plus-lg" />
              <span>Add Action</span>
            </button>
          }
          footer={
            !isLoading ? (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={totalItems}
                pageSize={PAGE_SIZE}
              />
            ) : null
          }
        />
      </div>

      {/* Chart + activity lists */}
      <div className="dashboard-row dashboard-row--three">
        <div className="panel sentiment-card">
          <div className="panel-header">
            <h2 className="panel-header__title">Action Summary</h2>
          </div>
          <SentimentDonutChart data={chartData} total={String(stats.totalActions)} />
          <SentimentLegend data={chartData} />
        </div>

        <ActivityList
          title="Recent Completed Actions"
          icon="bi-check2-circle"
          iconTone="blue"
          items={recentCompleted}
          emptyText="No actions completed yet."
        />

        <ActivityList
          title="Upcoming Deadlines"
          icon="bi-calendar-week-fill"
          iconTone="amber"
          items={upcomingDeadlines}
          emptyText="No upcoming deadlines."
        />
      </div>

      {/* Add / Edit modal */}
      {(modalMode === "add" || modalMode === "edit") && (
        <Modal
          title={modalMode === "add" ? "Add Action" : "Edit Action"}
          onClose={closeModal}
          footer={
            <>
              <button type="button" className="btn-secondary" onClick={closeModal} disabled={isSaving}>
                Cancel
              </button>
              <button type="button" className="btn-primary" onClick={saveAction} disabled={isSaving}>
                {isSaving ? "Saving…" : "Save Action"}
              </button>
            </>
          }
        >
          <ActionForm value={formDraft} onChange={setFormDraft} assigneeOptions={assigneeOptions} />
        </Modal>
      )}

      {/* View modal */}
      {modalMode === "view" && activeAction && (
        <Modal
          title="Action Details"
          onClose={closeModal}
          footer={
            <button type="button" className="btn-secondary" onClick={closeModal}>
              Close
            </button>
          }
        >
          <ActionDetails action={activeAction} />
        </Modal>
      )}
    </AppLayout>
  );
}

export default ActionTracker;