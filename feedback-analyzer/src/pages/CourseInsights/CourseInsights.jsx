import { useState, useEffect } from "react";
import AppLayout from "../../components/layout/AppLayout";
import StatCard from "../../components/cards/StatCard";
import SelectDropdown from "../../components/common/SelectDropdown";
import ProfileBanner from "../../components/widgets/ProfileBanner";
import MetricComparisonChart from "../../components/charts/MetricComparisonChart";
import RecommendedActions from "../../components/widgets/RecommendedActions";
import api from "../../services/api";
import { courses as fallbackCourses, courseMetrics as fallbackMetrics } from "../../data/courseInsightsData";

const statCardsConfig = [
  { key: "courseRating", label: "Course Rating", icon: "bi-award-fill", tone: "violet" },
  { key: "contentRating", label: "Content Rating", icon: "bi-journal-richtext", tone: "blue" },
  { key: "practicalRating", label: "Practical Session Rating", icon: "bi-tools", tone: "green" },
];

const trendSeries = [
  { key: "course", label: "Course Rating", color: "#bcbdcf" },
  { key: "content", label: "Content Rating", color: "#6a8ad0" },
  { key: "practical", label: "Practical Rating", color: "#afd9bf" },
];

const collegeOptions = [
  { value: "All Colleges", label: "All Colleges" },
  { value: "PSG College of Technology", label: "PSG College of Technology" },
  { value: "Coimbatore Institute of Technology", label: "Coimbatore Institute of Technology" },
  { value: "Government College of Technology", label: "Government College of Technology" },
];

function CourseInsights() {
  const [selectedCollege, setSelectedCollege] = useState("All Colleges");
  const [courseId, setCourseId] = useState("overall");

  const [coursesList, setCoursesList] = useState(fallbackCourses);
  const [metrics, setMetrics] = useState(fallbackMetrics["overall"]);

  // Fetch courses list
  useEffect(() => {
    async function loadCourses() {
      try {
        const res = await api.getCourses(selectedCollege);
        if (res.data && res.data.length > 0) {
          setCoursesList(res.data);
        }
      } catch (e) {
        console.error("Fetch courses error:", e);
      }
    }
    loadCourses();
  }, [selectedCollege]);

  // Fetch course metrics
  useEffect(() => {
    async function loadMetrics() {
      try {
        const res = await api.getCourseMetrics(courseId);
        if (res.data) {
          setMetrics(res.data);
        }
      } catch (e) {
        console.error("Fetch course metrics error:", e);
      }
    }
    loadMetrics();
  }, [courseId]);

  const currentCourse = coursesList.find((c) => c.id === courseId) || coursesList[0];

  const handleCollegeChange = (collegeName) => {
    setSelectedCollege(collegeName);
    setCourseId("overall");
  };

  const statCards = statCardsConfig.map((config) => ({
    id: config.key,
    label: config.label,
    icon: config.icon,
    tone: config.tone,
    value: String(metrics[config.key] ?? 0),
    valueSuffix: "/ 5",
  }));

  return (
    <AppLayout title="Course Insights">
      {/* Course profile + selector */}
      <div className="dashboard-row">
        <ProfileBanner
          avatarIcon="bi-mortarboard-fill"
          name={currentCourse.name}
          subtitle={`${currentCourse.category || "General"} · ${currentCourse.duration || "12 weeks"}`}
          rating={metrics.courseRating}
          ratingLabel={`(${metrics.enrolledStudents || 0} students enrolled)`}
        >
          <div className="d-flex gap-3 align-items-center flex-wrap">
            <SelectDropdown
              icon="bi-building"
              value={selectedCollege}
              onChange={handleCollegeChange}
              options={collegeOptions}
            />
            <SelectDropdown
              value={courseId}
              onChange={setCourseId}
              options={coursesList.map((c) => ({ value: c.id, label: c.name }))}
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

      {/* Rating trend */}
      <div className="dashboard-row">
        <div className="panel trend-card">
          <div className="panel-header">
            <h2 className="panel-header__title">Rating Trend</h2>
            <button type="button" className="panel-header__select">
              2026 <i className="bi bi-chevron-down" />
            </button>
          </div>
          <MetricComparisonChart data={metrics.monthlyTrend || []} series={trendSeries} />
        </div>
      </div>

      {/* AI Improvement suggestions */}
      <div className="dashboard-row">
        <RecommendedActions
          title="AI Improvement Suggestions"
          icon="bi-lightbulb-fill"
          actions={metrics.improvementSuggestions || []}
          ctaLabel={null}
        />
      </div>
    </AppLayout>
  );
}

export default CourseInsights;