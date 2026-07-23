import { useState, useEffect, useCallback } from "react";
import AppLayout from "../../components/layout/AppLayout";
import StatCard from "../../components/cards/StatCard";
import SelectDropdown from "../../components/common/SelectDropdown";
import SentimentDonutChart from "../../components/charts/SentimentDonutChart";
import SentimentLegend from "../../components/widgets/SentimentLegend";
import Pagination from "../../components/widgets/Pagination";
import api from "../../services/api";
import { feedbackRecords as fallbackRecords } from "../../data/feedbackRepositoryData";

function StarRating({ rating }) {
  return (
    <span className="star-rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <i
          key={star}
          className={`bi ${star <= rating ? "bi-star-fill" : "bi-star"} star-rating__star`}
        />
      ))}
    </span>
  );
}

const PAGE_SIZE = 5;

function Reports() {
  const [selectedTrainer, setSelectedTrainer] = useState("all");
  const [selectedCourse, setSelectedCourse] = useState("all");
  const [selectedBatch, setSelectedBatch] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");

  const [trainersList, setTrainersList] = useState([{ value: "all", label: "All Trainers" }]);
  const [coursesList, setCoursesList] = useState([{ value: "all", label: "All Courses" }]);
  const [batchesList, setBatchesList] = useState([{ value: "all", label: "All Batches" }]);

  const [records, setRecords] = useState(fallbackRecords.slice(0, 5));
  const [totalItems, setTotalItems] = useState(fallbackRecords.length);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const [kpis, setKpis] = useState({
    total: fallbackRecords.length,
    avgRating: "4.4",
    satisfaction: 88,
    positivePercent: 78,
  });

  const [sentimentDistribution, setSentimentDistribution] = useState([
    { name: "Positive", value: 78, count: "12", color: "#16A34A" },
    { name: "Neutral", value: 15, count: "2", color: "#F59E0B" },
    { name: "Negative", value: 7, count: "1", color: "#EF4444" },
  ]);

  // Load dropdown options
  useEffect(() => {
    async function loadFilterOptions() {
      try {
        const res = await api.getFeedbackFilterOptions();
        if (res.data) {
          setTrainersList([
            { value: "all", label: "All Trainers" },
            ...res.data.trainers.filter((t) => t !== "All Trainers").map((t) => ({ value: t, label: t })),
          ]);
          setCoursesList([
            { value: "all", label: "All Courses" },
            ...res.data.courses.filter((c) => c !== "All Courses").map((c) => ({ value: c, label: c })),
          ]);
        }
      } catch (e) {
        console.error("Filter options fetch error:", e);
      }
    }
    loadFilterOptions();
  }, []);

  // Fetch report data
  const fetchReportsData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.getReportsData({
        trainer: selectedTrainer !== "all" ? selectedTrainer : undefined,
        course: selectedCourse !== "all" ? selectedCourse : undefined,
        batch: selectedBatch !== "all" ? selectedBatch : undefined,
        startDate,
        endDate,
        search: searchTerm,
        page: currentPage,
        limit: PAGE_SIZE,
      });

      if (res.data) {
        setRecords(res.data.records);
        setKpis(res.data.kpis);
        setSentimentDistribution(res.data.sentimentDistribution);
        if (res.data.pagination) {
          setTotalItems(res.data.pagination.total);
          setTotalPages(res.data.pagination.totalPages);
        }
      }
    } catch (e) {
      console.error("Fetch reports error:", e);
    } finally {
      setIsLoading(false);
    }
  }, [selectedTrainer, selectedCourse, selectedBatch, startDate, endDate, searchTerm, currentPage]);

  useEffect(() => {
    fetchReportsData();
  }, [fetchReportsData]);

  const statCards = [
    { id: "total-feedback", label: "Total Reviews", value: String(kpis.total), icon: "bi-chat-square-text-fill", tone: "violet" },
    { id: "avg-rating", label: "Average Rating", value: String(kpis.avgRating), valueSuffix: "/ 5", icon: "bi-star-fill", tone: "amber" },
    { id: "satisfaction", label: "Satisfaction Score", value: `${kpis.satisfaction}%`, icon: "bi-heart-fill", tone: "green" },
    { id: "positive-percent", label: "Positive Ratio", value: `${kpis.positivePercent}%`, icon: "bi-hand-thumbs-up-fill", tone: "blue" },
  ];

  const handleExportPDF = async () => {
    try {
      const blob = await api.exportReportsPdf({
        trainer: selectedTrainer !== "all" ? selectedTrainer : undefined,
        course: selectedCourse !== "all" ? selectedCourse : undefined,
        batch: selectedBatch !== "all" ? selectedBatch : undefined,
      });
      const url = window.URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Feedback_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      console.error("PDF export error:", e);
    }
  };

  const handleExportExcel = async () => {
    try {
      const blob = await api.exportReportsExcel({
        trainer: selectedTrainer !== "all" ? selectedTrainer : undefined,
        course: selectedCourse !== "all" ? selectedCourse : undefined,
        batch: selectedBatch !== "all" ? selectedBatch : undefined,
      });
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Feedback_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      console.error("Excel export error:", e);
    }
  };

  const handleExportCSV = async () => {
    try {
      const blob = await api.exportReportsCsv({
        trainer: selectedTrainer !== "all" ? selectedTrainer : undefined,
        course: selectedCourse !== "all" ? selectedCourse : undefined,
        batch: selectedBatch !== "all" ? selectedBatch : undefined,
      });
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Feedback_Report_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      console.error("CSV export error:", e);
    }
  };

  return (
    <AppLayout title="Reports Generator">
      {/* Control Panel Section */}
      <div className="panel reports-control-panel">
        <div className="reports-subfilters" style={{ borderBottom: "1px solid var(--color-border)", paddingBottom: "16px" }}>
          <div className="reports-export-group">
            <button
              type="button"
              className="reports-export-btn reports-export-btn--pdf"
              onClick={handleExportPDF}
              disabled={records.length === 0}
            >
              <i className="bi bi-file-earmark-pdf-fill" />
              <span>Export PDF</span>
            </button>
            <button
              type="button"
              className="reports-export-btn reports-export-btn--excel"
              onClick={handleExportExcel}
              disabled={records.length === 0}
            >
              <i className="bi bi-file-earmark-spreadsheet-fill" />
              <span>Export Excel</span>
            </button>
            <button
              type="button"
              className="reports-export-btn reports-export-btn--csv"
              onClick={handleExportCSV}
              disabled={records.length === 0}
            >
              <i className="bi bi-file-earmark-text-fill" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="reports-filter-grid">
          <SelectDropdown
            label="Trainer"
            icon="bi-person"
            value={selectedTrainer}
            onChange={(val) => { setSelectedTrainer(val); setCurrentPage(1); }}
            options={trainersList}
          />
          <SelectDropdown
            label="Course"
            icon="bi-journal-bookmark"
            value={selectedCourse}
            onChange={(val) => { setSelectedCourse(val); setCurrentPage(1); }}
            options={coursesList}
          />
          <SelectDropdown
            label="Batch"
            icon="bi-people"
            value={selectedBatch}
            onChange={(val) => { setSelectedBatch(val); setCurrentPage(1); }}
            options={batchesList}
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stat-card-grid stat-card-grid--four mb-4">
        {statCards.map((card) => (
          <StatCard key={card.id} {...card} />
        ))}
      </div>

      {/* Main Content Layout */}
      <div className="reports-layout-grid mb-4">
        {/* Left Column: Detailed Records Table */}
        <div className="panel reports-table-panel p-0 overflow-hidden">
          <div className="panel-header p-3 border-bottom d-flex justify-content-between align-items-center">
            <h2 className="panel-header__title m-0" style={{ fontSize: "1rem" }}>
              Filtered Feedback Records ({totalItems})
            </h2>
          </div>

          {isLoading ? (
            <div className="p-4 text-center text-muted">
              <div className="spinner-border text-primary me-2" role="status" />
              <span>Loading reports...</span>
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0" style={{ fontSize: "0.85rem" }}>
                  <thead className="table-light">
                    <tr>
                      <th>Student</th>
                      <th>Course</th>
                      <th>Trainer</th>
                      <th>Rating</th>
                      <th>Sentiment</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r, i) => (
                      <tr key={i}>
                        <td className="fw-semibold">{r.student}</td>
                        <td>{r.course}</td>
                        <td>{r.trainer}</td>
                        <td><StarRating rating={r.rating} /></td>
                        <td>
                          <span className={`badge-pill badge-pill--${r.sentiment === "positive" ? "green" : r.sentiment === "negative" ? "red" : "amber"}`}>
                            {r.sentiment ? r.sentiment.charAt(0).toUpperCase() + r.sentiment.slice(1) : "Neutral"}
                          </span>
                        </td>
                        <td className="text-muted">{r.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

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

        {/* Right Column: Sentiment Share Chart */}
        <div className="panel sentiment-card">
          <div className="panel-header">
            <h2 className="panel-header__title">Report Sentiment Share</h2>
          </div>
          <SentimentDonutChart data={sentimentDistribution} total={String(kpis.total)} />
          <SentimentLegend data={sentimentDistribution} />
        </div>
      </div>
    </AppLayout>
  );
}

export default Reports;
