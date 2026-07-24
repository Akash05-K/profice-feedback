import { useState, useEffect, useCallback } from "react";
import AppLayout from "../../components/layout/AppLayout";
import StatCard from "../../components/cards/StatCard";
import SelectDropdown from "../../components/common/SelectDropdown";
import SentimentDonutChart from "../../components/charts/SentimentDonutChart";
import SentimentLegend from "../../components/widgets/SentimentLegend";
import Pagination from "../../components/widgets/Pagination";
import api from "../../services/api";

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
  const [selectedCollege, setSelectedCollege] = useState("all");
  const [selectedCourse, setSelectedCourse] = useState("all");
  const [selectedTrainer, setSelectedTrainer] = useState("all");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [currentPage, setCurrentPage] = useState(1);

  const [collegesList, setCollegesList] = useState([{ value: "all", label: "All Colleges" }]);
  const [coursesList, setCoursesList] = useState([{ value: "all", label: "All Courses" }]);
  const [trainersList, setTrainersList] = useState([{ value: "all", label: "All Trainers" }]);

  const [records, setRecords] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const [kpis, setKpis] = useState({
    total: 0,
    avgRating: "0.0",
    satisfaction: 0,
    positivePercent: 0,
  });

  const [sentimentDistribution, setSentimentDistribution] = useState([
    { name: "Positive", value: 0, count: "0", color: "#16A34A" },
    { name: "Neutral", value: 0, count: "0", color: "#F59E0B" },
    { name: "Negative", value: 0, count: "0", color: "#EF4444" },
  ]);

  // Load cascading filter options
  const loadFilterOptions = useCallback(async () => {
    try {
      const res = await api.getFeedbackFilterOptions({
        college: selectedCollege !== "all" ? selectedCollege : undefined,
        course: selectedCourse !== "all" ? selectedCourse : undefined,
      });
      if (res.data) {
        const validColleges = res.data.colleges || ["All Colleges"];
        const validCourses = res.data.courses || ["All Courses"];
        const validTrainers = res.data.trainers || ["All Trainers"];

        setCollegesList([
          { value: "all", label: "All Colleges" },
          ...validColleges.filter((c) => c !== "All Colleges").map((c) => ({ value: c, label: c })),
        ]);
        setCoursesList([
          { value: "all", label: "All Courses" },
          ...validCourses.filter((c) => c !== "All Courses").map((c) => ({ value: c, label: c })),
        ]);
        setTrainersList([
          { value: "all", label: "All Trainers" },
          ...validTrainers.filter((t) => t !== "All Trainers").map((t) => ({ value: t, label: t })),
        ]);
      }
    } catch (e) {
      console.error("Filter options fetch error:", e);
    }
  }, [selectedCollege, selectedCourse]);

  useEffect(() => {
    loadFilterOptions();
  }, [loadFilterOptions]);

  // Fetch report data
  const fetchReportsData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.getReportsData({
        college: selectedCollege !== "all" ? selectedCollege : undefined,
        course: selectedCourse !== "all" ? selectedCourse : undefined,
        trainer: selectedTrainer !== "all" ? selectedTrainer : undefined,
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
  }, [selectedCollege, selectedCourse, selectedTrainer, startDate, endDate, searchTerm, currentPage]);

  useEffect(() => {
    fetchReportsData();
  }, [fetchReportsData]);

  const handleCollegeChange = (val) => {
    setSelectedCollege(val);
    setSelectedCourse("all");
    setSelectedTrainer("all");
    setCurrentPage(1);
  };

  const handleCourseChange = (val) => {
    setSelectedCourse(val);
    setSelectedTrainer("all");
    setCurrentPage(1);
  };

  const handleTrainerChange = (val) => {
    setSelectedTrainer(val);
    setCurrentPage(1);
  };

  const statCards = [
    { id: "total-feedback", label: "Total Reviews", value: String(kpis.total), icon: "bi-chat-square-text-fill", tone: "violet" },
    { id: "avg-rating", label: "Average Rating", value: String(kpis.avgRating), valueSuffix: "/ 5", icon: "bi-star-fill", tone: "amber" },
    { id: "satisfaction", label: "Satisfaction Score", value: `${kpis.satisfaction}%`, icon: "bi-heart-fill", tone: "green" },
    { id: "positive-percent", label: "Positive Ratio", value: `${kpis.positivePercent}%`, icon: "bi-hand-thumbs-up-fill", tone: "blue" },
  ];

  const handleExportPDF = async () => {
    try {
      const blob = await api.exportReportsPdf({
        college: selectedCollege !== "all" ? selectedCollege : undefined,
        course: selectedCourse !== "all" ? selectedCourse : undefined,
        trainer: selectedTrainer !== "all" ? selectedTrainer : undefined,
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
        college: selectedCollege !== "all" ? selectedCollege : undefined,
        course: selectedCourse !== "all" ? selectedCourse : undefined,
        trainer: selectedTrainer !== "all" ? selectedTrainer : undefined,
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
        college: selectedCollege !== "all" ? selectedCollege : undefined,
        course: selectedCourse !== "all" ? selectedCourse : undefined,
        trainer: selectedTrainer !== "all" ? selectedTrainer : undefined,
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

        {/* 3 Cascading Filter Controls: College, Course, Trainer */}
        <div className="reports-filter-grid">
          <SelectDropdown
            label="College"
            icon="bi-building"
            value={selectedCollege}
            onChange={handleCollegeChange}
            options={collegesList}
          />
          <SelectDropdown
            label="Course"
            icon="bi-journal-bookmark"
            value={selectedCourse}
            onChange={handleCourseChange}
            options={coursesList}
          />
          <SelectDropdown
            label="Trainer"
            icon="bi-person"
            value={selectedTrainer}
            onChange={handleTrainerChange}
            options={trainersList}
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
                      <th>College</th>
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
                        <td>{r.college}</td>
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
