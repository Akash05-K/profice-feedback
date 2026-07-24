import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../../components/layout/AppLayout";
import DataTable from "../../components/tables/DataTable";
import StatCard from "../../components/cards/StatCard";
import api from "../../services/api";

function FeedbackCollection() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("import");
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let mounted = true;
    Promise.allSettled([api.getUploadSessions(), api.getFeedbackStats()]).then(([sRes, stRes]) => {
      if (!mounted) return;
      if (sRes.status === "fulfilled" && sRes.value.data) setSessions(sRes.value.data);
      if (stRes.status === "fulfilled" && stRes.value.data) setStats(stRes.value.data);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const totalCollected = stats ? stats.total : 0;
  const positiveRate = stats && stats.total ? Math.round((stats.positive / stats.total) * 100) : 0;

  const summaryCards = [
    { id: "collected", label: "Feedback Collected", value: String(totalCollected), icon: "bi-inbox-fill", tone: "violet", subtext: "Total records" },
    { id: "campaigns", label: "Import Campaigns", value: String(sessions.length), icon: "bi-collection-fill", tone: "blue", subtext: "Files processed" },
    { id: "positive", label: "Positive Rate", value: `${positiveRate}%`, icon: "bi-emoji-smile-fill", tone: "green", subtext: "Of all feedback" },
    { id: "avg", label: "Average Rating", value: stats ? String(stats.avgRating) : "0.0", valueSuffix: "/ 5", icon: "bi-star-fill", tone: "amber", subtext: "Across campaigns" },
  ];

  const tabs = [
    { id: "import", label: "File Import (CSV/XLS)", icon: "bi-file-earmark-arrow-up" },
    { id: "builder", label: "Form Builder", icon: "bi-file-earmark-plus" },
    { id: "email", label: "Email Campaigns", icon: "bi-envelope-at" },
    { id: "qr", label: "QR & Links", icon: "bi-qr-code-scan" },
  ];

  const campaignColumns = useMemo(
    () => [
      {
        key: "filename",
        label: "Campaign / File",
        filter: { type: "text", label: "Campaign / File", placeholder: "Filename contains\u2026" },
        className: "fw-semibold",
      },
      {
        key: "channel",
        label: "Channel",
        accessor: () => "File Import",
        filter: { type: "select" },
        render: () => (
          <span className="d-flex align-items-center gap-1">
            <i className="bi bi-file-earmark-spreadsheet" /> File Import
          </span>
        ),
      },
      {
        key: "records",
        label: "Records",
        accessor: (row) => row.processedRows ?? row.totalRows,
        sortType: "number",
        filter: { type: "number", label: "Records" },
        className: "fw-bold",
        render: (row) => `${row.processedRows ?? row.totalRows} / ${row.totalRows}`,
      },
      {
        key: "status",
        label: "Status",
        filter: { type: "select" },
        render: (row) => (
          <span
            className={`badge-pill badge-pill--${row.status === "completed" ? "green" : row.status === "failed" ? "red" : "amber"}`}
          >
            {row.status}
          </span>
        ),
      },
      {
        key: "createdAt",
        label: "Created Date",
        sortType: "date",
        filter: { type: "date", label: "Created date" },
        render: (row) => new Date(row.createdAt).toISOString().slice(0, 10),
      },
      {
        key: "actions",
        label: "Actions",
        sortable: false,
        headerClassName: "data-table__actions-col",
        render: () => (
          <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => navigate("/ai-analysis")}>
            Analyze
          </button>
        ),
      },
    ],
    [navigate]
  );

  return (
    <AppLayout title="Feedback Collection">
      <div className="stat-card-grid stat-card-grid--three">
        {summaryCards.map((card) => (
          <StatCard key={card.id} {...card} />
        ))}
      </div>

      <div className="panel my-4">
        <div className="collection-tabs">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`collection-tab-btn ${activeTab === t.id ? "collection-tab-btn--active" : ""}`}
              onClick={() => setActiveTab(t.id)}
            >
              <i className={`bi ${t.icon} me-2`} />
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === "import" ? (
          <div className="p-4 text-center">
            <i className="bi bi-cloud-arrow-up" style={{ fontSize: "2.5rem", color: "var(--color-primary)" }} />
            <h3 className="fs-5 fw-bold mt-3 mb-1">Import feedback from a spreadsheet</h3>
            <p className="text-secondary mb-3" style={{ fontSize: "0.9rem" }}>
              Upload a .xlsx/.csv file to collect and AI-analyze feedback in one step.
            </p>
            <button type="button" className="btn-primary" onClick={() => navigate("/ai-analysis", { state: { triggerUpload: true } })}>
              <i className="bi bi-upload me-2" />
              Go to Upload &amp; Analyze
            </button>
          </div>
        ) : (
          <div className="border border-dashed rounded p-5 text-center text-secondary m-3">
            <i className="bi bi-tools" style={{ fontSize: "1.8rem" }} />
            <h3 className="fs-6 fw-bold mt-2 mb-0">{tabs.find((t) => t.id === activeTab)?.label}</h3>
            <p className="mb-0" style={{ fontSize: "0.85rem" }}>This collection channel is not configured yet.</p>
          </div>
        )}
      </div>

      <div className="panel p-0 overflow-hidden">
        <DataTable
          title="Recent Feedback Collection Campaigns"
          icon="bi-clock-history"
          count={sessions.length}
          columns={campaignColumns}
          rows={sessions}
          getRowKey={(row) => row.id}
          emptyTitle="No collection campaigns yet"
          emptyMessage="Import a feedback file to start."
          search={{ placeholder: "Search campaigns…" }}
        />
      </div>

    </AppLayout>
  );
}

export default FeedbackCollection;
