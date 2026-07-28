import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../services/api";
import AppLayout from "../../components/layout/AppLayout";
import SelectDropdown from "../../components/common/SelectDropdown";
import { useAuth } from "../../context/AuthContext";
import { CAP } from "../../lib/permissions";


import SentimentDonutChart from "../../components/charts/SentimentDonutChart";
import SentimentLegend from "../../components/widgets/SentimentLegend";
import CapabilityCard from "../../components/widgets/CapabilityCard";
import KeywordCloud from "../../components/widgets/KeywordCloud";
import RecommendedActions from "../../components/widgets/RecommendedActions";
import AISummaryCard from "../../components/widgets/AISummaryCard";
import AIInsightIllustration from "../../components/common/AIInsightIllustration";
import {
  overallSentiment,
  totalAnalyzed,
  topKeywords,
  recommendedActions,
} from "../../data/aiAnalysisData";

const capabilities = [
  { id: "sentiment", icon: "bi-emoji-smile-fill", title: "Sentiment Analysis", subtitle: "Analyze feedback sentiment", tone: "violet" },
  { id: "emotion", icon: "bi-grid-3x3-gap-fill", title: "Emotion Detection", subtitle: "Detect emotions in text", tone: "green" },
  { id: "topic", icon: "bi-diagram-3-fill", title: "Topic Classification", subtitle: "Find feedback categories", tone: "amber" },
  { id: "keyword", icon: "bi-file-earmark-text-fill", title: "Keyword Extraction", subtitle: "Extract important keywords", tone: "teal" },
  { id: "duplicate", icon: "bi-shield-check", title: "Duplicate Detection", subtitle: "Remove duplicates & spam", tone: "blue" },
];

function AIAnalysis() {


  const { hasCapability } = useAuth();
  // Management (CEO/MD) reads analyses but never uploads. The backend enforces
  // the same rule on POST /upload/analyze.
  const canUpload = hasCapability(CAP.UPLOAD_FEEDBACK);
  // Management has no Action Tracker at all, so don't offer a link into it.
  const canViewActions = hasCapability(CAP.VIEW_ACTIONS);

  const location = useLocation();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [analyzedCount, setAnalyzedCount] = useState(totalAnalyzed);
  const [sentimentData, setSentimentData] = useState(overallSentiment);
  const [keywords, setKeywords] = useState(topKeywords);
  const [actions, setActions] = useState(recommendedActions);
  const [summary, setSummary] = useState("Select or upload a feedback file to generate an AI summary.");
  const [confidence, setConfidence] = useState({ value: "—", label: "Awaiting analysis" });
  const [model, setModel] = useState({ model: "—" });

  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");

  const loadSessions = async (autoSelectId = null) => {
    // /upload/sessions requires UPLOAD_FEEDBACK — skip rather than fire a call
    // that is guaranteed to 403 for read-only roles.
    if (!canUpload) return;
    try {
      const res = await api.getUploadSessions();
      if (res.data && res.data.length > 0) {
        setSessions(res.data);
        const targetId = autoSelectId || res.data[0].id;
        setSelectedSessionId(String(targetId));
      }
    } catch (e) {
      console.error("Failed to load upload sessions:", e);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessionAnalysis = async (sessionId) => {
    if (!sessionId) return;
    try {
      const res = await api.getUploadSessionAnalysis(sessionId);
      if (res.data) {
        setAnalyzedCount(res.data.analyzedCount);
        if (res.data.sentimentData) setSentimentData(res.data.sentimentData);
        if (res.data.keywords) setKeywords(res.data.keywords);
        if (res.data.actions) setActions(res.data.actions);
        if (res.data.summary) setSummary(res.data.summary);
        if (res.data.aiConfidence) setConfidence(res.data.aiConfidence);
        if (res.data.model) {
          setModel({
            model: res.data.model,
            generatedOn: res.data.createdAt ? new Date(res.data.createdAt).toLocaleDateString() : undefined,
          });
        }
      }
    } catch (e) {
      console.error("Failed to load session analysis:", e);
    }
  };

  useEffect(() => {
    if (selectedSessionId) {
      loadSessionAnalysis(selectedSessionId);
    }
  }, [selectedSessionId]);

  const handleUploadClick = () => {
    // The input is not rendered for read-only roles, and a deep link from the
    // dashboard's quick actions can still reach this.
    if (!fileInputRef.current) return;
    fileInputRef.current.click();
  };

  useEffect(() => {
    if (location.state?.triggerUpload) {
      handleUploadClick();
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const [isUploading, setIsUploading] = useState(false);

  const handleExcelUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const toastId = toast.loading("Uploading feedback file to database...");

    try {
      const res = await api.uploadExcel(file);
      const data = res.data;

      toast.update(toastId, {
        render: `Saved ${data.analyzedCount} feedback records.`,
        type: "success",
        isLoading: false,
        autoClose: 4000,
      });

      // Names not already in this program were added rather than matched
      // against another program's records — worth flagging in case the wrong
      // spreadsheet was picked.
      const added = [...(data.newTrainers || []), ...(data.newCourses || [])];
      if (added.length > 0) {
        toast.info(`Added to your program: ${added.join(", ")}. Check this is the right file.`, {
          autoClose: 8000,
        });
      }

      if (data.uploadSessionId) {
        await loadSessions(data.uploadSessionId);
      }
    } catch (err) {
      toast.update(toastId, {
        render: err.message || "Failed to upload feedback file.",
        type: "error",
        isLoading: false,
        autoClose: 4000,
      });
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const sessionOptions = sessions.map((s) => ({
    value: String(s.id),
    label: s.filename,
  }));

  const dropdownOptions = [
    { value: "", label: sessions.length ? "Select an uploaded file" : "No files uploaded yet" },
    ...sessionOptions,
  ];

  return (
    <AppLayout title="AI Analysis">
      {/* Modern, Minimal Top Section: Compact File Upload (Left) & Already Uploaded Files (Right) */}
      <div className="panel mb-4 p-3" style={{ borderRadius: "12px", background: "#ffffff", boxShadow: "0 2px 10px rgba(0, 0, 0, 0.03)" }}>
        <div className="d-flex align-items-center gap-4 flex-wrap">
          {/* Left Side: Compact File Upload Component (~200px wide) */}
          <div
            className="d-flex flex-column align-items-center justify-content-center px-3 py-2 rounded-3 border bg-white text-center"
            style={{
              width: "200px",
              minWidth: "200px",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
              borderColor: "#E5E7EB",
            }}
          >
            {canUpload ? (
              <>
                <button
                  type="button"
                  className="btn btn-primary d-flex align-items-center justify-content-center gap-2 w-100 rounded-3 py-1.5"
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: "600",
                    backgroundColor: "#2563EB",
                    borderColor: "#2563EB",
                  }}
                  onClick={handleUploadClick}
                  disabled={isUploading}
                >
                  <i className="bi bi-cloud-upload-fill" style={{ fontSize: "0.95rem" }} />
                  <span>{isUploading ? "Uploading..." : "Choose File"}</span>
                </button>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  onChange={handleExcelUpload}
                />
                <span
                  className="text-muted mt-1"
                  style={{ fontSize: "0.72rem", fontWeight: "400" }}
                >
                  Supports: .xlsx, .xls
                </span>
              </>
            ) : (
              <>
                <i className="bi bi-eye" style={{ fontSize: "1.1rem", color: "#64748B" }} />
                <span className="fw-semibold mt-1" style={{ fontSize: "0.82rem", color: "#334155" }}>
                  View only
                </span>
                <span className="text-muted" style={{ fontSize: "0.72rem" }}>
                  Your role can read analyses but not upload feedback.
                </span>
              </>
            )}
          </div>

          {/* Right Side: Already Uploaded Files Section */}
          <div className="d-flex flex-column" style={{ width: "320px", maxWidth: "100%" }}>
            <label
              className="form-label text-dark mb-1"
              style={{ fontSize: "0.85rem", fontWeight: "600" }}
            >
              Already Uploaded Files
            </label>
            <div style={{ width: "100%" }}>
              <SelectDropdown
                icon="bi-folder-fill"
                value={selectedSessionId}
                onChange={setSelectedSessionId}
                options={dropdownOptions}
              />
            </div>
          </div>
        </div>
      </div>


      {/* Capability strip */}
      <div className="capability-grid">
        {capabilities.map((cap) => (
          <CapabilityCard key={cap.id} {...cap} />
        ))}
      </div>

      {/* Sentiment and Keywords and Recommended actions */}
      <div className="dashboard-row dashboard-row--three">
        <div className="panel sentiment-card">
          <div className="panel-header">
            <h2 className="panel-header__title">Overall Sentiment</h2>
          </div>
          <SentimentDonutChart data={sentimentData} total={analyzedCount} />
          <SentimentLegend data={sentimentData} />
        </div>

        <div className="panel keyword-card">
          <div className="panel-header">
            <h2 className="panel-header__title">Top Keywords</h2>
          </div>
          <KeywordCloud keywords={keywords} />
        </div>

        <RecommendedActions
          title="AI Recommended Actions"
          icon="bi-lightbulb-fill"
          actions={actions}
          {...(canViewActions
            ? {
                ctaLabel: "View Action Tracker",
                ctaIcon: "bi-arrow-right",
                onCtaClick: () => navigate("/action-tracker"),
              }
            : {})}
        />
      </div>

      {/* AI Summary + illustration */}
      <div className="dashboard-row ai-summary-row">
        <AISummaryCard
          text={summary}
          ctaLabel={null}
          meta={model}
          metrics={[
            {
              icon: "bi-emoji-smile-fill",
              tone: "green",
              label: "Positive",
              value: `${sentimentData[0].value}% (${sentimentData[0].count})`,
            },
            {
              icon: "bi-emoji-neutral-fill",
              tone: "amber",
              label: "Neutral",
              value: `${sentimentData[1].value}% (${sentimentData[1].count})`,
            },
            {
              icon: "bi-emoji-frown-fill",
              tone: "red",
              label: "Negative",
              value: `${sentimentData[2].value}% (${sentimentData[2].count})`,
            },
            {
              icon: "bi-shield-check",
              tone: "violet",
              label: "AI Confidence",
              value: confidence.value,
              sublabel: confidence.label,
              sublabelTone: "violet",
            },
          ]}
        />

        <div className="panel ai-illustration-card">
          <AIInsightIllustration />
        </div>
      </div>
    </AppLayout>
  );
}

export default AIAnalysis;