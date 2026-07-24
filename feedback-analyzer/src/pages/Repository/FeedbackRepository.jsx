import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import AppLayout from "../../components/layout/AppLayout";
import StatCard from "../../components/cards/StatCard";
import SearchInput from "../../components/common/SearchInput";
import SelectDropdown from "../../components/common/SelectDropdown";
import FeedbackTable from "../../components/tables/FeedbackTable";
import Pagination from "../../components/widgets/Pagination";
import api from "../../services/api";

const sentimentOptions = [
  { value: "all", label: "All Sentiments" },
  { value: "positive", label: "Positive" },
  { value: "neutral", label: "Neutral" },
  { value: "negative", label: "Negative" },
];

const ratingOptions = [
  { value: "all", label: "All Ratings" },
  { value: "5", label: "5 Stars" },
  { value: "4", label: "4 Stars" },
  { value: "3", label: "3 Stars" },
  { value: "2", label: "2 Stars" },
  { value: "1", label: "1 Star" },
];

const sortOptions = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "student-asc", label: "Student: A to Z" },
  { value: "student-desc", label: "Student: Z to A" },
  { value: "college-asc", label: "College: A to Z" },
  { value: "college-desc", label: "College: Z to A" },
  { value: "course-asc", label: "Course: A to Z" },
  { value: "course-desc", label: "Course: Z to A" },
  { value: "trainer-asc", label: "Trainer: A to Z" },
  { value: "trainer-desc", label: "Trainer: Z to A" },
  { value: "rating-high", label: "Rating: High to Low" },
  { value: "rating-low", label: "Rating: Low to High" },
  { value: "sentiment-asc", label: "Sentiment: Positive First" },
  { value: "sentiment-desc", label: "Sentiment: Negative First" },
];

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
  const [collegeFilter, setCollegeFilter] = useState("All Colleges");
  const [courseFilter, setCourseFilter] = useState("All Courses");
  const [trainerFilter, setTrainerFilter] = useState("All Trainers");

  const [availableColleges, setAvailableColleges] = useState(["All Colleges"]);
  const [availableCourses, setAvailableCourses] = useState(["All Courses"]);
  const [availableTrainers, setAvailableTrainers] = useState(["All Trainers"]);

  const [sentimentFilter, setSentimentFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  const [statusView, setStatusView] = useState("active");
  const [selectedIds, setSelectedIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeViewFeedback, setActiveViewFeedback] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Upload History state
  const [uploadSessions, setUploadSessions] = useState([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [deletingSessionId, setDeletingSessionId] = useState(null);

  // Load filter options dynamically
  const loadFilterOptions = useCallback(async () => {
    try {
      const res = await api.getFeedbackFilterOptions({
        college: collegeFilter,
        course: courseFilter,
      });
      if (res.data) {
        setAvailableColleges(res.data.colleges || ["All Colleges"]);
        setAvailableCourses(res.data.courses || ["All Courses"]);
        setAvailableTrainers(res.data.trainers || ["All Trainers"]);
      }
    } catch (e) {
      console.error("Filter options fetch error:", e);
    }
  }, [collegeFilter, courseFilter]);

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
          college: collegeFilter,
          course: courseFilter,
          trainer: trainerFilter,
          sentiment: sentimentFilter,
          rating: ratingFilter,
          search: searchTerm,
          startDate,
          endDate,
          sortBy,
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
  }, [
    collegeFilter,
    courseFilter,
    trainerFilter,
    sentimentFilter,
    ratingFilter,
    searchTerm,
    startDate,
    endDate,
    sortBy,
    statusView,
    currentPage,
  ]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Cascading step-by-step filter handlers
  const handleCollegeChange = (val) => {
    setCollegeFilter(val);
    setCourseFilter("All Courses");
    setTrainerFilter("All Trainers");
    setCurrentPage(1);
    setSelectedIds([]);
  };

  const handleCourseChange = (val) => {
    setCourseFilter(val);
    setTrainerFilter("All Trainers");
    setCurrentPage(1);
    setSelectedIds([]);
  };

  const handleTrainerChange = (val) => {
    setTrainerFilter(val);
    setCurrentPage(1);
    setSelectedIds([]);
  };

  const statCards = [
    { id: "total-feedback", label: "Total Feedback", value: String(stats.total), icon: "bi-chat-square-text-fill", tone: "violet" },
    { id: "positive-feedback", label: "Positive Feedback", value: String(stats.positive), icon: "bi-emoji-smile-fill", tone: "green" },
    { id: "neutral-feedback", label: "Neutral Feedback", value: String(stats.neutral), icon: "bi-emoji-neutral-fill", tone: "amber" },
    { id: "negative-feedback", label: "Negative Feedback", value: String(stats.negative), icon: "bi-emoji-frown-fill", tone: "red" },
    { id: "avg-rating", label: "Average Rating", value: String(stats.avgRating), valueSuffix: "/ 5", icon: "bi-star-fill", tone: "amber" },
  ];

  function updateCommonFilter(setter) {
    return (value) => {
      setter(value);
      setCurrentPage(1);
      setSelectedIds([]);
    };
  }

  function handleSortChange(field) {
    setSortBy((prev) => (prev === `${field}-asc` ? `${field}-desc` : `${field}-asc`));
    setCurrentPage(1);
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

  function markSelectedAsReviewed() {
    toast.success(`Marked ${selectedIds.length} feedback records as reviewed.`);
    setSelectedIds([]);
  }

  function handleResetFilters() {
    setSearchTerm("");
    setCollegeFilter("All Colleges");
    setCourseFilter("All Courses");
    setTrainerFilter("All Trainers");
    setSentimentFilter("all");
    setRatingFilter("all");
    setStartDate("");
    setEndDate("");
    setSortBy("newest");
    setCurrentPage(1);
    setSelectedIds([]);
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

  useEffect(() => {
    if (statusView === "uploads") {
      loadUploadSessions();
    }
  }, [statusView, loadUploadSessions]);

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

  return (
    <AppLayout title="Feedback Repository">
      <div className="stat-card-grid">
        {statCards.map((card) => (
          <StatCard key={card.id} {...card} />
        ))}
      </div>

      <div className="panel repository-toolbar" style={{ display: "flex", flexDirection: "column", gap: "12px", alignItems: "stretch" }}>
        {/* Row 1: Search & Primary Cascading Filters */}
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center", width: "100%" }}>
          <div style={{ minWidth: "240px", flex: "1 1 260px", maxWidth: "320px" }}>
            <SearchInput
              value={searchTerm}
              onChange={updateCommonFilter(setSearchTerm)}
              placeholder="Search student, trainer, course..."
            />
          </div>

          <SelectDropdown
            icon="bi-building"
            value={collegeFilter}
            onChange={handleCollegeChange}
            options={availableColleges.map((col) => ({ value: col, label: col }))}
          />

          <SelectDropdown
            icon="bi-mortarboard-fill"
            value={courseFilter}
            onChange={handleCourseChange}
            options={availableCourses.map((c) => ({
              value: c,
              label: c === "All Courses" ? "All Courses We Provide" : c,
            }))}
          />

          <SelectDropdown
            icon="bi-person"
            value={trainerFilter}
            onChange={handleTrainerChange}
            options={availableTrainers.map((tr) => ({ value: tr, label: tr }))}
          />
        </div>

        {/* Row 2: Sentiment Filter -> Rating Filter -> Sorting Filter -> Date Filter */}
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center", width: "100%" }}>
          <SelectDropdown
            value={sentimentFilter}
            onChange={updateCommonFilter(setSentimentFilter)}
            options={sentimentOptions}
          />

          <SelectDropdown
            icon="bi-star"
            value={ratingFilter}
            onChange={updateCommonFilter(setRatingFilter)}
            options={ratingOptions}
          />

          <SelectDropdown
            icon="bi-sort-down"
            value={sortBy}
            onChange={updateCommonFilter(setSortBy)}
            options={sortOptions}
          />

          <div className="d-flex align-items-center gap-2 border rounded-pill px-3 bg-white" style={{ height: "38px", borderColor: "var(--color-input-border)", background: "var(--color-bg-page)" }}>
            <span className="text-secondary" style={{ fontSize: "0.78rem", fontWeight: 500 }}>From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => updateCommonFilter(setStartDate)(e.target.value)}
              className="border-0 bg-transparent text-dark p-0"
              style={{ fontSize: "0.8rem", outline: "none" }}
            />
            <span className="text-secondary" style={{ fontSize: "0.78rem", fontWeight: 500 }}>To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => updateCommonFilter(setEndDate)(e.target.value)}
              className="border-0 bg-transparent text-dark p-0"
              style={{ fontSize: "0.8rem", outline: "none" }}
            />
          </div>

          <button
            type="button"
            className="btn btn-outline-secondary d-flex align-items-center gap-2 rounded-pill px-3"
            style={{ fontSize: "0.82rem", fontWeight: "600", height: "38px", border: "1px solid var(--color-input-border)", background: "var(--color-bg-card)" }}
            onClick={handleResetFilters}
          >
            <i className="bi bi-arrow-counterclockwise" />
            <span>Reset Filters</span>
          </button>
        </div>
      </div>

      <div className="repository-tabs">
        <div className="repository-tabs__list">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              className={`repository-tabs__tab ${statusView === tab.value ? "repository-tabs__tab--active" : ""}`}
              onClick={() => updateCommonFilter(setStatusView)(tab.value)}
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
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1.5 rounded-pill px-3"
              style={{ fontSize: "0.75rem", fontWeight: "600", border: "1px solid #ccc" }}
              onClick={archiveSelected}
            >
              <i className="bi bi-archive" />
              <span>Archive</span>
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1.5 rounded-pill px-3"
              style={{ fontSize: "0.75rem", fontWeight: "600", border: "1px solid #ccc" }}
              onClick={markSelectedAsReviewed}
            >
              <i className="bi bi-check-circle" />
              <span>Mark Reviewed</span>
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-success d-flex align-items-center gap-1.5 rounded-pill px-3"
              style={{ fontSize: "0.75rem", fontWeight: "600" }}
              onClick={exportSelected}
            >
              <i className="bi bi-download" />
              <span>Export Excel</span>
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1.5 rounded-pill px-3"
              style={{ fontSize: "0.75rem", fontWeight: "600" }}
              onClick={deleteSelected}
            >
              <i className="bi bi-trash" />
              <span>Delete</span>
            </button>
          </div>
        ) : null}
      </div>

      {statusView === "uploads" ? (
        /* ── Upload History Tab ── */
        <div className="panel repository-table-panel">
          {isLoadingSessions ? (
            <div className="p-5 text-center text-muted">
              <div className="spinner-border text-primary me-2" role="status" />
              <span>Loading upload history...</span>
            </div>
          ) : uploadSessions.length === 0 ? (
            <div className="p-5 text-center text-muted">
              <i className="bi bi-cloud-upload" style={{ fontSize: "3rem", opacity: 0.3 }} />
              <p className="mt-3" style={{ fontSize: "0.95rem" }}>No Excel files have been uploaded yet.</p>
              <p style={{ fontSize: "0.85rem" }}>Upload a feedback Excel file from the <strong>AI Analysis</strong> page.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0" style={{ fontSize: "0.85rem" }}>
                <thead className="table-light">
                  <tr>
                    <th style={{ width: "40px" }}>#</th>
                    <th><i className="bi bi-file-earmark-excel me-1" />Filename</th>
                    <th><i className="bi bi-calendar3 me-1" />Upload Date</th>
                    <th><i className="bi bi-clock me-1" />Upload Time</th>
                    <th><i className="bi bi-list-ol me-1" />Total Rows</th>
                    <th><i className="bi bi-check-circle me-1" />Status</th>
                    <th style={{ width: "120px" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {uploadSessions.map((session, idx) => (
                    <tr key={session.id}>
                      <td className="text-muted">{idx + 1}</td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <i className="bi bi-file-earmark-spreadsheet-fill" style={{ color: "#16A34A", fontSize: "1.1rem" }} />
                          <span className="fw-semibold text-dark">{session.filename}</span>
                        </div>
                      </td>
                      <td className="text-muted">{new Date(session.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                      <td className="text-muted">{new Date(session.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}</td>
                      <td>
                        <span className="badge bg-light text-dark border" style={{ fontSize: "0.8rem", fontWeight: 600 }}>
                          {session.totalRows || 0} records
                        </span>
                      </td>
                      <td>
                        <span className="badge-pill badge-pill--green" style={{ fontSize: "0.75rem" }}>
                          {session.status || "completed"}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1 rounded-pill px-3"
                          style={{ fontSize: "0.75rem", fontWeight: 600 }}
                          onClick={() => handleDeleteSession(session.id, session.filename)}
                          disabled={deletingSessionId === session.id}
                        >
                          {deletingSessionId === session.id ? (
                            <><div className="spinner-border spinner-border-sm" role="status" /> Deleting...</>
                          ) : (
                            <><i className="bi bi-trash" /> Delete</>  
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* ── Active / Archived Feedback Records Tab ── */
        <div className="panel repository-table-panel">
          {isLoading ? (
            <div className="p-5 text-center text-muted">
              <div className="spinner-border text-primary me-2" role="status" />
              <span>Loading records from MySQL database...</span>
            </div>
          ) : (
            <>
              <FeedbackTable
                rows={pageRows}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onToggleSelectAll={toggleSelectAll}
                onToggleArchive={toggleArchive}
                onDeleteRow={deleteRow}
                onViewRow={(row) => setActiveViewFeedback(row)}
                sortBy={sortBy}
                onSort={handleSortChange}
              />

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
      )}

      {activeViewFeedback && (
        <div className="modal fade show" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1050 }} tabIndex="-1" role="dialog">
          <div className="modal-dialog modal-dialog-centered modal-lg" role="document">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: "12px" }}>
              <div className="modal-header bg-light border-0 py-3" style={{ borderTopLeftRadius: "12px", borderTopRightRadius: "12px", display: "flex", justifyContent: "between", alignItems: "center", width: "100%" }}>
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
                        <strong className="text-dark text-end" style={{ fontSize: "0.85rem" }}>{activeViewFeedback.college || "PSG College of Technology"}</strong>
                      </div>
                      <div className="d-flex justify-content-between border-bottom pb-2">
                        <span className="text-muted" style={{ fontSize: "0.85rem" }}>Course We Provide:</span>
                        <strong className="text-dark text-end" style={{ fontSize: "0.85rem" }}>{activeViewFeedback.subject || activeViewFeedback.course}</strong>
                      </div>
                      <div className="d-flex justify-content-between border-bottom pb-2">
                        <span className="text-muted" style={{ fontSize: "0.85rem" }}>Degree / Department:</span>
                        <strong className="text-dark text-end" style={{ fontSize: "0.85rem" }}>{activeViewFeedback.course} ({activeViewFeedback.department || "CS"})</strong>
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
                      <div className="bg-light p-3 rounded" style={{ fontSize: "0.85rem", fontStyle: "italic", color: "#333", borderLeft: "4px solid #7c3aed" }}>
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
                      <span className="text-muted d-block mb-1.5" style={{ fontSize: "0.85rem" }}>AI Detected Keywords:</span>
                      <div className="d-flex flex-wrap gap-1.5" style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        {["teaching", "explanation", "practical", "helpful", "concepts", "support"].slice(0, activeViewFeedback.rating + 1).map((kw) => (
                          <span key={kw} className="badge bg-secondary text-dark font-weight-normal px-2.5 py-1.5" style={{ fontSize: "0.7rem", backgroundColor: "#f3f4f6", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-muted d-block mb-1" style={{ fontSize: "0.85rem" }}>Suggested Action:</span>
                      <p className="text-dark" style={{ fontSize: "0.85rem", backgroundColor: "#fafafa", padding: "8px 12px", borderRadius: "6px", border: "1px solid #eee" }}>
                        {activeViewFeedback.sentiment === "negative"
                          ? "Schedule follow-up doubt clearing session and review lab facilities."
                          : activeViewFeedback.sentiment === "positive"
                          ? "Maintain current teaching methodology and share best practices."
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