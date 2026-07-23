import React, { useState, useMemo } from "react";
import { toast } from "react-toastify";
import AppLayout from "../../components/layout/AppLayout";
import StatCard from "../../components/cards/StatCard";
import SearchInput from "../../components/common/SearchInput";
import SelectDropdown from "../../components/common/SelectDropdown";
import Pagination from "../../components/widgets/Pagination";
import Modal from "../../components/common/Modal";
import { initialIntegrations, initialSyncLogs } from "../../data/integrationsData";

const PAGE_SIZE = 5;

const statusFilterOptions = [
  { value: "all", label: "All Statuses" },
  { value: "success", label: "Success" },
  { value: "failed", label: "Failed" },
];

function Integrations() {
  const [integrations, setIntegrations] = useState(initialIntegrations);
  const [logs, setLogs] = useState(initialSyncLogs);
  const [searchTerm, setSearchTerm] = useState("");
  const [logSearchTerm, setLogSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [syncingId, setSyncingId] = useState(null);

  // Modals state
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [activeIntegration, setActiveIntegration] = useState(null);

  // Form states for Connection Modal
  const [formInputs, setFormInputs] = useState({});

  // Summary Metrics
  const totalCount = integrations.length;
  const connectedCount = integrations.filter((i) => i.connected).length;
  const totalSyncedRecords = useMemo(() => {
    return integrations.reduce((sum, item) => sum + (item.connected ? item.recordsSynced : 0), 0);
  }, [integrations]);
  const failedSyncsCount = integrations.filter((i) => i.connected && i.lastSyncStatus === "failed").length;

  const statCards = [
    { id: "total", label: "Total Integrations", value: String(totalCount), icon: "bi-cpu", tone: "violet" },
    { id: "connected", label: "Connected", value: String(connectedCount), icon: "bi-link-45deg", tone: "green" },
    { id: "records", label: "Synced Records", value: totalSyncedRecords.toLocaleString(), icon: "bi-database-fill-check", tone: "blue" },
    {
      id: "status",
      label: "System Status",
      value: failedSyncsCount > 0 ? "Attention" : "Healthy",
      icon: failedSyncsCount > 0 ? "bi-exclamation-triangle-fill" : "bi-heart-pulse-fill",
      tone: failedSyncsCount > 0 ? "amber" : "green",
    },
  ];

  // Available Integrations Filter (Search only)
  const filteredIntegrations = useMemo(() => {
    if (!searchTerm.trim()) return integrations;
    const term = searchTerm.toLowerCase().trim();
    return integrations.filter(
      (i) => i.name.toLowerCase().includes(term) || i.description.toLowerCase().includes(term)
    );
  }, [integrations, searchTerm]);

  // Activity Log filtering & pagination
  const filteredLogs = useMemo(() => {
    let result = logs;
    if (statusFilter !== "all") {
      result = result.filter((l) => l.status === statusFilter);
    }
    if (logSearchTerm.trim()) {
      const term = logSearchTerm.toLowerCase().trim();
      result = result.filter(
        (l) => l.integrationName.toLowerCase().includes(term) || l.eventType.toLowerCase().includes(term)
      );
    }
    return result;
  }, [logs, statusFilter, logSearchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageLogs = useMemo(() => {
    return filteredLogs.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  }, [filteredLogs, safePage]);

  // Handlers
  const handleConnect = (integration) => {
    setActiveIntegration(integration);
    setFormInputs({});
    setShowConnectModal(true);
  };

  const handleManage = (integration) => {
    setActiveIntegration(integration);
    setFormInputs({
      apiKey: "••••••••••••••••",
      endpointUrl: "https://api.internal-lms.edu/v1/feedback",
      spreadsheetId: "1tRvJ_y0s2eN_P15cQL8V9D_xN7pEa",
    });
    setShowManageModal(true);
  };

  const saveConnection = () => {
    // Validate inputs depending on active integration
    if (activeIntegration.id === "google-forms" && !formInputs.spreadsheetId) {
      toast.error("Please provide a valid Google Spreadsheet ID or URL.");
      return;
    }
    if (activeIntegration.id === "microsoft-forms" && !formInputs.spreadsheetId) {
      toast.error("Please provide a valid Form ID.");
      return;
    }
    if (activeIntegration.id === "moodle-lms" && (!formInputs.endpointUrl || !formInputs.apiKey)) {
      toast.error("Moodle URL and Token are required.");
      return;
    }
    if (activeIntegration.id === "rest-api" && !formInputs.endpointUrl) {
      toast.error("Webhook endpoint URL is required.");
      return;
    }

    // Connect
    setIntegrations((prev) =>
      prev.map((i) =>
        i.id === activeIntegration.id
          ? {
              ...i,
              connected: true,
              lastSyncStatus: "success",
              lastSyncTime: new Date().toISOString().slice(0, 16).replace("T", " "),
              recordsSynced: i.recordsSynced || Math.floor(Math.random() * 200) + 50,
            }
          : i
      )
    );

    // Add log
    const newLog = {
      id: `SYNC-${100 + logs.length + 1}`,
      integrationId: activeIntegration.id,
      integrationName: activeIntegration.name,
      eventType: "Integration Connected",
      recordsCount: 0,
      status: "success",
      timestamp: new Date().toISOString().slice(0, 16).replace("T", " "),
    };
    setLogs((prev) => [newLog, ...prev]);

    setShowConnectModal(false);
    toast.success(`${activeIntegration.name} connected successfully!`);
  };

  const disconnectIntegration = () => {
    setIntegrations((prev) =>
      prev.map((i) =>
        i.id === activeIntegration.id
          ? { ...i, connected: false, lastSyncStatus: "none", lastSyncTime: "Never", recordsSynced: 0 }
          : i
      )
    );

    // Add log
    const newLog = {
      id: `SYNC-${100 + logs.length + 1}`,
      integrationId: activeIntegration.id,
      integrationName: activeIntegration.name,
      eventType: "Integration Disconnected",
      recordsCount: 0,
      status: "success",
      timestamp: new Date().toISOString().slice(0, 16).replace("T", " "),
    };
    setLogs((prev) => [newLog, ...prev]);

    setShowManageModal(false);
    toast.warning(`${activeIntegration.name} integration disconnected.`);
  };

  const handleSyncNow = (integrationId) => {
    const integration = integrations.find((i) => i.id === integrationId);
    if (!integration) return;

    setSyncingId(integrationId);
    toast.info(`Triggering synchronization for ${integration.name}...`);

    setTimeout(() => {
      const isSuccess = Math.random() > 0.15; // 85% success rate
      const syncedCount = isSuccess ? Math.floor(Math.random() * 50) + 15 : 0;
      const statusText = isSuccess ? "success" : "failed";
      const syncTime = new Date().toISOString().slice(0, 16).replace("T", " ");

      setIntegrations((prev) =>
        prev.map((i) =>
          i.id === integrationId
            ? {
                ...i,
                lastSyncStatus: statusText,
                lastSyncTime: syncTime,
                recordsSynced: i.recordsSynced + syncedCount,
              }
            : i
        )
      );

      // Add log
      const newLog = {
        id: `SYNC-${100 + logs.length + 1}`,
        integrationId: integration.id,
        integrationName: integration.name,
        eventType: "Manual Feed Pull",
        recordsCount: syncedCount,
        status: statusText,
        timestamp: syncTime,
      };
      setLogs((prev) => [newLog, ...prev]);

      setSyncingId(null);
      if (isSuccess) {
        toast.success(`${integration.name} synced successfully! Imported ${syncedCount} records.`);
      } else {
        toast.error(`Sync failed for ${integration.name}. Check configuration and logs.`);
      }
    }, 1500);
  };

  const handleRefreshAllLogs = () => {
    toast.success("Synchronized activity log feeds.");
  };

  return (
    <AppLayout title="Integrations">
      {/* Stat cards */}
      <div className="stat-card-grid stat-card-grid--three">
        {statCards.map((card) => (
          <StatCard key={card.id} {...card} />
        ))}
      </div>

      {/* Toolbar & Search */}
      <div className="panel repository-toolbar">
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search available integrations..."
        />
        <div className="text-muted" style={{ fontSize: "0.85rem" }}>
          Showing {filteredIntegrations.length} of {totalCount} integrations
        </div>
      </div>

      {/* Available Integrations Cards Grid */}
      <div className="row g-4 mb-5">
        {filteredIntegrations.map((item) => (
          <div key={item.id} className="col-12 col-md-6 col-lg-4">
            <div className="panel h-100 d-flex flex-column justify-content-between p-4" style={{ border: "1px solid var(--color-card-border)", borderRadius: "var(--radius-lg)" }}>
              <div>
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <div className="d-flex align-items-center gap-3">
                    <div
                      className={`d-flex align-items-center justify-content-center`}
                      style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "12px",
                        background: item.connected ? "var(--icon-bg-blue)" : "var(--color-bg-sidebar-hover)",
                        color: item.connected ? "var(--color-primary)" : "var(--color-text-secondary)",
                        fontSize: "1.4rem",
                      }}
                    >
                      <i className={`bi ${item.icon}`} />
                    </div>
                    <div>
                      <h3 className="fw-bold mb-0" style={{ fontSize: "0.95rem", color: "var(--color-text-primary)" }}>
                        {item.name}
                      </h3>
                      <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                        {item.connected ? "Active Sync" : "Inactive"}
                      </span>
                    </div>
                  </div>
                  <span className={`badge-pill badge-pill--${item.connected ? "green" : "slate"}`} style={{ fontSize: "0.7rem" }}>
                    {item.connected ? "Connected" : "Disconnected"}
                  </span>
                </div>

                <p className="text-muted mb-3" style={{ fontSize: "0.82rem", lineHeight: "1.4", minHeight: "50px" }}>
                  {item.description}
                </p>

                {item.connected && (
                  <div className="p-2.5 rounded mb-1" style={{ background: "var(--color-bg-page)", fontSize: "0.78rem" }}>
                    <div className="d-flex justify-content-between mb-1.5">
                      <span className="text-muted">Last Sync Status:</span>
                      <strong className={item.lastSyncStatus === "failed" ? "text-danger" : "text-success"}>
                        {item.lastSyncStatus === "success" ? "Success" : item.lastSyncStatus === "failed" ? "Failed" : "Syncing"}
                      </strong>
                    </div>
                    <div className="d-flex justify-content-between mb-1.5">
                      <span className="text-muted">Sync Time:</span>
                      <strong style={{ color: "var(--color-text-primary)" }}>{item.lastSyncTime}</strong>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Total Synced:</span>
                      <strong style={{ color: "var(--color-text-primary)" }}>{item.recordsSynced} records</strong>
                    </div>
                  </div>
                )}
              </div>

              <div className="d-flex align-items-center gap-2 mt-4 pt-3 border-top" style={{ borderColor: "var(--color-border)" }}>
                {item.connected ? (
                  <>
                    <button
                      type="button"
                      className="btn w-50 py-2 rounded-pill btn-sm d-flex align-items-center justify-content-center gap-1.5"
                      style={{ fontSize: "0.8rem", border: "1px solid var(--color-border)", color: "var(--color-text-secondary)", fontWeight: "500" }}
                      onClick={() => handleManage(item)}
                    >
                      <i className="bi bi-gear" />
                      <span>Configure</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary w-50 py-2 rounded-pill btn-sm d-flex align-items-center justify-content-center gap-1.5"
                      style={{ fontSize: "0.8rem", backgroundColor: "var(--color-primary)", color: "#fff", border: "none", fontWeight: "500" }}
                      disabled={syncingId === item.id}
                      onClick={() => handleSyncNow(item.id)}
                    >
                      {syncingId === item.id ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" style={{ width: "12px", height: "12px" }} />
                          <span>Syncing...</span>
                        </>
                      ) : (
                        <>
                          <i className="bi bi-arrow-repeat" />
                          <span>Sync Now</span>
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="btn w-100 py-2 rounded-pill btn-sm d-flex align-items-center justify-content-center gap-1.5"
                    style={{ fontSize: "0.8rem", border: "1px solid var(--color-primary)", color: "var(--color-primary)", backgroundColor: "transparent", fontWeight: "500" }}
                    onClick={() => handleConnect(item)}
                  >
                    <i className="bi bi-link-45deg" />
                    <span>Connect Integration</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Integration Activity Log Section */}
      <div className="panel p-0 overflow-hidden" style={{ background: "#fff", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)" }}>
        <div className="d-flex align-items-center justify-content-between p-4 border-bottom" style={{ borderColor: "var(--color-border)" }}>
          <h2 className="panel-header__title mb-0" style={{ fontSize: "1rem" }}>Integration Activity Log</h2>
          <div className="d-flex align-items-center gap-3">
            <SearchInput
              value={logSearchTerm}
              onChange={setLogSearchTerm}
              placeholder="Search activity logs..."
            />
            <SelectDropdown
              icon="bi-funnel"
              value={statusFilter}
              onChange={setStatusFilter}
              options={statusFilterOptions}
            />
            <button type="button" className="btn-primary-pill py-1.5 px-3" style={{ fontSize: "0.82rem", display: "inline-flex", alignItems: "center", gap: "6px" }} onClick={handleRefreshAllLogs}>
              <i className="bi bi-arrow-clockwise" />
              <span>Refresh Logs</span>
            </button>
          </div>
        </div>

        <div className="table-panel">
          <table className="data-table">
            <thead>
              <tr>
                <th>Integration</th>
                <th>Sync Event Type</th>
                <th>Records Imported</th>
                <th>Status</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {pageLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="data-table__empty">
                    No activity logs match your filters.
                  </td>
                </tr>
              ) : (
                pageLogs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <div className="fw-semibold" style={{ color: "var(--color-text-primary)" }}>{log.integrationName}</div>
                      <span className="text-muted" style={{ fontSize: "0.72rem" }}>{log.integrationId}</span>
                    </td>
                    <td>{log.eventType}</td>
                    <td>
                      {log.recordsCount > 0 ? (
                        <span className="fw-bold" style={{ color: "var(--color-primary)" }}>+{log.recordsCount}</span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge-pill badge-pill--${log.status === "success" ? "green" : "red"}`}>
                        {log.status === "success" ? "Success" : "Failed"}
                      </span>
                    </td>
                    <td className="text-muted" style={{ fontSize: "0.82rem" }}>{log.timestamp}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={safePage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={filteredLogs.length}
          pageSize={PAGE_SIZE}
        />
      </div>

      {/* Connect Modal */}
      {showConnectModal && activeIntegration && (
        <Modal
          title={`Configure ${activeIntegration.name}`}
          onClose={() => setShowConnectModal(false)}
          footer={
            <>
              <button type="button" className="btn-secondary" onClick={() => setShowConnectModal(false)}>
                Cancel
              </button>
              <button type="button" className="btn-primary" onClick={saveConnection}>
                Authorize & Link
              </button>
            </>
          }
        >
          <div className="d-flex flex-column gap-3 text-start">
            <p className="text-muted" style={{ fontSize: "0.85rem" }}>
              Configure credential settings to authenticate with <strong>{activeIntegration.name}</strong>.
            </p>

            {activeIntegration.id === "google-forms" && (
              <div>
                <label className="form-label fw-semibold" htmlFor="sheetId">Google Spreadsheet ID or URL</label>
                <input
                  id="sheetId"
                  type="text"
                  className="form-control"
                  placeholder="e.g. 1tRvJ_y0s2eN_P15cQL8V9D_xN7pEa..."
                  value={formInputs.spreadsheetId || ""}
                  onChange={(e) => setFormInputs({ ...formInputs, spreadsheetId: e.target.value })}
                />
                <span className="text-muted d-block mt-1" style={{ fontSize: "0.72rem" }}>Make sure sheet permissions permit shared link readers.</span>
              </div>
            )}

            {activeIntegration.id === "microsoft-forms" && (
              <div>
                <label className="form-label fw-semibold" htmlFor="msFormId">Microsoft Form ID or Link</label>
                <input
                  id="msFormId"
                  type="text"
                  className="form-control"
                  placeholder="e.g. forms.office.com/r/v9De8e..."
                  value={formInputs.spreadsheetId || ""}
                  onChange={(e) => setFormInputs({ ...formInputs, spreadsheetId: e.target.value })}
                />
              </div>
            )}

            {activeIntegration.id === "moodle-lms" && (
              <>
                <div>
                  <label className="form-label fw-semibold" htmlFor="moodleUrl">Moodle Site URL</label>
                  <input
                    id="moodleUrl"
                    type="url"
                    className="form-control"
                    placeholder="https://moodle.your-institution.edu"
                    value={formInputs.endpointUrl || ""}
                    onChange={(e) => setFormInputs({ ...formInputs, endpointUrl: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label fw-semibold" htmlFor="moodleToken">Moodle API Web Service Token</label>
                  <input
                    id="moodleToken"
                    type="password"
                    className="form-control"
                    placeholder="Enter security token"
                    value={formInputs.apiKey || ""}
                    onChange={(e) => setFormInputs({ ...formInputs, apiKey: e.target.value })}
                  />
                </div>
              </>
            )}

            {activeIntegration.id === "rest-api" && (
              <>
                <div>
                  <label className="form-label fw-semibold" htmlFor="apiUrl">Webhook Endpoint URL</label>
                  <input
                    id="apiUrl"
                    type="url"
                    className="form-control"
                    placeholder="https://api.your-system.com/v1/feedbacks"
                    value={formInputs.endpointUrl || ""}
                    onChange={(e) => setFormInputs({ ...formInputs, endpointUrl: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label fw-semibold" htmlFor="apiKey">Authorization API Key</label>
                  <input
                    id="apiKey"
                    type="password"
                    className="form-control"
                    placeholder="Bearer token or secret string"
                    value={formInputs.apiKey || ""}
                    onChange={(e) => setFormInputs({ ...formInputs, apiKey: e.target.value })}
                  />
                </div>
              </>
            )}

            {activeIntegration.id === "hrms" && (
              <>
                <div>
                  <label className="form-label fw-semibold" htmlFor="hrmsUrl">HRMS Service API Endpoint</label>
                  <input
                    id="hrmsUrl"
                    type="url"
                    className="form-control"
                    placeholder="https://hrms.your-org.com/api"
                    value={formInputs.endpointUrl || ""}
                    onChange={(e) => setFormInputs({ ...formInputs, endpointUrl: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label fw-semibold" htmlFor="clientId">Client ID</label>
                  <input
                    id="clientId"
                    type="text"
                    className="form-control"
                    value={formInputs.spreadsheetId || ""}
                    onChange={(e) => setFormInputs({ ...formInputs, spreadsheetId: e.target.value })}
                  />
                </div>
              </>
            )}

            {activeIntegration.id === "crm" && (
              <>
                <div>
                  <label className="form-label fw-semibold" htmlFor="crmProvider">CRM System Provider</label>
                  <select
                    id="crmProvider"
                    className="form-select"
                    value={formInputs.provider || "salesforce"}
                    onChange={(e) => setFormInputs({ ...formInputs, provider: e.target.value })}
                  >
                    <option value="salesforce">Salesforce CRM</option>
                    <option value="hubspot">HubSpot CRM</option>
                    <option value="zoho">Zoho CRM</option>
                  </select>
                </div>
                <div>
                  <label className="form-label fw-semibold" htmlFor="crmClient">OAuth Client ID</label>
                  <input
                    id="crmClient"
                    type="text"
                    className="form-control"
                    value={formInputs.spreadsheetId || ""}
                    onChange={(e) => setFormInputs({ ...formInputs, spreadsheetId: e.target.value })}
                  />
                </div>
              </>
            )}
          </div>
        </Modal>
      )}

      {/* Manage Modal */}
      {showManageModal && activeIntegration && (
        <Modal
          title={`Manage Integration: ${activeIntegration.name}`}
          onClose={() => setShowManageModal(false)}
          footer={
            <>
              <button type="button" className="btn btn-outline-danger me-auto" style={{ borderRadius: "var(--radius-pill)" }} onClick={disconnectIntegration}>
                Disconnect
              </button>
              <button type="button" className="btn-secondary" onClick={() => setShowManageModal(false)}>
                Cancel
              </button>
              <button type="button" className="btn-primary" onClick={() => { setShowManageModal(false); handleSyncNow(activeIntegration.id); }}>
                Force Sync
              </button>
            </>
          }
        >
          <div className="text-start">
            <p className="mb-4 text-muted" style={{ fontSize: "0.85rem" }}>
              Connection status is active and functioning. Configure settings or disconnect link safely.
            </p>
            <div className="mb-3">
              <label className="form-label fw-semibold" htmlFor="manageApi">Token/Credentials Endpoint</label>
              <input
                id="manageApi"
                type="text"
                className="form-control"
                value={formInputs.endpointUrl || ""}
                disabled
              />
            </div>
            <div>
              <label className="form-label fw-semibold" htmlFor="manageKey">Secret API Access Key</label>
              <input
                id="manageKey"
                type="password"
                className="form-control"
                value={formInputs.apiKey || ""}
                disabled
              />
            </div>
          </div>
        </Modal>
      )}
    </AppLayout>
  );
}

export default Integrations;
