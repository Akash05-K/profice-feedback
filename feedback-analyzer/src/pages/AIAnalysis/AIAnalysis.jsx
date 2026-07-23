import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import * as XLSX from "xlsx";
import { toast } from "react-toastify";
import api from "../../services/api";
import AppLayout from "../../components/layout/AppLayout";
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
import { aiSummaryText, aiConfidence, modelMeta } from "../../data/aiSummaryData";

const capabilities = [
  { id: "sentiment", icon: "bi-emoji-smile-fill", title: "Sentiment Analysis", subtitle: "Analyze feedback sentiment", tone: "violet" },
  { id: "emotion", icon: "bi-grid-3x3-gap-fill", title: "Emotion Detection", subtitle: "Detect emotions in text", tone: "green" },
  { id: "topic", icon: "bi-diagram-3-fill", title: "Topic Classification", subtitle: "Find feedback categories", tone: "amber" },
  { id: "keyword", icon: "bi-file-earmark-text-fill", title: "Keyword Extraction", subtitle: "Extract important keywords", tone: "teal" },
  { id: "duplicate", icon: "bi-shield-check", title: "Duplicate Detection", subtitle: "Remove duplicates & spam", tone: "blue" },
];

function AIAnalysis() {
  const location = useLocation();
  const fileInputRef = useRef(null);
  const [analyzedCount, setAnalyzedCount] = useState(totalAnalyzed);
  const [sentimentData, setSentimentData] = useState(overallSentiment);
  const [keywords, setKeywords] = useState(topKeywords);
  const [actions, setActions] = useState(recommendedActions);

  const handleUploadClick = () => {
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

      setAnalyzedCount(data.analyzedCount);
      if (data.sentimentData) {
        setSentimentData(data.sentimentData);
      }
      if (data.actions && data.actions.length > 0) {
        setActions(data.actions);
      }

      toast.update(toastId, {
        render: `Successfully saved ${data.analyzedCount} feedback records to MySQL!`,
        type: "success",
        isLoading: false,
        autoClose: 4000,
      });
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

  return (
    <AppLayout title="AI Analysis">
      {/* Top Left Excel Upload Action */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <div className="d-flex align-items-center gap-3">
          <button
            type="button"
            className="btn btn-outline-success d-flex align-items-center gap-2 rounded-pill px-3 py-1.5"
            style={{ fontSize: "0.85rem", fontWeight: "600", borderColor: "#16A34A", color: "#16A34A" }}
            onClick={handleUploadClick}
          >
            <i className="bi bi-file-earmark-excel-fill" />
            <span>Excel Upload</span>
          </button>
          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={handleExcelUpload}
          />
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
          ctaLabel="View Action Tracker"
          ctaIcon="bi-arrow-right"
        />
      </div>

      {/* AI Summary + illustration */}
      <div className="dashboard-row ai-summary-row">
        <AISummaryCard
          text={aiSummaryText}
          ctaLabel={null}
          meta={modelMeta}
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
              value: aiConfidence.value,
              sublabel: aiConfidence.label,
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