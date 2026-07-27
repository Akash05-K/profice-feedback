import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../../components/layout/AppLayout";
import StatCard from "../../components/cards/StatCard";
import FeedbackTrendChart from "../../components/charts/FeedbackTrendChart";
import SentimentDonutChart from "../../components/charts/SentimentDonutChart";
import SentimentLegend from "../../components/widgets/SentimentLegend";
import AISummaryCard from "../../components/widgets/AISummaryCard";
import RankedTopicList from "../../components/widgets/RankedTopicList";
import RecentFeedbackList from "../../components/widgets/RecentFeedbackList";
import QuickActions from "../../components/widgets/QuickActions";
import TrainerAlertBanner from "../../components/widgets/TrainerAlertBanner";
import api from "../../services/api";

import {
  statCardValues as fallbackStatCardValues,
  feedbackTrend as fallbackFeedbackTrend,
  sentimentDistribution as fallbackSentimentDistribution,
  topAppreciatedTopics as fallbackTopAppreciatedTopics,
  topImprovementAreas as fallbackTopImprovementAreas,
  recentFeedback as fallbackRecentFeedback,
} from "../../data/dashboardData";
import { aiSummaryText } from "../../data/aiSummaryData";

const statCardsConfig = [
  { id: "total-feedback", label: "Total Feedback", icon: "bi-chat-square-text-fill", tone: "violet" },
  { id: "average-rating", label: "Average Rating", icon: "bi-emoji-smile-fill", tone: "green" },
  { id: "satisfaction-score", label: "Satisfaction Score", icon: "bi-heart-fill", tone: "amber" },
  { id: "positive-feedback", label: "Positive Feedback", icon: "bi-hand-thumbs-up-fill", tone: "blue" },
  { id: "response-rate", label: "Response Rate", icon: "bi-graph-up-arrow", tone: "slate" },
];

const quickActions = [
  { id: "feedback-repository", label: "Feedback Repository", icon: "bi-archive-fill", tone: "violet" },
  { id: "trainer-insights", label: "Trainer Insights", icon: "bi-person-workspace", tone: "green" },
  { id: "import-feedback", label: "Import Feedback", icon: "bi-download", tone: "amber" },
  { id: "view-reports", label: "View Reports", icon: "bi-file-earmark-text-fill", tone: "blue" },
  { id: "ai-analysis", label: "AI Analysis", icon: "bi-stars", tone: "violet" },
  { id: "action-tracker", label: "Action Tracker", icon: "bi-list-check", tone: "danger" },
];

function Dashboard() {
  const navigate = useNavigate();

  const [statsData, setStatsData] = useState(fallbackStatCardValues);
  const [trendsData, setTrendsData] = useState(fallbackFeedbackTrend);
  const [sentimentData, setSentimentData] = useState(fallbackSentimentDistribution);
  const [appreciatedTopics, setAppreciatedTopics] = useState(fallbackTopAppreciatedTopics);
  const [improvementTopics, setImprovementTopics] = useState(fallbackTopImprovementAreas);
  const [recentList, setRecentList] = useState(fallbackRecentFeedback);
  const [aiSummary, setAiSummary] = useState(aiSummaryText);
  const [alertData, setAlertData] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboardData() {
      try {
        const [statsRes, trendsRes, sentimentRes, topicsRes, recentRes, summaryRes, alertRes] = await Promise.allSettled([
          api.getDashboardStats(),
          api.getDashboardTrends(),
          api.getSentimentDistribution(),
          api.getTopTopics(),
          api.getRecentFeedback(),
          api.getAiDashboardSummary(),
          api.getTrainerAlert(),
        ]);

        if (isMounted) {
          if (statsRes.status === "fulfilled" && statsRes.value.data) setStatsData(statsRes.value.data);
          if (trendsRes.status === "fulfilled" && trendsRes.value.data) setTrendsData(trendsRes.value.data);
          if (sentimentRes.status === "fulfilled" && sentimentRes.value.data) setSentimentData(sentimentRes.value.data);
          if (topicsRes.status === "fulfilled" && topicsRes.value.data) {
            setAppreciatedTopics(topicsRes.value.data.appreciated || fallbackTopAppreciatedTopics);
            setImprovementTopics(topicsRes.value.data.improvement || fallbackTopImprovementAreas);
          }
          if (recentRes.status === "fulfilled" && recentRes.value.data) setRecentList(recentRes.value.data);
          if (summaryRes.status === "fulfilled" && summaryRes.value.data?.text) {
            setAiSummary(summaryRes.value.data.text);
          }
          if (alertRes.status === "fulfilled" && alertRes.value.data) {
            setAlertData(alertRes.value.data);
          }
        }
      } catch (err) {
        console.error("Dashboard API error:", err);
      }
    }

    loadDashboardData();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleActionClick = (actionId) => {
    switch (actionId) {
      case "feedback-repository":
        navigate("/repository");
        break;
      case "trainer-insights":
        navigate("/trainer-insights");
        break;
      case "import-feedback":
        navigate("/ai-analysis", { state: { triggerUpload: true } });
        break;
      case "view-reports":
        navigate("/reports");
        break;
      case "ai-analysis":
        navigate("/ai-analysis");
        break;
      case "action-tracker":
        navigate("/action-tracker");
        break;
      default:
        break;
    }
  };

  const statCards = statCardsConfig.map((config) => ({
    ...config,
    ...(statsData[config.id] || fallbackStatCardValues[config.id]),
  }));

  const totalSentimentCount = statsData["total-feedback"]?.value || "0";

  return (
    <AppLayout title="Dashboard">
      {/* Most Negative Trainer Alert Banner */}
      <TrainerAlertBanner alertData={alertData} />

      {/* Stat cards */}
      <div className="stat-card-grid stat-card-grid--three">
        {statCards.map((card) => (
          <StatCard key={card.id} {...card} />
        ))}
      </div>

      {/* Trend and Sentiment and AIsummary */}
      <div className="dashboard-row dashboard-row--three">
        <div className="panel trend-card">
          <div className="panel-header">
            <h2 className="panel-header__title">Feedback Trend</h2>
            <span className="panel-header__badge">This year</span>
          </div>
          <FeedbackTrendChart data={trendsData} />
        </div>

        <div className="panel sentiment-card">
          <div className="panel-header">
            <h2 className="panel-header__title">Sentiment Distribution</h2>
          </div>
          <SentimentDonutChart data={sentimentData} total={totalSentimentCount} />
          <SentimentLegend data={sentimentData} />
        </div>

        <AISummaryCard text={aiSummary} ctaLabel="View Full Summary" onCtaClick={() => navigate("/ai-analysis")} />
      </div>

      {/* Ranked lists and recent feedback */}
      <div className="dashboard-row dashboard-row--three-equal">
        <RankedTopicList
          title="Top Appreciated Topics"
          icon="bi-trophy-fill"
          iconTone="amber"
          items={appreciatedTopics}
          barTone="green"
        />
        <RankedTopicList
          title="Top Improvement Areas"
          icon="bi-exclamation-triangle-fill"
          iconTone="red"
          items={improvementTopics}
          barTone="red"
        />
        <RecentFeedbackList items={recentList} />
      </div>

      {/* Quick actions */}
      <div className="dashboard-row">
        <QuickActions actions={quickActions} onActionClick={handleActionClick} />
      </div>
    </AppLayout>
  );
}

export default Dashboard;