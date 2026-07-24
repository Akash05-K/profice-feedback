import { useState, useEffect } from "react";
import AppLayout from "../../components/layout/AppLayout";
import StatCard from "../../components/cards/StatCard";
import MetricComparisonChart from "../../components/charts/MetricComparisonChart";
import RankedTopicList from "../../components/widgets/RankedTopicList";
import api from "../../services/api";

const comparisonSeries = [
  { key: "satisfactionRate", label: "Satisfaction (≥3★)", color: "#6a8ad0" },
  { key: "positiveRate", label: "Positive Sentiment", color: "#afd9bf" },
];

function BatchInsights() {
  const [batchesList, setBatchesList] = useState([]);
  const [batchStats, setBatchStats] = useState({
    totalBatches: 0,
    totalResponses: 0,
    avgSatisfaction: 0,
    avgPositive: 0,
  });

  useEffect(() => {
    async function loadBatchData() {
      try {
        const [batchesRes, statsRes] = await Promise.allSettled([api.getBatches(), api.getBatchStats()]);
        if (batchesRes.status === "fulfilled" && batchesRes.value.data) {
          setBatchesList(batchesRes.value.data);
        }
        if (statsRes.status === "fulfilled" && statsRes.value.data) {
          setBatchStats(statsRes.value.data);
        }
      } catch (e) {
        console.error("Fetch batches error:", e);
      }
    }
    loadBatchData();
  }, []);

  const statCards = [
    { id: "total-batches", label: "Total Batches", value: String(batchStats.totalBatches), icon: "bi-collection-fill", tone: "violet" },
    { id: "total-responses", label: "Total Responses", value: String(batchStats.totalResponses), icon: "bi-people-fill", tone: "blue" },
    { id: "avg-satisfaction", label: "Avg Satisfaction", value: String(batchStats.avgSatisfaction), valueSuffix: "%", icon: "bi-check-circle-fill", tone: "green" },
    { id: "avg-positive", label: "Avg Positive Sentiment", value: String(batchStats.avgPositive), valueSuffix: "%", icon: "bi-emoji-smile-fill", tone: "amber" },
  ];

  const ranking = [...batchesList]
    .sort((a, b) => (b.overallScore || 0) - (a.overallScore || 0))
    .map((batch, index) => ({
      rank: index + 1,
      label: `${batch.name} · ${batch.course}`,
      value: batch.overallScore || 0,
    }));

  return (
    <AppLayout title="Batch & Student Insights">
      {/* Stat cards */}
      <div className="stat-card-grid stat-card-grid--three">
        {statCards.map((card) => (
          <StatCard key={card.id} {...card} />
        ))}
      </div>

      {/* Batch comparison chart */}
      <div className="dashboard-row">
        <div className="panel trend-card">
          <div className="panel-header">
            <h2 className="panel-header__title">Batch Comparison</h2>
            <button type="button" className="panel-header__select">
              All batch <i className="bi bi-chevron-down" />
            </button>
          </div>
          <MetricComparisonChart
            data={batchesList}
            series={comparisonSeries}
            xKey="name"
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            valueFormatter={(value) => `${value}%`}
          />
        </div>
      </div>

      {/* Batch ranking */}
      <div className="dashboard-row">
        <RankedTopicList
          title="Batch Ranking"
          icon="bi-trophy-fill"
          iconTone="amber"
          items={ranking}
          barTone="green"
        />
      </div>
    </AppLayout>
  );
}

export default BatchInsights;