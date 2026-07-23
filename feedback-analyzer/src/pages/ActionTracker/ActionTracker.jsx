import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import AppLayout from "../../components/layout/AppLayout";
import StatCard from "../../components/cards/StatCard";
import SearchInput from "../../components/common/SearchInput";
import SelectDropdown from "../../components/common/SelectDropdown";
import ActionTable from "../../components/tables/ActionTable";
import Pagination from "../../components/widgets/Pagination";
import Modal from "../../components/common/Modal";
import ActionForm from "../../components/forms/ActionForm";
import ActionDetails from "../../components/common/ActionDetails";
import SentimentDonutChart from "../../components/charts/SentimentDonutChart";
import SentimentLegend from "../../components/widgets/SentimentLegend";
import ActivityList from "../../components/widgets/ActivityList";
import api from "../../services/api";
import { priorityOptions, statusOptions, actions as fallbackActions } from "../../data/actionTrackerData";

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
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const [modalMode, setModalMode] = useState(null);
  const [activeAction, setActiveAction] = useState(null);
  const [formDraft, setFormDraft] = useState(emptyAction);
  const [isLoading, setIsLoading] = useState(false);

  const fetchActions = useCallback(async () => {
    setIsLoading(true);
    try {
      const [actionsRes, statsRes] = await Promise.all([
        api.getActions({
          priority: priorityFilter,
          status: statusFilter,
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
      console.error("Fetch actions error:", e);
    } finally {
      setIsLoading(false);
    }
  }, [priorityFilter, statusFilter, searchTerm, currentPage]);

  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  const statCards = [
    { id: "total", label: "Total Actions", value: String(stats.totalActions), icon: "bi-list-task", tone: "violet" },
    { id: "in-progress", label: "In Progress", value: String(stats.inProgressCount), icon: "bi-arrow-repeat", tone: "blue" },
    { id: "completed", label: "Completed", value: String(stats.completedCount), icon: "bi-check-circle-fill", tone: "green" },
    { id: "overdue", label: "Overdue", value: String(stats.overdueCount), icon: "bi-exclamation-triangle-fill", tone: "amber" },
  ];

  function updateFilter(setter) {
    return (value) => {
      setter(value);
      setCurrentPage(1);
    };
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
    setFormDraft(emptyAction);
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
    }
  }

  return (
    <AppLayout title="Action Tracker">
      {/* Stat cards */}
      <div className="stat-card-grid stat-card-grid--three">
        {statCards.map((card) => (
          <StatCard key={card.id} {...card} />
        ))}
      </div>

      {/* Toolbar */}
      <div className="panel repository-toolbar">
        <SearchInput
          value={searchTerm}
          onChange={updateFilter(setSearchTerm)}
          placeholder="Search by action or assignee..."
        />
        <div className="repository-toolbar__filters">
          <SelectDropdown
            value={priorityFilter}
            onChange={updateFilter(setPriorityFilter)}
            options={priorityOptions}
          />
          <SelectDropdown
            value={statusFilter}
            onChange={updateFilter(setStatusFilter)}
            options={statusOptions}
          />
          <button type="button" className="btn-primary-pill" onClick={openAdd}>
            <i className="bi bi-plus-lg" />
            <span>Add Action</span>
          </button>
        </div>
      </div>

      {/* Table + pagination */}
      <div className="panel repository-table-card">
        {isLoading ? (
          <div className="p-4 text-center text-muted">
            <div className="spinner-border text-primary me-2" role="status" />
            <span>Loading actions...</span>
          </div>
        ) : (
          <>
            <ActionTable rows={actions} onView={openView} onEdit={openEdit} />
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={totalItems}
              pageSize={PAGE_SIZE}
            />
          </>
        )}
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
              <button type="button" className="btn-secondary" onClick={closeModal}>
                Cancel
              </button>
              <button type="button" className="btn-primary" onClick={saveAction}>
                Save Action
              </button>
            </>
          }
        >
          <ActionForm value={formDraft} onChange={setFormDraft} />
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