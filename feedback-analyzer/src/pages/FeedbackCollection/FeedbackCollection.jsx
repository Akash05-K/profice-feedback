import { useState } from "react";
import { toast } from "react-toastify";
import AppLayout from "../../components/layout/AppLayout";
import StatCard from "../../components/cards/StatCard";
import {
  feedbackCollectionSummary,
  mockBatches,
  mockCourses,
  mockTrainers,
  predefinedTemplates,
  mockRecentCampaigns,
  mockLmsIntegrations,
  mockEmailCampaignLogs,
} from "../../data/feedbackCollectionData";

function FeedbackCollection() {
  const [activeTab, setActiveTab] = useState("builder");

  const [campaigns, setCampaigns] = useState(mockRecentCampaigns);
  return (
    <AppLayout title="Feedback Collection">
      {/* 1. Summary KPIs Row */}
      <div className="stat-card-grid stat-card-grid--three">
        {feedbackCollectionSummary.map((card) => (
          <StatCard key={card.id} {...card} />
        ))}
      </div>

      {/* 2. Main Collection Workspace (Tabbed panel) */}
      <div className="panel my-4">
        <div className="collection-tabs">
          <button
            type="button"
            className={`collection-tab-btn ${activeTab === "builder" ? "collection-tab-btn--active" : ""}`}
            onClick={() => setActiveTab("builder")}
          >
            <i className="bi bi-file-earmark-plus me-2" />
            Form Builder
          </button>
          <button
            type="button"
            className={`collection-tab-btn ${activeTab === "email" ? "collection-tab-btn--active" : ""}`}
            onClick={() => setActiveTab("email")}
          >
            <i className="bi bi-envelope-at me-2" />
            Email Campaigns
          </button>
          <button
            type="button"
            className={`collection-tab-btn ${activeTab === "qr" ? "collection-tab-btn--active" : ""}`}
            onClick={() => setActiveTab("qr")}
          >
            <i className="bi bi-qr-code-scan me-2" />
            QR & Links
          </button>
          <button
            type="button"
            className={`collection-tab-btn ${activeTab === "import" ? "collection-tab-btn--active" : ""}`}
            onClick={() => setActiveTab("import")}
          >
            <i className="bi bi-file-earmark-arrow-up me-2" />
            File Import (CSV/XLS)
          </button>
          <button
            type="button"
            className={`collection-tab-btn ${activeTab === "integrations" ? "collection-tab-btn--active" : ""}`}
            onClick={() => setActiveTab("integrations")}
          >
            <i className="bi bi-cpu-fill me-2" />
            LMS Sync Settings
          </button>
        </div>

        {/* TAB: FORM BUILDER */}
        {activeTab === "builder" && (
          <div className="border border-dashed rounded p-5 text-center text-secondary">
            <h3 className="fs-5 fw-bold mb-0">form builder</h3>
          </div>
        )}

        {/* TAB: EMAIL CAMPAIGNS */}
        {activeTab === "email" && (
          <div className="border border-dashed rounded p-5 text-center text-secondary">
            <h3 className="fs-5 fw-bold mb-0">email</h3>
          </div>
        )}

        {/* TAB: QR CODE & LINKS */}
        {activeTab === "qr" && (
          <div className="border border-dashed rounded p-5 text-center text-secondary">
            <h3 className="fs-5 fw-bold mb-0">QR and Links</h3>
          </div>
        )}

        {/* TAB: CSV IMPORT */}
        {activeTab === "import" && (
          <div className="border border-dashed rounded p-5 text-center text-secondary">
            <h3 className="fs-5 fw-bold mb-0">File import (CSV/XLS)</h3>
          </div>
        )}

        {/* TAB: LMS INTEGRATION */}
        {activeTab === "integrations" && (
          <div className="border border-dashed rounded p-5 text-center text-secondary">
            <h3 className="fs-5 fw-bold mb-0">LMS Sync Settings</h3>
          </div>
        )}
      </div>

      {/* 3. Recent Campaigns History Table */}
      <div className="panel">
        <div className="panel-header">
          <h2 className="panel-header__title">
            <i className="bi bi-clock-history me-2" />
            Recent Feedback Collection Campaigns
          </h2>
        </div>

        <div className="table-panel">
          <table className="data-table">
            <thead>
              <tr>
                <th>Survey Name</th>
                <th>Channel</th>
                <th>Target Mapping Details</th>
                <th>Responses</th>
                <th>Status</th>
                <th>Created Date</th>
                <th className="data-table__actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((camp) => (
                <tr key={camp.id}>
                  <td className="fw-semibold">{camp.title}</td>
                  <td>
                    <span className="d-flex align-items-center gap-1">
                      <i className={`bi ${
                        camp.channel === "Email" ? "bi-envelope" :
                        camp.channel === "QR Code" ? "bi-qr-code" :
                        camp.channel === "LMS Sync" ? "bi-mortarboard" : "bi-file-earmark-spreadsheet"
                      }`} />
                      {camp.channel}
                    </span>
                  </td>
                  <td className="fs-7 text-secondary">{camp.target}</td>
                  <td className="fw-bold">{camp.responsesCount} / {camp.totalCount}</td>
                  <td>
                    <span className={`badge-pill badge-pill--${
                      camp.status === "active" ? "green" :
                      camp.status === "completed" ? "blue" : "amber"
                    }`}>
                      {camp.status}
                    </span>
                  </td>
                  <td>{camp.date}</td>
                  <td>
                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => handleToggleCampaignStatus(camp.id)}
                      >
                        {camp.status === "active" ? "Pause" : "Activate"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => toast.success(`Reminders sent for campaign: ${camp.title}`)}
                        disabled={camp.status !== "active"}
                      >
                        Remind
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}

export default FeedbackCollection;
