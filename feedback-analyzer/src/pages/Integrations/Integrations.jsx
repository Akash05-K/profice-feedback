import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import AppLayout from "../../components/layout/AppLayout";
import StatCard from "../../components/cards/StatCard";
import DataTable from "../../components/tables/DataTable";
import api from "../../services/api";

// The only truly-wired integration in this app is spreadsheet import. Others are
// shown honestly as "Not connected" rather than faking a live connection.
const OTHER_INTEGRATIONS = [
  { id: "moodle", name: "Moodle LMS", desc: "Sync course rosters and feedback forms", icon: "bi-mortarboard-fill", tone: "#2563eb" },
  { id: "sheets", name: "Google Sheets", desc: "Pull responses from linked sheets", icon: "bi-file-earmark-spreadsheet-fill", tone: "#16a34a" },
  { id: "slack", name: "Slack Alerts", desc: "Push negative-feedback alerts to a channel", icon: "bi-slack", tone: "#7c3aed" },
  { id: "zapier", name: "Zapier", desc: "Automate workflows across 5000+ apps", icon: "bi-lightning-charge-fill", tone: "#ea580c" },
];

function Integrations() {
  const navigate = useNavigate();
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

  const recordsSynced = stats ? stats.total : 0;
  const lastSync = sessions.length ? new Date(sessions[0].createdAt).toLocaleString() : "Never";
  const connectedCount = 1; // Excel/CSV import
  const totalCount = OTHER_INTEGRATIONS.length + 1;

  const statCards = [
    { id: "total", label: "Available Integrations", value: String(totalCount), icon: "bi-plug-fill", tone: "violet", subtext: "Data sources" },
    { id: "connected", label: "Connected", value: String(connectedCount), icon: "bi-check-circle-fill", tone: "green", subtext: "Active now" },
    { id: "records", label: "Records Synced", value: String(recordsSynced), icon: "bi-database-fill-check", tone: "blue", subtext: "All time" },
    { id: "status", label: "System Status", value: "Operational", icon: "bi-activity", tone: "amber", subtext: "All systems go" },
  ];

  const activityColumns = useMemo(
    () => [
      {
        key: "source",
        label: "Source",
        accessor: () => "Excel / CSV Import",
        filter: { type: "select" },
        className: "fw-semibold",
        render: () => (
          <>
            <i className="bi bi-file-earmark-spreadsheet me-2" />
            Excel / CSV Import
          </>
        ),
      },
      {
        key: "filename",
        label: "Activity",
        filter: { type: "text", label: "Activity", placeholder: "Filename contains…" },
        className: "text-secondary",
        cellStyle: { fontSize: "0.85rem" },
        render: (row) => `Imported \u201c${row.filename}\u201d`,
      },
      {
        key: "records",
        label: "Records",
        accessor: (row) => row.processedRows ?? row.totalRows,
        sortType: "number",
        filter: { type: "number", label: "Records" },
        className: "fw-bold",
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
        label: "When",
        sortType: "date",
        filter: { type: "date", label: "When" },
        cellStyle: { fontSize: "0.83rem" },
        render: (row) => new Date(row.createdAt).toLocaleString(),
      },
    ],
    []
  );

  return (
    <AppLayout title="Integrations">
      <div className="stat-card-grid stat-card-grid--three">
        {statCards.map((c) => (
          <StatCard key={c.id} {...c} />
        ))}
      </div>

      {/* Integration cards */}
      <div className="row g-4 my-1">
        {/* Connected: Excel/CSV import */}
        <div className="col-md-6 col-lg-4">
          <div className="panel h-100 p-4 d-flex flex-column" style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)" }}>
            <div className="d-flex align-items-center justify-content-between mb-3">
              <span className="d-flex align-items-center justify-content-center" style={{ width: 46, height: 46, borderRadius: 12, background: "#eff6ff", color: "#2563eb", fontSize: "1.4rem" }}>
                <i className="bi bi-file-earmark-arrow-up-fill" />
              </span>
              <span className="badge-pill badge-pill--green">Connected</span>
            </div>
            <h3 className="fw-bold mb-1" style={{ fontSize: "1rem" }}>Excel / CSV Import</h3>
            <p className="text-secondary mb-3" style={{ fontSize: "0.85rem" }}>Bulk-import and AI-analyze feedback from spreadsheets.</p>
            <div className="mt-auto" style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>
              <div className="d-flex justify-content-between"><span>Records synced</span><span className="fw-semibold">{recordsSynced}</span></div>
              <div className="d-flex justify-content-between"><span>Last sync</span><span className="fw-semibold">{lastSync}</span></div>
            </div>
            <button type="button" className="btn-primary mt-3" onClick={() => navigate("/ai-analysis", { state: { triggerUpload: true } })}>
              <i className="bi bi-upload me-2" /> Import Now
            </button>
          </div>
        </div>

        {/* Not connected */}
        {OTHER_INTEGRATIONS.map((it) => (
          <div className="col-md-6 col-lg-4" key={it.id}>
            <div className="panel h-100 p-4 d-flex flex-column" style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", opacity: 0.92 }}>
              <div className="d-flex align-items-center justify-content-between mb-3">
                <span className="d-flex align-items-center justify-content-center" style={{ width: 46, height: 46, borderRadius: 12, background: "#f3f4f6", color: it.tone, fontSize: "1.4rem" }}>
                  <i className={`bi ${it.icon}`} />
                </span>
                <span className="badge-pill badge-pill--amber">Not connected</span>
              </div>
              <h3 className="fw-bold mb-1" style={{ fontSize: "1rem" }}>{it.name}</h3>
              <p className="text-secondary mb-3" style={{ fontSize: "0.85rem" }}>{it.desc}</p>
              <button
                type="button"
                className="btn btn-outline-secondary mt-auto"
                onClick={() => toast.info(`${it.name} integration is not configured in this environment.`)}
              >
                <i className="bi bi-plug me-2" /> Connect
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Real activity log = upload sessions */}
      <div className="panel mt-4 p-0 overflow-hidden">
        <DataTable
          title="Integration Activity Log"
          icon="bi-clock-history"
          count={sessions.length}
          columns={activityColumns}
          rows={sessions}
          getRowKey={(row) => row.id}
          emptyTitle="No sync activity yet"
          emptyMessage="Import a feedback file to see it here."
          search={{ placeholder: "Search activity…" }}
        />
      </div>

    </AppLayout>
  );
}

export default Integrations;
