import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "react-toastify";
import AppLayout from "../../components/layout/AppLayout";
import StatCard from "../../components/cards/StatCard";
import DataTable from "../../components/tables/DataTable";
import Pagination from "../../components/widgets/Pagination";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { CAP } from "../../lib/permissions";

const sentimentOptions = [
  { value: "positive", label: "Positive" },
  { value: "neutral", label: "Neutral" },
  { value: "negative", label: "Negative" },
];

const ratingOptions = [5, 4, 3, 2, 1].map((n) => ({
  value: String(n),
  label: `${n} Star${n > 1 ? "s" : ""}`,
}));

const sentimentBadge = {
  positive: { label: "Positive", tone: "green" },
  neutral: { label: "Neutral", tone: "amber" },
  negative: { label: "Negative", tone: "red" },
};

const statusTabs = [
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
  { value: "uploads", label: "Upload History" },
];

const PAGE_SIZE = 20;

function StarRating({ rating }) {
  return (
    <span className="star-rating text-warning" style={{ whiteSpace: "nowrap" }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <i
          key={star}
          className={`bi ${star <= rating ? "bi-star-fill text-warning" : "bi-star text-muted"} star-rating__star me-0.5`}
        />
      ))}
    </span>
  );
}

function FeedbackRepository() {
  const { hasCapability } = useAuth();
  // Read-only roles (Management) still browse and export, but never archive,
  // delete or bulk-edit. The backend rejects those calls regardless.
  const canManage = hasCapability(CAP.MANAGE_FEEDBACK);
  // Upload History reads /upload/sessions, which requires UPLOAD_FEEDBACK.
  // Hiding the tab keeps a read-only role from hitting a guaranteed 403.
  const canSeeUploads = hasCapability(CAP.UPLOAD_FEEDBACK);
  const visibleStatusTabs = canSeeUploads
    ? statusTabs
    : statusTabs.filter((tab) => tab.value !== "uploads");

  const [pageRows, setPageRows] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [stats, setStats] = useState({
    total: 0,
    positive: 0,
    neutral: 0,
    negative: 0,
    avgRating: "0.0",
    activeCount: 0,
    archivedCount: 0,
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({});
  const [sort, setSort] = useState(null);

  const [collegeOptions, setCollegeOptions] = useState([]);
  const [courseOptions, setCourseOptions] = useState([]);
  const [trainerOptions, setTrainerOptions] = useState([]);

  const [statusView, setStatusView] = useState("active");
  const [selectedIds, setSelectedIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeViewFeedback, setActiveViewFeedback] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Upload History state
  const [uploadSessions, setUploadSessions] = useState([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [deletingSessionId, setDeletingSessionId] = useState(null);

  // Every column filter maps to a server query param so paging stays correct.
  const queryParams = useMemo(
    () => ({
      student: filters.student || undefined,
      college: filters.college || undefined,
      course: filters.course || undefined,
      trainer: filters.trainer || undefined,
      rating: filters.rating || undefined,
      sentiment: filters.sentiment || undefined,
      text: filters.text || undefined,
      startDate: filters.date?.from || undefined,
      endDate: filters.date?.to || undefined,
      sortBy: sort ? `${sort.key}-${sort.dir}` : "newest",
    }),
    [filters, sort]
  );

  // Load filter options dynamically
  const loadFilterOptions = useCallback(async () => {
    try {
      const res = await api.getFeedbackFilterOptions({
        college: filters.college || undefined,
        course: filters.course || undefined,
      });
      if (!res.data) return;

      const toOptions = (list, allLabel) =>
        (list || []).filter((item) => item !== allLabel).map((item) => ({ value: item, label: item }));

      setCollegeOptions(toOptions(res.data.colleges, "All Colleges"));
      setCourseOptions(toOptions(res.data.courses, "All Courses"));
      setTrainerOptions(toOptions(res.data.trainers, "All Trainers"));
    } catch (e) {
      console.error("Filter options fetch error:", e);
    }
  }, [filters.college, filters.course]);

  useEffect(() => {
    loadFilterOptions();
  }, [loadFilterOptions]);

  // Load repository records from API
  const fetchRecords = useCallback(async () => {
    if (statusView === "uploads") return;
    setIsLoading(true);
    try {
      const [recordsRes, statsRes] = await Promise.all([
        api.getFeedbackRecords({
          ...queryParams,
          search: searchTerm,
          status: statusView,
          page: currentPage,
          limit: PAGE_SIZE,
        }),
        api.getFeedbackStats(),
      ]);

      if (recordsRes.data) {
        setPageRows(recordsRes.data);
        setTotalItems(recordsRes.pagination.total);
        setTotalPages(recordsRes.pagination.totalPages);
      }

      if (statsRes.data) {
        setStats(statsRes.data);
      }
    } catch (e) {
      console.error("Fetch records error:", e);
      toast.error(e.message || "Failed to fetch feedback records.");
    } finally {
      setIsLoading(false);
    }
  }, [queryParams, searchTerm, statusView, currentPage]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Narrowing a parent filter invalidates the ones scoped beneath it.
  const handleFiltersChange = (next) => {
    const cleaned = { ...next };
    if (cleaned.college !== filters.college) {
      delete cleaned.course;
      delete cleaned.trainer;
    } else if (cleaned.course !== filters.course) {
      delete cleaned.trainer;
    }
    setFilters(cleaned);
    setCurrentPage(1);
    setSelectedIds([]);
  };

  const handleSortChange = (next) => {
    setSort(next);
    setCurrentPage(1);
  };

  const statCards = [
    { id: "total-feedback", label: "Total Feedback", value: String(stats.total), icon: "bi-chat-square-text-fill", tone: "violet" },
    { id: "positive-feedback", label: "Positive Feedback", value: String(stats.positive), icon: "bi-emoji-smile-fill", tone: "green" },
    { id: "neutral-feedback", label: "Neutral Feedback", value: String(stats.neutral), icon: "bi-emoji-neutral-fill", tone: "amber" },
    { id: "negative-feedback", label: "Negative Feedback", value: String(stats.negative), icon: "bi-emoji-frown-fill", tone: "red" },
    { id: "avg-rating", label: "Average Rating", value: String(stats.avgRating), valueSuffix: "/ 5", icon: "bi-star-fill", tone: "amber" },
  ];

  function handleSearchChange(value) {
    setSearchTerm(value);
    setCurrentPage(1);
    setSelectedIds([]);
  }

  function handleStatusViewChange(value) {
    setStatusView(value);
    setCurrentPage(1);
    setSelectedIds([]);
  }

  function toggleSelect(id) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((selectedId) => selectedId !== id) : [...prev, id]
    );
  }

  function toggleSelectAll(checked) {
    setSelectedIds(checked ? pageRows.map((row) => row.id) : []);
  }

  async function toggleArchive(id) {
    try {
      await api.toggleFeedbackStatus(id);
      toast.success(`Status updated for feedback record ${id}.`);
      fetchRecords();
      setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id));
    } catch (e) {
      toast.error(e.message || "Failed to toggle status.");
    }
  }

  async function deleteRow(id) {
    try {
      await api.deleteFeedback(id);
      toast.success(`Successfully deleted feedback record ${id}!`);
      fetchRecords();
      setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id));
    } catch (e) {
      toast.error(e.message || "Failed to delete record.");
    }
  }

  async function archiveSelected() {
    try {
      await api.bulkActionFeedback({ ids: selectedIds, action: "archive" });
      toast.success(`Successfully archived ${selectedIds.length} feedback records!`);
      setSelectedIds([]);
      fetchRecords();
    } catch (e) {
      toast.error(e.message || "Failed to archive selected.");
    }
  }

  async function deleteSelected() {
    try {
      await api.bulkActionFeedback({ ids: selectedIds, action: "delete" });
      toast.success(`Successfully deleted ${selectedIds.length} feedback records!`);
      setSelectedIds([]);
      fetchRecords();
    } catch (e) {
      toast.error(e.message || "Failed to delete selected.");
    }
  }

  async function exportSelected() {
    try {
      const blob = await api.exportFeedback({ ids: selectedIds, format: "xlsx" });
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `selected_feedback_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`Successfully exported ${selectedIds.length} selected feedback records!`);
      setSelectedIds([]);
    } catch (e) {
      toast.error(e.message || "Failed to export selected.");
    }
  }

  // Upload History functions
  const loadUploadSessions = useCallback(async () => {
    setIsLoadingSessions(true);
    try {
      const res = await api.getUploadSessions();
      if (res.data) {
        setUploadSessions(res.data);
      }
    } catch (e) {
      console.error("Failed to load upload sessions:", e);
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  // Prefetch once on mount so the "Upload History" tab badge is accurate,
  // then refresh whenever that tab is active. Skipped for roles without
  // upload access, whose tab is hidden anyway.
  useEffect(() => {
    if (canSeeUploads) loadUploadSessions();
  }, [loadUploadSessions, canSeeUploads]);

  useEffect(() => {
    if (canSeeUploads && statusView === "uploads") {
      loadUploadSessions();
    }
  }, [statusView, loadUploadSessions, canSeeUploads]);

  async function handleDeleteSession(sessionId, filename) {
    if (!window.confirm(`Delete "${filename}" and all its ${uploadSessions.find(s => s.id === sessionId)?.totalRows || 0} feedback records? This cannot be undone.`)) {
      return;
    }
    setDeletingSessionId(sessionId);
    try {
      const res = await api.deleteUploadSession(sessionId);
      toast.success(`Deleted "${filename}" and ${res.data.deletedRecords} feedback records.`);
      loadUploadSessions();
      // Refresh stats since records were deleted
      const statsRes = await api.getFeedbackStats();
      if (statsRes.data) setStats(statsRes.data);
    } catch (e) {
      toast.error(e.message || "Failed to delete upload session.");
    } finally {
      setDeletingSessionId(null);
    }
  }

  const feedbackColumns = useMemo(
    () => [
      {
        key: "student",
        label: "Student Name",
        filter: { type: "text", placeholder: "Student name contains…" },
        cellStyle: { fontWeight: 600, color: "var(--color-text-primary)" },
      },
      {
        key: "college",
        label: "College",
        filter: { type: "select", options: collegeOptions, anyLabel: "All Colleges" },
        render: (row) => row.college || "—",
      },
      {
        key: "course",
        label: "Course We Provide",
        filter: { type: "select", options: courseOptions, anyLabel: "All Courses" },
        render: (row) => row.subject || row.course,
      },
      {
        key: "trainer",
        label: "Trainer",
        filter: { type: "select", options: trainerOptions, anyLabel: "All Trainers" },
      },
      {
        key: "rating",
        label: "Rating",
        filter: { type: "select", options: ratingOptions, anyLabel: "All Ratings" },
        render: (row) => <StarRating rating={row.rating} />,
      },
      {
        key: "sentiment",
        label: "Sentiment",
        filter: { type: "select", options: sentimentOptions, anyLabel: "All Sentiments" },
        render: (row) => {
          const meta = sentimentBadge[row.sentiment] || sentimentBadge.neutral;
          return <span className={`badge-pill badge-pill--${meta.tone}`}>{meta.label}</span>;
        },
      },
      {
        key: "text",
        label: "Feedback Preview",
        filter: { type: "text", label: "Feedback text", placeholder: "Feedback contains…" },
        cellStyle: {
          color: "var(--color-text-secondary)",
          fontStyle: "italic",
          fontSize: "0.85rem",
          maxWidth: "260px",
        },
        render: (row) => `"${(row.text || "").slice(0, 60)}…"`,
      },
      {
        key: "date",
        label: "Submitted Date",
        filter: { type: "date" },
      },
      {
        key: "status",
        label: "Status",
        // Status is driven by the Active / Archived tabs above the table.
        render: (row) => (
          <span
            className={`status-pill ${row.status === "archived" ? "status-pill--archived" : "status-pill--active"}`}
          >
            {row.status === "archived" ? "Archived" : "Active"}
          </span>
        ),
      },
      {
        key: "actions",
        label: "Actions",
        sortable: false,
        headerClassName: "data-table__actions-col",
        render: (row) => (
          <div className="data-table__actions">
            <button
              type="button"
              className="table-icon-btn"
              aria-label="View feedback"
              onClick={(event) => {
                event.stopPropagation();
                setActiveViewFeedback(row);
              }}
            >
              <i className="bi bi-eye" />
            </button>
            {canManage && (
              <>
                <button
                  type="button"
                  className="table-icon-btn"
                  aria-label={row.status === "archived" ? "Restore feedback" : "Archive feedback"}
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleArchive(row.id);
                  }}
                >
                  <i className={`bi ${row.status === "archived" ? "bi-arrow-counterclockwise" : "bi-archive"}`} />
                </button>
                <button
                  type="button"
                  className="table-icon-btn"
                  aria-label="Delete feedback"
                  style={{ color: "var(--color-danger)" }}
                  onClick={(event) => {
                    event.stopPropagation();
                    deleteRow(row.id);
                  }}
                >
                  <i className="bi bi-trash" />
                </button>
              </>
            )}
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [collegeOptions, courseOptions, trainerOptions, canManage]
  );

  const uploadColumns = useMemo(
    () => [
      {
        key: "filename",
        label: "Filename",
        filter: { type: "text", placeholder: "Filename contains…" },
        render: (row) => (
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-file-earmark-spreadsheet-fill" style={{ color: "#16A34A", fontSize: "1.1rem" }} />
            <span className="fw-semibold text-dark">{row.filename}</span>
          </div>
        ),
      },
      {
        key: "createdAt",
        label: "Upload Date",
        sortType: "date",
        filter: { type: "date", label: "Upload date" },
        className: "text-muted",
        render: (row) =>
          new Date(row.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
      },
      {
        key: "uploadTime",
        label: "Upload Time",
        accessor: (row) => new Date(row.createdAt).getTime(),
        sortType: "number",
        className: "text-muted",
        render: (row) =>
          new Date(row.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }),
      },
      {
        key: "totalRows",
        label: "Total Rows",
        sortType: "number",
        filter: { type: "number", label: "Total rows" },
        render: (row) => (
          <span className="badge bg-light text-dark border" style={{ fontSize: "0.8rem", fontWeight: 600 }}>
            {row.totalRows || 0} records
          </span>
        ),
      },
      {
        key: "status",
        label: "Status",
        accessor: (row) => row.status || "completed",
        filter: { type: "select" },
        render: (row) => (
          <span className="badge-pill badge-pill--green" style={{ fontSize: "0.75rem" }}>
            {row.status || "completed"}
          </span>
        ),
      },
      {
        key: "actions",
        label: "Actions",
        sortable: false,
        headerClassName: "data-table__actions-col",
        render: (row) =>
          canManage ? (
            <button
              type="button"
              className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1 rounded-pill px-3"
              style={{ fontSize: "0.75rem", fontWeight: 600 }}
              onClick={() => handleDeleteSession(row.id, row.filename)}
              disabled={deletingSessionId === row.id}
            >
              {deletingSessionId === row.id ? (
                <><div className="spinner-border spinner-border-sm" role="status" /> Deleting...</>
              ) : (
                <><i className="bi bi-trash" /> Delete</>
              )}
            </button>
          ) : (
            <span className="text-muted">—</span>
          ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deletingSessionId, canManage]
  );

  return (
    <AppLayout title="Feedback Repository">
      <div className="stat-card-grid">
        {statCards.map((card) => (
          <StatCard key={card.id} {...card} />
        ))}
      </div>

      <div className="repository-tabs">
        <div className="repository-tabs__list">
          {visibleStatusTabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              className={`repository-tabs__tab ${statusView === tab.value ? "repository-tabs__tab--active" : ""}`}
              onClick={() => handleStatusViewChange(tab.value)}
            >
              {tab.label}
              <span className="repository-tabs__count">
                {tab.value === "active" ? stats.activeCount : tab.value === "archived" ? stats.archivedCount : uploadSessions.length}
              </span>
            </button>
          ))}
        </div>

        {selectedIds.length > 0 ? (
          <div className="repository-bulk-actions d-flex align-items-center gap-2 bg-light border rounded-pill px-4 py-2" style={{ marginLeft: "auto" }}>
            <span className="text-secondary font-weight-bold me-2" style={{ fontSize: "0.8rem" }}>
              Selected: <strong>{selectedIds.length}</strong>
            </span>
            {canManage && (
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2 rounded-pill px-3"
                style={{ fontSize: "0.75rem", fontWeight: "600" }}
                onClick={archiveSelected}
              >
                <i className="bi bi-archive" />
                <span>Archive</span>
              </button>
            )}
            <button
              type="button"
              className="btn btn-sm btn-outline-success d-flex align-items-center gap-2 rounded-pill px-3"
              style={{ fontSize: "0.75rem", fontWeight: "600" }}
              onClick={exportSelected}
            >
              <i className="bi bi-download" />
              <span>Export Excel</span>
            </button>
            {canManage && (
              <button
                type="button"
                className="btn btn-sm btn-outline-danger d-flex align-items-center gap-2 rounded-pill px-3"
                style={{ fontSize: "0.75rem", fontWeight: "600" }}
                onClick={deleteSelected}
              >
                <i className="bi bi-trash" />
                <span>Delete</span>
              </button>
            )}
          </div>
        ) : null}
      </div>

      {statusView === "uploads" ? (
        /* ── Upload History Tab ── */
        <div className="panel repository-table-panel p-0 overflow-hidden">
          <DataTable
            title="Upload History"
            count={uploadSessions.length}
            icon="bi-cloud-upload"
            columns={uploadColumns}
            rows={uploadSessions}
            isLoading={isLoadingSessions}
            getRowKey={(row) => row.id}
            emptyTitle="No Excel files have been uploaded yet"
            emptyMessage="Upload a feedback Excel file from the AI Analysis page."
            search={{ placeholder: "Search uploads…" }}
          />
        </div>
      ) : (
        /* ── Active / Archived Feedback Records Tab ── */
        <div className="panel repository-table-panel p-0 overflow-hidden">
          <DataTable
            title={statusView === "archived" ? "Archived Feedback" : "Feedback Records"}
            count={totalItems}
            columns={feedbackColumns}
            rows={pageRows}
            isLoading={isLoading}
            getRowKey={(row) => row.id}
            minWidth="1200px"
            emptyTitle="No Feedback Found"
            emptyMessage="Try changing your filters or search keyword."
            onRowClick={(row, event) => {
              if (event.target.closest("button") || event.target.closest("input")) return;
              setActiveViewFeedback(row);
            }}
            search={{
              value: searchTerm,
              onChange: handleSearchChange,
              placeholder: "Search student, trainer, course…",
            }}
            filters={filters}
            onFiltersChange={handleFiltersChange}
            sort={sort}
            onSortChange={handleSortChange}
            selection={{
              selectedIds,
              onToggle: toggleSelect,
              onToggleAll: toggleSelectAll,
            }}
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
      )}

      {activeViewFeedback && (
        <div className="modal fade show" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1050 }} tabIndex="-1" role="dialog">
          <div className="modal-dialog modal-dialog-centered modal-lg" role="document">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: "12px" }}>
              <div className="modal-header bg-light border-0 py-3" style={{ borderTopLeftRadius: "12px", borderTopRightRadius: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                <h5 className="modal-title font-weight-bold text-dark d-flex align-items-center gap-2" style={{ margin: 0 }}>
                  <i className="bi bi-file-earmark-text text-primary" />
                  <span>Feedback Details - {activeViewFeedback.id}</span>
                </h5>
                <button
                  type="button"
                  className="btn-close border-0 bg-transparent text-secondary font-weight-bold ms-auto"
                  style={{ fontSize: "1.5rem", cursor: "pointer", outline: "none", lineHeight: 1 }}
                  onClick={() => setActiveViewFeedback(null)}
                  aria-label="Close"
                >
                  &times;
                </button>
              </div>
              <div className="modal-body p-4" style={{ maxHeight: "70vh", overflowY: "auto" }}>
                <div className="row g-4">
                  <div className="col-md-6 border-end">
                    <h6 className="text-secondary text-uppercase mb-3 font-weight-bold" style={{ fontSize: "0.75rem", letterSpacing: "1px" }}>Metadata</h6>
                    <div className="d-flex flex-column gap-2">
                      <div className="d-flex justify-content-between border-bottom pb-2">
                        <span className="text-muted" style={{ fontSize: "0.85rem" }}>Student Name:</span>
                        <strong className="text-dark" style={{ fontSize: "0.85rem" }}>{activeViewFeedback.student}</strong>
                      </div>
                      <div className="d-flex justify-content-between border-bottom pb-2">
                        <span className="text-muted" style={{ fontSize: "0.85rem" }}>College:</span>
                        <strong className="text-dark text-end" style={{ fontSize: "0.85rem" }}>{activeViewFeedback.college || "—"}</strong>
                      </div>
                      <div className="d-flex justify-content-between border-bottom pb-2">
                        <span className="text-muted" style={{ fontSize: "0.85rem" }}>Course We Provide:</span>
                        <strong className="text-dark text-end" style={{ fontSize: "0.85rem" }}>{activeViewFeedback.subject || activeViewFeedback.course}</strong>
                      </div>
                      <div className="d-flex justify-content-between border-bottom pb-2">
                        <span className="text-muted" style={{ fontSize: "0.85rem" }}>Degree / Department:</span>
                        <strong className="text-dark text-end" style={{ fontSize: "0.85rem" }}>{activeViewFeedback.department || "—"}</strong>
                      </div>
                      <div className="d-flex justify-content-between border-bottom pb-2">
                        <span className="text-muted" style={{ fontSize: "0.85rem" }}>Trainer:</span>
                        <strong className="text-dark" style={{ fontSize: "0.85rem" }}>{activeViewFeedback.trainer}</strong>
                      </div>
                      <div className="d-flex justify-content-between border-bottom pb-2">
                        <span className="text-muted" style={{ fontSize: "0.85rem" }}>Rating:</span>
                        <span style={{ fontSize: "0.85rem" }}><StarRating rating={activeViewFeedback.rating} /></span>
                      </div>
                      <div className="d-flex justify-content-between pb-2">
                        <span className="text-muted" style={{ fontSize: "0.85rem" }}>Submitted Date:</span>
                        <strong className="text-dark" style={{ fontSize: "0.85rem" }}>{activeViewFeedback.date}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <h6 className="text-secondary text-uppercase mb-3 font-weight-bold" style={{ fontSize: "0.75rem", letterSpacing: "1px" }}>AI Analysis & Feedback</h6>
                    
                    <div className="mb-4">
                      <span className="text-muted d-block mb-1" style={{ fontSize: "0.85rem" }}>Complete Feedback:</span>
                      <div className="p-3 rounded" style={{ fontSize: "0.85rem", fontStyle: "italic", color: "var(--color-text-primary)", background: "var(--color-bg-page)", borderLeft: "4px solid var(--color-accent-violet)" }}>
                        "{activeViewFeedback.text}"
                      </div>
                    </div>

                    <div className="mb-3 d-flex align-items-center gap-2">
                      <span className="text-muted" style={{ fontSize: "0.85rem" }}>AI Detected Sentiment:</span>
                      <span className={`badge-pill badge-pill--${
                        activeViewFeedback.sentiment === "positive" ? "green" : activeViewFeedback.sentiment === "negative" ? "red" : "amber"
                      }`}>
                        {activeViewFeedback.sentiment ? activeViewFeedback.sentiment.charAt(0).toUpperCase() + activeViewFeedback.sentiment.slice(1) : "Neutral"}
                      </span>
                    </div>

                    <div className="mb-3">
                      <span className="text-muted d-block mb-2" style={{ fontSize: "0.85rem" }}>AI Detected Keywords:</span>
                      <div className="d-flex flex-wrap" style={{ gap: "6px" }}>
                        {(activeViewFeedback.keywords && activeViewFeedback.keywords.length > 0
                          ? activeViewFeedback.keywords
                          : ["No keywords extracted"]
                        ).map((kw) => (
                          <span key={kw} style={{ fontSize: "0.72rem", fontWeight: 500, color: "var(--color-text-secondary)", backgroundColor: "var(--color-bg-page)", borderRadius: "999px", border: "1px solid var(--color-border)", padding: "4px 10px" }}>
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-muted d-block mb-2" style={{ fontSize: "0.85rem" }}>Suggested Follow-up:</span>
                      <p className="mb-0" style={{ fontSize: "0.85rem", color: "var(--color-text-primary)", background: "var(--color-bg-page)", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--color-border)" }}>
                        {activeViewFeedback.sentiment === "negative"
                          ? "Schedule a follow-up doubt-clearing session and review the flagged concerns."
                          : activeViewFeedback.sentiment === "positive"
                          ? "Maintain the current teaching methodology and share best practices."
                          : "Incorporate more interactive case studies and hands-on practice."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer bg-light border-0 py-2" style={{ borderBottomLeftRadius: "12px", borderBottomRightRadius: "12px" }}>
                <button
                  type="button"
                  className="btn btn-secondary rounded-pill px-4"
                  onClick={() => setActiveViewFeedback(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default FeedbackRepository;