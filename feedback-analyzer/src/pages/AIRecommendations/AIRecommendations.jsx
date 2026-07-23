import React, { useState, useMemo } from "react";
import { toast } from "react-toastify";
import { jsPDF } from "jspdf";
import AppLayout from "../../components/layout/AppLayout";
import StatCard from "../../components/cards/StatCard";
import PerformancePredictionChart from "../../components/charts/PerformancePredictionChart";
import Modal from "../../components/common/Modal";
import SelectDropdown from "../../components/common/SelectDropdown";

import {
  recommendationSummaries,
  improvementSuggestions,
  riskDetections,
  performancePredictions,
  activeActionPlans as initialActionPlans,
} from "../../data/aiRecommendationsData";

const trainerOptions = [
  { value: "overall", label: "All Trainers" },
  { value: "karthik-s", label: "Karthik S" },
  { value: "priya-n", label: "Priya N" },
  { value: "arjun-d", label: "Arjun D" },
  { value: "meera-j", label: "Meera J" },
];

const periodOptions = [
  { value: "quarter", label: "01 Jun 2026 - 14 Jul 2026" },
  { value: "30-days", label: "Last 30 Days" },
  { value: "90-days", label: "Last 90 Days" },
  { value: "all-time", label: "All Time" },
];

const trainerNameMapping = {
  overall: "All Trainers",
  "karthik-s": "Karthik S",
  "priya-n": "Priya N",
  "arjun-d": "Arjun D",
  "meera-j": "Meera J",
};

function AIRecommendations() {
  const [selectedTrainer, setSelectedTrainer] = useState("overall");
  const [selectedPeriod, setSelectedPeriod] = useState("quarter");
  const [actionPlans, setActionPlans] = useState(initialActionPlans);

  // Conversion and Details modals
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(null);
  const [actionTitle, setActionTitle] = useState("");
  const [assignedTrainer, setAssignedTrainer] = useState("karthik-s");
  const [dueDate, setDueDate] = useState("2026-08-03");

  const [showRiskModal, setShowRiskModal] = useState(false);
  const [activeRisk, setActiveRisk] = useState(null);

  // Summary Metrics
  const suggestionsCount = 1000;
  const risksCount = 10;
  const predictedPerformance = "87%";
  const activePlansCount = 3;

  const statCards = [
    {
      id: "suggestions",
      label: "Improvement Suggestions",
      value: String(suggestionsCount),
      change: null,
      changeLabel: null,
      trend: "up",
      subtext: "New suggestions", 
      icon: "bi-graph-up-arrow",
      tone: "green",
    },
    {
      id: "risks",
      label: "Risk Detected",
      value: String(risksCount),
      change: null,
      changeLabel: null,
      trend: "down",
      subtext: "High risk items",
      icon: "bi-exclamation-triangle",
      tone: "red",
    },
    {
      id: "prediction",
      label: "Performance Prediction",
      value: predictedPerformance,
      change: null,
      changeLabel: null,
      trend: "up",
      subtext: "Overall performance",
      icon: "bi-bar-chart-fill",
      tone: "amber",
    },
    {
      id: "actions",
      label: "Action Plans",
      value: String(activePlansCount),
      change: null,
      changeLabel: null,
      trend: "up",
      subtext: "Active plans",
      icon: "bi-clipboard-check",
      tone: "blue",
    },
  ];

  // Convert Suggestion Action
  const handleOpenConvert = (suggestion) => {
    setActiveSuggestion(suggestion);
    setActionTitle(suggestion.title);
    setActionNotes(suggestion.description || "");
    const dateObj = new Date();
    dateObj.setDate(dateObj.getDate() + 10);
    setDueDate(dateObj.toISOString().slice(0, 10));
    setShowConvertModal(true);
  };

  const handleCreateActionPlan = () => {
    if (!actionTitle.trim()) {
      toast.error("Please provide an action plan title.");
      return;
    }

    const newPlan = {
      id: `ACT-${100 + actionPlans.length + 1}`,
      title: actionTitle.trim(),
      assignedTo: "Akash (DSA)",
      dueDate: dueDate,
      status: "In Progress",
      statusTone: "green",
    };

    setActionPlans((prev) => [newPlan, ...prev]);
    setShowConvertModal(false);
    toast.success(`Converted suggestion to Action Plan successfully!`);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF("p", "mm", "a4");
    
    // Header Banner
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, 210, 16, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(37, 99, 235);
    doc.text("AI Recommendation Engine Report", 14, 30);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text(`Scope: ${trainerNameMapping[selectedTrainer]} | Period: ${selectedPeriod === "quarter" ? "01 Jun 2026 - 14 Jul 2026" : "All Time"}`, 14, 37);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 43);

    // Separator line
    doc.setDrawColor(229, 231, 235);
    doc.line(14, 47, 196, 47);

    // Recommendation summary
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(17, 24, 39);
    doc.text("AI Recommendation Summary", 14, 55);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(55, 65, 81);
    const summaryLines = doc.splitTextToSize(recommendationSummaries[selectedTrainer], 182);
    doc.text(summaryLines, 14, 62);

    let nextY = 62 + summaryLines.length * 5 + 10;

    // Suggestions Section
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(17, 24, 39);
    doc.text("Top Improvement Suggestions", 14, nextY);
    nextY += 7;

    improvementSuggestions.forEach((s, idx) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(17, 24, 39);
      doc.text(`${idx + 1}. [Score: ${s.impactScore}/10] - ${s.title}`, 14, nextY);
      nextY += 5;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.text(`Impact Level: ${s.category}`, 18, nextY);
      nextY += 6;
    });

    nextY += 5;

    // Risks section
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(17, 24, 39);
    doc.text("Risk Assessment Warnings", 14, nextY);
    nextY += 7;

    riskDetections.forEach((r) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(r.riskLevel.includes("High") ? 220 : 217, 38, 38);
      doc.text(`[${r.riskLevel}] - ${r.title}`, 14, nextY);
      nextY += 5;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(55, 65, 81);
      const rDesc = doc.splitTextToSize(r.description, 180);
      doc.text(rDesc, 14, nextY);
      nextY += rDesc.length * 4.5 + 4;
    });

    doc.save(`AI_Recommendation_Report_${selectedTrainer}.pdf`);
    toast.success("AI Recommendations report generated and downloaded!");
  };

  const handleOpenRisk = (risk) => {
    setActiveRisk(risk);
    setShowRiskModal(true);
  };

  const handleAcknowledgeRisk = () => {
    toast.success(`Risk "${activeRisk.title}" has been acknowledged and marked for review.`);
    setShowRiskModal(false);
  };

  return (
    <AppLayout title="AI Recommendation Engine">
      
      {/* Top Selectors Toolbar */}
      <div className="d-flex align-items-center justify-content-end mb-4 flex-wrap gap-3">
        <SelectDropdown
          value={selectedTrainer}
          onChange={setSelectedTrainer}
          options={trainerOptions}
        />
        <SelectDropdown
          icon="bi-calendar3"
          value={selectedPeriod}
          onChange={setSelectedPeriod}
          options={periodOptions}
        />
      </div>

      <h3 className="fw-bold mb-3 text-start" style={{ fontSize: "1rem", color: "var(--color-text-primary)" }}>Key Insights</h3>

      {/* KPI Cards Row */}
      <div className="stat-card-grid stat-card-grid--three">
        {statCards.map((card) => (
          <StatCard key={card.id} {...card} />
        ))}
      </div>

      {/* Main Grid: Suggestions vs Risks */}
      <div className="row g-4 mb-4">
        {/* Top Improvement Suggestions */}
        <div className="col-lg-6">
          <div className="panel h-100 p-0 overflow-hidden d-flex flex-column justify-content-between" style={{ background: "#fff", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)" }}>
            <div>
              <div className="d-flex align-items-center justify-content-between p-4 border-bottom" style={{ borderColor: "var(--color-border)" }}>
                <h2 className="panel-header__title mb-0" style={{ fontSize: "1rem", fontWeight: "700" }}>Top Improvement Suggestions</h2>
                <span className="text-muted" style={{ fontSize: "0.76rem", fontWeight: "600" }}>Impact Score</span>
              </div>

              <div className="d-flex flex-column" style={{ padding: "10px 0" }}>
                {improvementSuggestions.map((item) => {
                  let badgeBg = "#fef2f2";
                  let badgeColor = "#ef4444";
                  if (item.category === "Medium") {
                    badgeBg = "#fff7ed";
                    badgeColor = "#ea580c";
                  } else if (item.category === "Low") {
                    badgeBg = "#f0fdf4";
                    badgeColor = "#15803d";
                  }

                  return (
                    <div
                      key={item.id}
                      className="d-flex align-items-center justify-content-between px-4 py-3 border-bottom-dashed"
                      style={{
                        cursor: "pointer",
                        transition: "background 0.2s"
                      }}
                      onClick={() => handleOpenConvert(item)}
                    >
                      <div className="d-flex align-items-center gap-3 pe-3">
                        <span
                          className="d-flex align-items-center justify-content-center"
                          style={{
                            width: "38px",
                            height: "38px",
                            borderRadius: "10px",
                            background: item.bg,
                            color: item.color,
                            fontSize: "1.1rem",
                            flexShrink: 0
                          }}
                        >
                          <i className={`bi ${item.icon}`} />
                        </span>
                        <span style={{ fontSize: "0.86rem", color: "var(--color-text-primary)", fontWeight: "500", lineHeight: "1.35" }}>
                          {item.title}
                        </span>
                      </div>
                      <div className="d-flex align-items-center gap-3 flex-shrink-0">
                        <span
                          className="badge-pill py-1 px-2.5"
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: "600",
                            backgroundColor: badgeBg,
                            color: badgeColor,
                            borderRadius: "20px"
                          }}
                        >
                          {item.category}
                        </span>
                        <div style={{ minWidth: "50px", textAlign: "right" }}>
                          <span style={{ fontSize: "0.95rem", fontWeight: "700", color: "var(--color-text-primary)" }}>{item.impactScore}</span>
                          <span className="text-muted" style={{ fontSize: "0.72rem" }}>/10</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-3 text-center border-top" style={{ borderColor: "var(--color-border)" }}>
              <button
                type="button"
                className="btn bg-transparent border-0 text-primary fw-semibold p-0"
                style={{ fontSize: "0.85rem" }}
                onClick={() => toast.info("Displaying all 12 improvement suggestions.")}
              >
                View All Suggestions
              </button>
            </div>
          </div>
        </div>

        {/* Risk Detection Column */}
        <div className="col-lg-6">
          <div className="panel h-100 p-0 overflow-hidden d-flex flex-column justify-content-between" style={{ background: "#fff", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)" }}>
            <div>
              <div className="p-4 border-bottom" style={{ borderColor: "var(--color-border)" }}>
                <h2 className="panel-header__title mb-0" style={{ fontSize: "1rem", fontWeight: "700" }}>Risk Detection</h2>
              </div>

              <div className="d-flex flex-column" style={{ padding: "10px 0" }}>
                {riskDetections.map((item) => {
                  let badgeBg = "#fef2f2";
                  let badgeColor = "#ef4444";
                  if (item.riskLevel.includes("Medium")) {
                    badgeBg = "#fff7ed";
                    badgeColor = "#ea580c";
                  } else if (item.riskLevel.includes("Low")) {
                    badgeBg = "#f0fdf4";
                    badgeColor = "#15803d";
                  }

                  return (
                    <div
                      key={item.id}
                      className="d-flex align-items-center justify-content-between px-4 py-3 border-bottom-dashed"
                      style={{
                        cursor: "pointer",
                        transition: "background 0.2s"
                      }}
                      onClick={() => handleOpenRisk(item)}
                    >
                      <div className="d-flex align-items-center gap-3 pe-3">
                        <span
                          className="d-flex align-items-center justify-content-center"
                          style={{
                            width: "38px",
                            height: "38px",
                            borderRadius: "10px",
                            background: item.bg,
                            color: item.color,
                            fontSize: "1.1rem",
                            flexShrink: 0
                          }}
                        >
                          <i className={`bi ${item.icon}`} />
                        </span>
                        <span style={{ fontSize: "0.86rem", color: "var(--color-text-primary)", fontWeight: "500", lineHeight: "1.35" }}>
                          {item.title}
                        </span>
                      </div>
                      <span
                        className="badge-pill py-1 px-2.5 flex-shrink-0"
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: "600",
                          backgroundColor: badgeBg,
                          color: badgeColor,
                          borderRadius: "20px"
                        }}
                      >
                        {item.riskLevel}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-3 text-center border-top" style={{ borderColor: "var(--color-border)" }}>
              <button
                type="button"
                className="btn bg-transparent border-0 text-primary fw-semibold p-0"
                style={{ fontSize: "0.85rem" }}
                onClick={() => toast.info("Opening full Risk Matrix dashboard.")}
              >
                View All Risks
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Prediction & Active Plans Row */}
      <div className="row g-4 mb-4">
        {/* Performance Prediction Curve with Tooltip Card Overlay */}
        {/* Active Action Plans Table */}
        <div className="col-lg-6">
          <div className="panel h-100 p-0 overflow-hidden d-flex flex-column justify-content-between" style={{ background: "#fff", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)" }}>
            <div>
              <div className="p-4 border-bottom" style={{ borderColor: "var(--color-border)" }}>
                <h2 className="panel-header__title mb-0" style={{ fontSize: "1rem", fontWeight: "700" }}>Active Action Plans</h2>
              </div>

              <div className="table-panel">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ fontSize: "0.78rem" }}>Action Plan</th>
                      <th style={{ fontSize: "0.78rem" }}>Owner</th>
                      <th style={{ fontSize: "0.78rem" }}>Due Date</th>
                      <th style={{ fontSize: "0.78rem" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {actionPlans.map((plan) => {
                      let btnBg = "#dcfce7";
                      let btnText = "#15803d";
                      if (plan.statusTone === "blue") {
                        btnBg = "#dbeafe";
                        btnText = "#1d4ed8";
                      } else if (plan.statusTone === "orange") {
                        btnBg = "#ffedd5";
                        btnText = "#c2410c";
                      } else if (plan.statusTone === "purple") {
                        btnBg = "#f3e8ff";
                        btnText = "#6d28d9";
                      }

                      return (
                        <tr key={plan.id}>
                          <td style={{ fontSize: "0.84rem", color: "var(--color-text-primary)" }}>{plan.title}</td>
                          <td style={{ fontSize: "0.84rem", color: "var(--color-text-secondary)" }}>{plan.assignedTo}</td>
                          <td style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)" }}>{plan.dueDate}</td>
                          <td>
                            <span
                              className="badge-pill py-0.5 px-2.5"
                              style={{
                                fontSize: "0.72rem",
                                fontWeight: "600",
                                backgroundColor: btnBg,
                                color: btnText,
                                borderRadius: "20px"
                              }}
                            >
                              {plan.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-3 text-center border-top" style={{ borderColor: "var(--color-border)" }}>
              <button
                type="button"
                className="btn bg-transparent border-0 text-primary fw-semibold p-0"
                style={{ fontSize: "0.85rem" }}
                onClick={() => toast.info("Opening Action Tracker items dashboard.")}
              >
                View All Action Plans
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* AI Recommendation Summary Bottom Card Banner */}
      <div className="panel p-4 mb-4 text-start" style={{ background: "rgba(99, 102, 241, 0.05)", border: "1px solid rgba(99, 102, 241, 0.15)", borderRadius: "var(--radius-lg)" }}>
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-4">
          <div className="d-flex align-items-center gap-4 flex-grow-1" style={{ maxWidth: "800px" }}>
            <div>
              <h3 className="fw-bold mb-1.5" style={{ fontSize: "0.95rem", color: "var(--color-text-primary)" }}>AI Recommendation Summary</h3>
              <p className="text-muted mb-0" style={{ fontSize: "0.86rem", lineHeight: "1.45" }}>
                {recommendationSummaries[selectedTrainer]}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn-primary-pill py-2.5 px-4 d-inline-flex align-items-center gap-2 flex-shrink-0"
            style={{ fontSize: "0.85rem", backgroundColor: "var(--color-primary)", color: "#fff", border: "none" }}
            onClick={handleExportPDF}
          >
            <i className="bi bi-file-earmark-arrow-down" />
            <span>Generate Full AI Report</span>
          </button>
        </div>
      </div>

      {/* Convert Suggestion to Action Modal */}
      {showConvertModal && activeSuggestion && (
        <Modal
          title="Convert AI Suggestion to Action Plan"
          onClose={() => setShowConvertModal(false)}
          footer={
            <>
              <button type="button" className="btn-secondary" onClick={() => setShowConvertModal(false)}>
                Cancel
              </button>
              <button type="button" className="btn-primary" onClick={handleCreateActionPlan}>
                Create Action Plan
              </button>
            </>
          }
        >
          <div className="d-flex flex-column gap-3 text-start">
            <p className="text-muted mb-1" style={{ fontSize: "0.82rem" }}>
              Configure operational details to resolve this AI recommendation area.
            </p>

            <div>
              <label className="form-label fw-semibold" htmlFor="actTitle">Action Plan Title</label>
              <input
                id="actTitle"
                type="text"
                className="form-control"
                value={actionTitle}
                onChange={(e) => setActionTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="form-label fw-semibold" htmlFor="actDue">Target Completion Date</label>
              <input
                id="actDue"
                type="date"
                className="form-control"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Review Risk Modal */}
      {showRiskModal && activeRisk && (
        <Modal
          title="Review AI Risk Alert"
          onClose={() => setShowRiskModal(false)}
          footer={
            <>
              <button type="button" className="btn-secondary" onClick={() => setShowRiskModal(false)}>
                Close
              </button>
              <button type="button" className="btn-primary" onClick={handleAcknowledgeRisk}>
                Acknowledge & Record Review
              </button>
            </>
          }
        >
          <div className="text-start">
            <div className="d-flex align-items-center gap-2 mb-3">
              <span className={`badge-pill`} style={{ background: "#fef2f2", color: "#ef4444", fontSize: "0.7rem", fontWeight: "600", borderRadius: "10px", padding: "2px 8px" }}>
                {activeRisk.riskLevel.toUpperCase()}
              </span>
              <span className="text-muted small">{activeRisk.targetGroup}</span>
            </div>

            <h3 className="fw-bold mb-2" style={{ fontSize: "1rem", color: "var(--color-text-primary)" }}>{activeRisk.title}</h3>
            <p className="text-muted mb-4" style={{ fontSize: "0.85rem", lineHeight: "1.4" }}>
              {activeRisk.description}
            </p>
          </div>
        </Modal>
      )}
    </AppLayout>
  );
}

export default AIRecommendations;
