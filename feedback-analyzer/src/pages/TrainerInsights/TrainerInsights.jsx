import { useState, useEffect } from "react";
import AppLayout from "../../components/layout/AppLayout";
import StatCard from "../../components/cards/StatCard";
import SelectDropdown from "../../components/common/SelectDropdown";
import ProfileBanner from "../../components/widgets/ProfileBanner";
import StrengthsWeaknesses from "../../components/widgets/StrengthsWeaknesses";
import RecommendedActions from "../../components/widgets/RecommendedActions";
import api from "../../services/api";
import { trainers as fallbackTrainers, trainerMetrics as fallbackMetrics } from "../../data/trainerInsightsData";

const statCardsConfig = [
  { key: "overallRating", label: "Overall Rating", icon: "bi-star-fill", tone: "amber", suffix: "/ 5" },
  { key: "satisfaction", label: "Student Satisfaction", icon: "bi-emoji-smile-fill", tone: "green", suffix: "%" },
  { key: "totalBatches", label: "Batches Handled", icon: "bi-collection-fill", tone: "violet", suffix: "" },
  { key: "totalSessions", label: "Sessions Conducted", icon: "bi-calendar2-check-fill", tone: "blue", suffix: "" },
];

const collegeOptions = [
  { value: "All Colleges", label: "All Colleges" },
  { value: "PSG College of Technology", label: "PSG College of Technology" },
  { value: "Coimbatore Institute of Technology", label: "Coimbatore Institute of Technology" },
  { value: "Government College of Technology", label: "Government College of Technology" },
];

function TrainerInsights() {
  const [selectedCollege, setSelectedCollege] = useState("All Colleges");
  const [trainerId, setTrainerId] = useState("overall");

  const [trainersList, setTrainersList] = useState(fallbackTrainers);
  const [metrics, setMetrics] = useState(fallbackMetrics["overall"]);

  // Fetch trainers list
  useEffect(() => {
    async function loadTrainers() {
      try {
        const res = await api.getTrainers(selectedCollege);
        if (res.data && res.data.length > 0) {
          setTrainersList(res.data);
        }
      } catch (e) {
        console.error("Fetch trainers error:", e);
      }
    }
    loadTrainers();
  }, [selectedCollege]);

  // Fetch trainer metrics
  useEffect(() => {
    async function loadMetrics() {
      try {
        const res = await api.getTrainerMetrics(trainerId);
        if (res.data) {
          setMetrics(res.data);
        }
      } catch (e) {
        console.error("Fetch metrics error:", e);
      }
    }
    loadMetrics();
  }, [trainerId]);

  const currentTrainer = trainersList.find((t) => t.id === trainerId) || trainersList[0];

  const handleCollegeChange = (collegeName) => {
    setSelectedCollege(collegeName);
    setTrainerId("overall");
  };

  const statCards = statCardsConfig.map((config) => ({
    id: config.key,
    label: config.label,
    icon: config.icon,
    tone: config.tone,
    value: String(metrics[config.key] ?? 0),
    valueSuffix: config.suffix,
  }));

  return (
    <AppLayout title="Trainer Insights">
      {/* Trainer profile + selector */}
      <div className="dashboard-row">
        <ProfileBanner
          avatarLabel={currentTrainer.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
          name={currentTrainer.name}
          subtitle={currentTrainer.subject}
          rating={metrics.overallRating}
          ratingLabel={`(${metrics.totalReviews} reviews)`}
        >
          <div className="d-flex gap-3 align-items-center flex-wrap">
            <SelectDropdown
              icon="bi-building"
              value={selectedCollege}
              onChange={handleCollegeChange}
              options={collegeOptions}
            />
            <SelectDropdown
              value={trainerId}
              onChange={setTrainerId}
              options={trainersList.map((t) => ({ value: t.id, label: t.name }))}
            />
          </div>
        </ProfileBanner>
      </div>

      {/* Stat cards */}
      <div className="stat-card-grid stat-card-grid--three">
        {statCards.map((card) => (
          <StatCard key={card.id} {...card} />
        ))}
      </div>

      {/* Strengths/Weaknesses */}
      <div>
        <StrengthsWeaknesses strengths={metrics.strengths || []} weaknesses={metrics.weaknesses || []} />
      </div>

      {/* AI Recommendations */}
      <div className="dashboard-row">
        <RecommendedActions
          title="AI Recommendations"
          icon="bi-stars"
          actions={metrics.recommendations || []}
          ctaLabel={null}
        />
      </div>
    </AppLayout>
  );
}

export default TrainerInsights;