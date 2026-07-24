import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "react-toastify";
import AppLayout from "../../components/layout/AppLayout";
import StatCard from "../../components/cards/StatCard";
import SentimentDonutChart from "../../components/charts/SentimentDonutChart";
import SentimentLegend from "../../components/widgets/SentimentLegend";
import Pagination from "../../components/widgets/Pagination";
import DataTable from "../../components/tables/DataTable";
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

const SENTIMENT_OPTIONS = [
  { value: "positive", label: "Positive" },
  { value: "neutral", label: "Neutral" },
  { value: "negative", label: "Negative" },
];

const RATING_OPTIONS = [5, 4, 3, 2, 1].map((n) => ({
  value: String(n),
  label: `${n} star${n > 1 ? "s" : ""}`,
}));

const sentimentTone = (sentiment) =>
  sentiment === "positive" ? "green" : sentiment === "negative" ? "red" : "amber";

function Reports() {
  const [filters, setFilters] = useState({});
  const [sort, setSort] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const [collegeOptions, setCollegeOptions] = useState([]);
  const [courseOptions, setCourseOptions] = useState([]);
  const [trainerOptions, setTrainerOptions] = useState([]);

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

  // Every column filter maps to a server query param so paging stays correct.
  const queryParams = useMemo(
    () => ({
      student: filters.student || undefined,
      college: filters.college || undefined,
      course: filters.course || undefined,
      trainer: filters.trainer || undefined,
      rating: filters.rating || undefined,
      sentiment: filters.sentiment || undefined,
      startDate: filters.date?.from || undefined,
      endDate: filters.date?.to || undefined,
      sortBy: sort ? `${sort.key}-${sort.dir}` : undefined,
    }),
    [filters, sort]
  );

  // Cascading options: narrowing college narrows the course and trainer lists.
  const loadFilterOptions = useCallback(async () => {
    try {
      const res = await api.getFeedbackFilterOptions({
        college: filters.college || undefined,
        course: filters.course || undefined,
      });
      if (!res.data) return;

      const toOptions = (list, allLabel) =>
        (list || [])
          .filter((item) => item !== allLabel)
          .map((item) => ({ value: item, label: item }));

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

  const fetchReportsData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.getReportsData({
        ...queryParams,
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
  }, [queryParams, currentPage]);

  useEffect(() => {
    fetchReportsData();
  }, [fetchReportsData]);

  const handleFiltersChange = (next) => {
    // Clearing a parent filter drops the narrower ones that depended on it.
    const cleaned = { ...next };
    if (cleaned.college !== filters.college) {
      delete cleaned.course;
      delete cleaned.trainer;
    } else if (cleaned.course !== filters.course) {
      delete cleaned.trainer;
    }
    setFilters(cleaned);
    setCurrentPage(1);
  };

  const handleSortChange = (next) => {
    setSort(next);
    setCurrentPage(1);
  };

  const columns = useMemo(
    () => [
      {
        key: "student",
        label: "Student",
        filter: { type: "text", placeholder: "Student name contains…" },
        className: "fw-semibold",
        cellStyle: { color: "var(--color-text-primary)" },
      },
      {
        key: "college",
        label: "College",
        filter: { type: "select", options: collegeOptions, anyLabel: "All Colleges" },
      },
      {
        key: "course",
        label: "Course",
        filter: { type: "select", options: courseOptions, anyLabel: "All Courses" },
      },
      {
        key: "trainer",
        label: "Trainer",
        filter: { type: "select", options: trainerOptions, anyLabel: "All Trainers" },
      },
      {
        key: "rating",
        label: "Rating",
        filter: { type: "select", options: RATING_OPTIONS, anyLabel: "Any rating" },
        render: (row) => <StarRating rating={row.rating} />,
      },
      {
        key: "sentiment",
        label: "Sentiment",
        filter: { type: "select", options: SENTIMENT_OPTIONS, anyLabel: "Any sentiment" },
        render: (row) => (
          <span className={`badge-pill badge-pill--${sentimentTone(row.sentiment)}`}>
            {row.sentiment ? row.sentiment.charAt(0).toUpperCase() + row.sentiment.slice(1) : "Neutral"}
          </span>
        ),
      },
      {
        key: "date",
        label: "Date",
        filter: { type: "date" },
        className: "text-muted",
      },
    ],
    [collegeOptions, courseOptions, trainerOptions]
  );

  const statCards = [
    { id: "total-feedback", label: "Total Reviews", value: String(kpis.total), icon: "bi-chat-square-text-fill", tone: "violet" },
    { id: "avg-rating", label: "Average Rating", value: String(kpis.avgRating), valueSuffix: "/ 5", icon: "bi-star-fill", tone: "amber" },
    { id: "satisfaction", label: "Satisfaction Score", value: `${kpis.satisfaction}%`, icon: "bi-heart-fill", tone: "green" },
    { id: "positive-percent", label: "Positive Ratio", value: `${kpis.positivePercent}%`, icon: "bi-hand-thumbs-up-fill", tone: "blue" },
  ];

  const downloadBlob = (blob, ext, type) => {
    const url = window.URL.createObjectURL(type ? new Blob([blob], { type }) : new Blob([blob]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Feedback_Report_${new Date().toISOString().slice(0, 10)}.${ext}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const runExport = async (fn, ext, type, label) => {
    const toastId = toast.loading(`Generating ${label}…`);
    try {
      const blob = await fn(queryParams);
      downloadBlob(blob, ext, type);
      toast.update(toastId, { render: `${label} downloaded.`, type: "success", isLoading: false, autoClose: 3000 });
    } catch (e) {
      toast.update(toastId, { render: e.message || `Failed to export ${label}.`, type: "error", isLoading: false, autoClose: 4000 });
    }
  };

  const handleExportPDF = () => runExport(api.exportReportsPdf, "pdf", "application/pdf", "PDF report");
  const handleExportExcel = () => runExport(api.exportReportsExcel, "xlsx", null, "Excel report");
  const handleExportCSV = () => runExport(api.exportReportsCsv, "csv", null, "CSV report");

  const exportButtons = (
    <>
      <button
        type="button"
        className="reports-export-btn reports-export-btn--compact reports-export-btn--pdf"
        onClick={handleExportPDF}
        disabled={records.length === 0}
        title="Export as PDF"
      >
        <i className="bi bi-file-earmark-pdf-fill" />
        <span>PDF</span>
      </button>
      <button
        type="button"
        className="reports-export-btn reports-export-btn--compact reports-export-btn--excel"
        onClick={handleExportExcel}
        disabled={records.length === 0}
        title="Export as Excel"
      >
        <i className="bi bi-file-earmark-spreadsheet-fill" />
        <span>Excel</span>
      </button>
      <button
        type="button"
        className="reports-export-btn reports-export-btn--compact reports-export-btn--csv"
        onClick={handleExportCSV}
        disabled={records.length === 0}
        title="Export as CSV"
      >
        <i className="bi bi-file-earmark-text-fill" />
        <span>CSV</span>
      </button>
    </>
  );

  return (
    <AppLayout title="Reports Generator">
      {/* KPI Cards */}
      <div className="stat-card-grid stat-card-grid--four mb-4">
        {statCards.map((card) => (
          <StatCard key={card.id} {...card} />
        ))}
      </div>

      <div className="reports-layout-grid mb-4">
        <div className="panel reports-table-panel p-0 overflow-hidden">
          <DataTable
            title="Filtered Feedback Records"
            count={totalItems}
            columns={columns}
            rows={records}
            isLoading={isLoading}
            getRowKey={(row, index) => `${row.student}-${row.date}-${index}`}
            emptyMessage="Try adjusting the column filters."
            toolbarActions={exportButtons}
            filters={filters}
            onFiltersChange={handleFiltersChange}
            sort={sort}
            onSortChange={handleSortChange}
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
