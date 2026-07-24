import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "react-toastify";
import { jsPDF } from "jspdf";
import AppLayout from "../../components/layout/AppLayout";
import DataTable from "../../components/tables/DataTable";
import StatCard from "../../components/cards/StatCard";
import PerformancePredictionChart from "../../components/charts/PerformancePredictionChart";
import Modal from "../../components/common/Modal";
import SelectDropdown from "../../components/common/SelectDropdown";
import api from "../../services/api";

// Category -> visual style (kept in the view; the data itself is live).
const SUGGESTION_STYLE = {
  High: { badgeBg: "#fef2f2", badgeColor: "#ef4444", icon: "bi-exclamation-circle", color: "#ef4444", bg: "#fef2f2" },
  Medium: { badgeBg: "#fff7ed", badgeColor: "#ea580c", icon: "bi-lightbulb", color: "#ea580c", bg: "#fff7ed" },
  Low: { badgeBg: "#f0fdf4", badgeColor: "#15803d", icon: "bi-check-circle", color: "#15803d", bg: "#f0fdf4" },
};
const RISK_STYLE = {
  "High Risk": { badgeBg: "#fef2f2", badgeColor: "#ef4444", icon: "bi-exclamation-triangle-fill", color: "#dc2626", bg: "#fef2f2" },
  "Medium Risk": { badgeBg: "#fff7ed", badgeColor: "#ea580c", icon: "bi-exclamation-circle-fill", color: "#d97706", bg: "#fffbeb" },
  "Low Risk": { badgeBg: "#f0fdf4", badgeColor: "#15803d", icon: "bi-info-circle-fill", color: "#059669", bg: "#ecfdf5" },
};
const STATUS_TONE = {
  open: { bg: "#ffedd5", text: "#c2410c", label: "Open" },
  "in-progress": { bg: "#dbeafe", text: "#1d4ed8", label: "In Progress" },
  completed: { bg: "#dcfce7", text: "#15803d", label: "Completed" },
  overdue: { bg: "#fee2e2", text: "#b91c1c", label: "Overdue" },
};

const EMPTY = { summary: "", suggestions: [], risks: [], predictions: [], stats: {} };

function AIRecommendations() {
  const [trainers, setTrainers] = useState([{ id: "overall", name: "All Trainers" }]);
  const [selectedTrainer, setSelectedTrainer] = useState("overall");
  const [data, setData] = useState(EMPTY);
  const [actionPlans, setActionPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showConvertModal, setShowConvertModal] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(null);
  const [actionTitle, setActionTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assignTrainerId, setAssignTrainerId] = useState("");

  const [showRiskModal, setShowRiskModal] = useState(false);
  const [activeRisk, setActiveRisk] = useState(null);

  const loadActions = useCallback(async () => {
    try {
      const res = await api.getActions({ limit: 6 });
      setActionPlans(res.data || []);
    } catch {
      setActionPlans([]);
    }
  }, []);

  const loadRecommendations = useCallback(async (trainerId) => {
    setLoading(true);
    try {
      const res = await api.getAiRecommendations(trainerId && trainerId !== "overall" ? { trainerId } : {});
      setData(res.data || EMPTY);
    } catch (e) {
      toast.error(e.message || "Failed to load AI recommendations.");
      setData(EMPTY);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    api
      .getTrainerFilterOptions()
      .then((res) => {
        if (res.data?.trainers?.length) setTrainers(res.data.trainers);
      })
      .catch(() => {});
    loadActions();
  }, [loadActions]);

  useEffect(() => {
    loadRecommendations(selectedTrainer);
  }, [selectedTrainer, loadRecommendations]);

  const trainerOptions = trainers.map((t) => ({ value: String(t.id), label: t.name }));
  const scopeLabel = data.scopeLabel || trainers.find((t) => String(t.id) === selectedTrainer)?.name || "All Trainers";

  const statCards = [
    { id: "suggestions", label: "Improvement Suggestions", value: String(data.stats?.suggestionsCount ?? 0), trend: "up", subtext: "AI generated", icon: "bi-graph-up-arrow", tone: "green" },
    { id: "risks", label: "Risks Detected", value: String(data.stats?.risksCount ?? 0), trend: "down", subtext: "Needs attention", icon: "bi-exclamation-triangle", tone: "red" },
    { id: "prediction", label: "Performance Prediction", value: data.stats?.predictedPerformance ?? "—", trend: "up", subtext: "Projected", icon: "bi-bar-chart-fill", tone: "amber" },
    { id: "actions", label: "Active Action Plans", value: String(data.stats?.activePlansCount ?? 0), trend: "up", subtext: "Open + in progress", icon: "bi-clipboard-check", tone: "blue" },
  ];

  const handleOpenConvert = (s) => {
    setActiveSuggestion(s);
    setActionTitle(s.title);
    const d = new Date();
    d.setDate(d.getDate() + 10);
    setDueDate(d.toISOString().slice(0, 10));
    setAssignTrainerId(selectedTrainer !== "overall" ? selectedTrainer : trainers.find((t) => t.id !== "overall")?.id ? String(trainers.find((t) => t.id !== "overall").id) : "");
    setShowConvertModal(true);
  };

  const handleCreateActionPlan = async () => {
    if (!actionTitle.trim()) return toast.error("Please provide an action plan title.");
    if (!assignTrainerId) return toast.error("Please select a trainer to assign.");
    const assignedTo = trainers.find((t) => String(t.id) === String(assignTrainerId))?.name;
    try {
      await api.createAction({
        title: actionTitle.trim(),
        assignedTo, // backend resolves the trainer by name
        priority: activeSuggestion?.category === "High" ? "high" : activeSuggestion?.category === "Low" ? "low" : "medium",
        dueDate,
        status: "open",
        notes: `Created from AI suggestion: ${activeSuggestion?.title || ""}`,
      });
      toast.success("Converted suggestion to a real Action Plan!");
      setShowConvertModal(false);
      loadActions();
    } catch (e) {
      toast.error(e.message || "Failed to create action plan.");
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF("p", "mm", "a4");
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, 210, 16, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(37, 99, 235);
    doc.text("AI Recommendation Engine Report", 14, 30);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text(`Scope: ${scopeLabel} | Generated: ${new Date().toLocaleString()}`, 14, 38);
    doc.setDrawColor(229, 231, 235);
    doc.line(14, 43, 196, 43);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(17, 24, 39);
    doc.text("AI Recommendation Summary", 14, 51);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(55, 65, 81);
    const lines = doc.splitTextToSize(data.summary || "No summary available.", 182);
    doc.text(lines, 14, 58);
    let y = 58 + lines.length * 5 + 8;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(17, 24, 39);
    doc.text("Top Improvement Suggestions", 14, y);
    y += 7;
    data.suggestions.forEach((s, i) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(17, 24, 39);
      doc.text(`${i + 1}. [${s.impactScore}/10 · ${s.category}] ${s.title}`, 14, y);
      y += 6;
    });
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Risk Assessment", 14, y);
    y += 7;
    data.risks.forEach((r) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(220, 38, 38);
      doc.text(`[${r.riskLevel}] ${r.title}`, 14, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(55, 65, 81);
      const rd = doc.splitTextToSize(r.description, 180);
      doc.text(rd, 14, y);
      y += rd.length * 4.5 + 4;
    });
    doc.save(`AI_Recommendations_${scopeLabel.replace(/\s+/g, "_")}.pdf`);
    toast.success("AI Recommendations report downloaded!");
  };

  const actionPlanColumns = useMemo(
    () => [
      {
        key: "title",
        label: "Action Plan",
        filter: { type: "text", placeholder: "Title contains\u2026" },
        cellStyle: { fontSize: "0.84rem", color: "var(--color-text-primary)" },
      },
      {
        key: "assignedTo",
        label: "Owner",
        filter: { type: "select" },
        cellStyle: { fontSize: "0.84rem", color: "var(--color-text-secondary)" },
      },
      {
        key: "dueDate",
        label: "Due Date",
        sortType: "date",
        filter: { type: "date", label: "Due date" },
        cellStyle: { fontSize: "0.82rem", color: "var(--color-text-secondary)" },
      },
      {
        key: "status",
        label: "Status",
        filter: { type: "select" },
        render: (row) => {
          const tone = STATUS_TONE[row.status] || STATUS_TONE.open;
          return (
            <span
              className="badge-pill"
              style={{ fontSize: "0.72rem", fontWeight: 600, backgroundColor: tone.bg, color: tone.text, borderRadius: 20, padding: "2px 10px" }}
            >
              {tone.label}
            </span>
          );
        },
      },
    ],
    []
  );

  return (
    <AppLayout title="AI Recommendation Engine">
      <div className="d-flex align-items-center justify-content-end mb-4 flex-wrap gap-3">
        <SelectDropdown value={selectedTrainer} onChange={setSelectedTrainer} options={trainerOptions} />
      </div>

      <h3 className="fw-bold mb-3 text-start" style={{ fontSize: "1rem", color: "var(--color-text-primary)" }}>
        Key Insights {loading ? <span className="text-muted" style={{ fontSize: "0.8rem", fontWeight: 400 }}>· analysing…</span> : null}
      </h3>

      <div className="stat-card-grid stat-card-grid--three">
        {statCards.map((card) => (
          <StatCard key={card.id} {...card} />
        ))}
      </div>

      <div className="row g-4 mb-4">
        {/* Suggestions */}
        <div className="col-lg-6">
          <div className="panel h-100 p-0 overflow-hidden d-flex flex-column" style={{ background: "#fff", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)" }}>
            <div className="d-flex align-items-center justify-content-between p-4 border-bottom" style={{ borderColor: "var(--color-border)" }}>
              <h2 className="panel-header__title mb-0" style={{ fontSize: "1rem", fontWeight: 700 }}>Top Improvement Suggestions</h2>
              <span className="text-muted" style={{ fontSize: "0.76rem", fontWeight: 600 }}>Impact Score</span>
            </div>
            <div className="d-flex flex-column" style={{ padding: "10px 0" }}>
              {data.suggestions.length === 0 && (
                <div className="text-muted text-center py-4" style={{ fontSize: "0.85rem" }}>{loading ? "Generating suggestions…" : "No suggestions for this scope."}</div>
              )}
              {data.suggestions.map((item) => {
                const st = SUGGESTION_STYLE[item.category] || SUGGESTION_STYLE.Medium;
                return (
                  <div key={item.id} className="d-flex align-items-center justify-content-between px-4 py-3 border-bottom-dashed" style={{ cursor: "pointer" }} onClick={() => handleOpenConvert(item)}>
                    <div className="d-flex align-items-center gap-3 pe-3">
                      <span className="d-flex align-items-center justify-content-center" style={{ width: 38, height: 38, borderRadius: 10, background: st.bg, color: st.color, fontSize: "1.1rem", flexShrink: 0 }}>
                        <i className={`bi ${st.icon}`} />
                      </span>
                      <span style={{ fontSize: "0.86rem", color: "var(--color-text-primary)", fontWeight: 500, lineHeight: 1.35 }}>{item.title}</span>
                    </div>
                    <div className="d-flex align-items-center gap-3 flex-shrink-0">
                      <span className="badge-pill py-1 px-2.5" style={{ fontSize: "0.72rem", fontWeight: 600, backgroundColor: st.badgeBg, color: st.badgeColor, borderRadius: 20 }}>{item.category}</span>
                      <div style={{ minWidth: 50, textAlign: "right" }}>
                        <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--color-text-primary)" }}>{item.impactScore}</span>
                        <span className="text-muted" style={{ fontSize: "0.72rem" }}>/10</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Risks */}
        <div className="col-lg-6">
          <div className="panel h-100 p-0 overflow-hidden d-flex flex-column" style={{ background: "#fff", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)" }}>
            <div className="p-4 border-bottom" style={{ borderColor: "var(--color-border)" }}>
              <h2 className="panel-header__title mb-0" style={{ fontSize: "1rem", fontWeight: 700 }}>Risk Detection</h2>
            </div>
            <div className="d-flex flex-column" style={{ padding: "10px 0" }}>
              {data.risks.length === 0 && (
                <div className="text-muted text-center py-4" style={{ fontSize: "0.85rem" }}>{loading ? "Scanning for risks…" : "No significant risks detected."}</div>
              )}
              {data.risks.map((item) => {
                const st = RISK_STYLE[item.riskLevel] || RISK_STYLE["Medium Risk"];
                return (
                  <div key={item.id} className="d-flex align-items-center justify-content-between px-4 py-3 border-bottom-dashed" style={{ cursor: "pointer" }} onClick={() => { setActiveRisk(item); setShowRiskModal(true); }}>
                    <div className="d-flex align-items-center gap-3 pe-3">
                      <span className="d-flex align-items-center justify-content-center" style={{ width: 38, height: 38, borderRadius: 10, background: st.bg, color: st.color, fontSize: "1.1rem", flexShrink: 0 }}>
                        <i className={`bi ${st.icon}`} />
                      </span>
                      <span style={{ fontSize: "0.86rem", color: "var(--color-text-primary)", fontWeight: 500, lineHeight: 1.35 }}>{item.title}</span>
                    </div>
                    <span className="badge-pill py-1 px-2.5 flex-shrink-0" style={{ fontSize: "0.72rem", fontWeight: 600, backgroundColor: st.badgeBg, color: st.badgeColor, borderRadius: 20 }}>{item.riskLevel}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Prediction chart + Active plans */}
      <div className="row g-4 mb-4">
        <div className="col-lg-6">
          <div className="panel h-100 p-4" style={{ background: "#fff", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)" }}>
            <h2 className="panel-header__title mb-3" style={{ fontSize: "1rem", fontWeight: 700 }}>Performance Prediction</h2>
            <PerformancePredictionChart data={data.predictions} />
          </div>
        </div>
        <div className="col-lg-6">
          <div className="panel h-100 p-0 overflow-hidden" style={{ background: "#fff", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)" }}>
            <DataTable
              title="Active Action Plans"
              count={actionPlans.length}
              columns={actionPlanColumns}
              rows={actionPlans}
              getRowKey={(row) => row.id}
              emptyTitle="No action plans yet"
              emptyMessage="Convert a suggestion above to create one."
            />
          </div>
        </div>
      </div>

      {/* Summary banner */}
      <div className="panel p-4 mb-4 text-start" style={{ background: "rgba(99, 102, 241, 0.05)", border: "1px solid rgba(99, 102, 241, 0.15)", borderRadius: "var(--radius-lg)" }}>
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-4">
          <div className="flex-grow-1" style={{ maxWidth: 800 }}>
            <h3 className="fw-bold mb-1.5" style={{ fontSize: "0.95rem", color: "var(--color-text-primary)" }}>AI Recommendation Summary</h3>
            <p className="text-muted mb-0" style={{ fontSize: "0.86rem", lineHeight: 1.45 }}>{data.summary || (loading ? "Generating summary…" : "No summary available.")}</p>
          </div>
          <button type="button" className="btn-primary-pill py-2.5 px-4 d-inline-flex align-items-center gap-2 flex-shrink-0" style={{ fontSize: "0.85rem", backgroundColor: "var(--color-primary)", color: "#fff", border: "none" }} onClick={handleExportPDF}>
            <i className="bi bi-file-earmark-arrow-down" />
            <span>Generate Full AI Report</span>
          </button>
        </div>
      </div>

      {showConvertModal && activeSuggestion && (
        <Modal
          title="Convert AI Suggestion to Action Plan"
          onClose={() => setShowConvertModal(false)}
          footer={
            <>
              <button type="button" className="btn-secondary" onClick={() => setShowConvertModal(false)}>Cancel</button>
              <button type="button" className="btn-primary" onClick={handleCreateActionPlan}>Create Action Plan</button>
            </>
          }
        >
          <div className="d-flex flex-column gap-3 text-start">
            <div>
              <label className="form-label fw-semibold" htmlFor="actTitle">Action Plan Title</label>
              <input id="actTitle" type="text" className="form-control" value={actionTitle} onChange={(e) => setActionTitle(e.target.value)} />
            </div>
            <div>
              <label className="form-label fw-semibold" htmlFor="actTrainer">Assign to Trainer</label>
              <select id="actTrainer" className="form-control" value={assignTrainerId} onChange={(e) => setAssignTrainerId(e.target.value)}>
                <option value="">Select a trainer…</option>
                {trainers.filter((t) => t.id !== "overall").map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label fw-semibold" htmlFor="actDue">Target Completion Date</label>
              <input id="actDue" type="date" className="form-control" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
        </Modal>
      )}

      {showRiskModal && activeRisk && (
        <Modal
          title="Review AI Risk Alert"
          onClose={() => setShowRiskModal(false)}
          footer={<button type="button" className="btn-primary" onClick={() => setShowRiskModal(false)}>Close</button>}
        >
          <div className="text-start">
            <div className="d-flex align-items-center gap-2 mb-3">
              <span className="badge-pill" style={{ background: "#fef2f2", color: "#ef4444", fontSize: "0.7rem", fontWeight: 600, borderRadius: 10, padding: "2px 8px" }}>{activeRisk.riskLevel.toUpperCase()}</span>
              <span className="text-muted small">{activeRisk.targetGroup}</span>
            </div>
            <h3 className="fw-bold mb-2" style={{ fontSize: "1rem", color: "var(--color-text-primary)" }}>{activeRisk.title}</h3>
            <p className="text-muted mb-0" style={{ fontSize: "0.85rem", lineHeight: 1.4 }}>{activeRisk.description}</p>
          </div>
        </Modal>
      )}
    </AppLayout>
  );
}

export default AIRecommendations;
