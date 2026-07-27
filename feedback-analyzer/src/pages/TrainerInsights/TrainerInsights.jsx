import { useState, useEffect, useCallback } from "react";
import AppLayout from "../../components/layout/AppLayout";
import StatCard from "../../components/cards/StatCard";
import SelectDropdown from "../../components/common/SelectDropdown";
import ProfileBanner from "../../components/widgets/ProfileBanner";
import StrengthsWeaknesses from "../../components/widgets/StrengthsWeaknesses";
import RecommendedActions from "../../components/widgets/RecommendedActions";
import MonthlyRatingChart from "../../components/charts/MonthlyRatingChart";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

const statCardsConfig = [
  { key: "overallRating", label: "Overall Rating", icon: "bi-star-fill", tone: "amber", suffix: "/ 5" },
  { key: "satisfaction", label: "Student Satisfaction", icon: "bi-emoji-smile-fill", tone: "green", suffix: "%" },
  { key: "totalBatches", label: "Batches Handled", icon: "bi-collection-fill", tone: "violet", suffix: "" },
  { key: "positiveRate", label: "Positive Feedback", icon: "bi-hand-thumbs-up-fill", tone: "blue", suffix: "%" },
];

function TrainerInsights() {
  const { user } = useAuth();
  const isTrainer = user?.role === "trainer";

  const [selectedCollege, setSelectedCollege] = useState("All Colleges");
  const [selectedCourse, setSelectedCourse] = useState("All Courses");
  const [trainerId, setTrainerId] = useState("overall");

  const [availableColleges, setAvailableColleges] = useState(["All Colleges"]);
  const [availableCourses, setAvailableCourses] = useState(["All Courses"]);
  const [trainersList, setTrainersList] = useState([{ id: "overall", name: "Overall Classification" }]);

  const [metrics, setMetrics] = useState({
    overallRating: 0,
    totalReviews: 0,
    satisfaction: 0,
    totalBatches: 0,
    positiveRate: 0,
    monthlyTrend: [],
    strengths: [],
    weaknesses: [],
    recommendations: [],
  });

  // Load cascading filter options
  const loadFilterOptions = useCallback(async () => {
    try {
      const res = await api.getTrainerFilterOptions({
        college: selectedCollege,
        course: selectedCourse,
      });
      if (res.data) {
        setAvailableColleges(res.data.colleges || ["All Colleges"]);
        setAvailableCourses(res.data.courses || ["All Courses"]);
        if (res.data.trainers && res.data.trainers.length > 0) {
          setTrainersList(res.data.trainers);
          if (isTrainer) {
            setTrainerId(String(res.data.trainers[0].id));
          }
        }
      }
    } catch (e) {
      console.error("Filter options fetch error:", e);
    }
  }, [selectedCollege, selectedCourse, isTrainer]);

  useEffect(() => {
    loadFilterOptions();
  }, [loadFilterOptions]);

  // Load trainer metrics with all 3 filters
  const loadMetrics = useCallback(async () => {
    try {
      const targetTrainerId = isTrainer ? (trainersList[0]?.id || "overall") : trainerId;
      const res = await api.getTrainerMetrics(targetTrainerId, {
        college: selectedCollege,
        course: selectedCourse,
      });
      if (res.data) {
        setMetrics(res.data);
      }
    } catch (e) {
      console.error("Fetch metrics error:", e);
    }
  }, [trainerId, selectedCollege, selectedCourse, isTrainer, trainersList]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  const handleCollegeChange = (val) => {
    setSelectedCollege(val);
    setSelectedCourse("All Courses");
  };

  const handleCourseChange = (val) => {
    setSelectedCourse(val);
  };

  const handleTrainerChange = (val) => {
    if (!isTrainer) {
      setTrainerId(val);
    }
  };

  const currentTrainerObj = trainersList.find((t) => String(t.id) === String(trainerId)) || trainersList[0];
  const trainerName = isTrainer ? (user?.name || "My Performance") : (currentTrainerObj ? currentTrainerObj.name : "Overall Classification");

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
      {/* Trainer profile + cascading dropdown filters */}
      <div className="dashboard-row">
        <ProfileBanner
          avatarIcon="bi-person-workspace"
          name={trainerName}
          subtitle={`College: ${selectedCollege} · Course: ${selectedCourse}`}
          rating={metrics.overallRating}
          ratingLabel={`(${metrics.totalReviews} reviews)`}
        >
          <div className="d-flex gap-2 align-items-center flex-wrap">
            <SelectDropdown
              icon="bi-building"
              value={selectedCollege}
              onChange={handleCollegeChange}
              options={availableColleges.map((col) => ({ value: col, label: col }))}
            />

            <SelectDropdown
              icon="bi-mortarboard-fill"
              value={selectedCourse}
              onChange={handleCourseChange}
              options={availableCourses.map((c) => ({
                value: c,
                label: c === "All Courses" ? "All Courses" : c,
              }))}
            />

            {!isTrainer && (
              <SelectDropdown
                icon="bi-person"
                value={trainerId}
                onChange={handleTrainerChange}
                options={trainersList.map((t) => ({ value: String(t.id), label: t.name }))}
              />
            )}
          </div>
        </ProfileBanner>
      </div>

      {/* Stat cards */}
      <div className="stat-card-grid stat-card-grid--four">
        {statCards.map((card) => (
          <StatCard key={card.id} {...card} />
        ))}
      </div>

      {/* Rating trend */}
      <div className="dashboard-row">
        <div className="panel trend-card">
          <div className="panel-header">
            <h2 className="panel-header__title">Rating Trend</h2>
          </div>
          <MonthlyRatingChart data={metrics.monthlyTrend || []} />
        </div>
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