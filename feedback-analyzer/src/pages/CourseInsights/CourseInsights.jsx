import { useState, useEffect, useCallback } from "react";
import AppLayout from "../../components/layout/AppLayout";
import StatCard from "../../components/cards/StatCard";
import SelectDropdown from "../../components/common/SelectDropdown";
import ProfileBanner from "../../components/widgets/ProfileBanner";
import MetricComparisonChart from "../../components/charts/MetricComparisonChart";
import RecommendedActions from "../../components/widgets/RecommendedActions";
import api from "../../services/api";

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

function CourseInsights() {
  const [selectedCollege, setSelectedCollege] = useState("All Colleges");
  const [courseId, setCourseId] = useState("overall");

  const [availableColleges, setAvailableColleges] = useState(["All Colleges"]);
  const [coursesList, setCoursesList] = useState([{ id: "overall", name: "Overall Classification", category: "All Categories", duration: "All Courses", college: "All Colleges" }]);
  
  const [metrics, setMetrics] = useState({
    courseRating: 0,
    contentRating: 0,
    practicalRating: 0,
    enrolledStudents: 0,
    monthlyTrend: [],
    improvementSuggestions: [],
  });

  // Fetch filter options (colleges and courses)
  const loadFilterOptions = useCallback(async () => {
    try {
      const res = await api.getCourseFilterOptions({ college: selectedCollege });
      if (res.data) {
        setAvailableColleges(res.data.colleges || ["All Colleges"]);
        setCoursesList(res.data.courses || []);
      }
    } catch (e) {
      console.error("Fetch filter options error:", e);
    }
  }, [selectedCollege]);

  useEffect(() => {
    loadFilterOptions();
  }, [loadFilterOptions]);

  // Fetch course metrics for selected course & college
  const loadMetrics = useCallback(async () => {
    try {
      const res = await api.getCourseMetrics(courseId, { college: selectedCollege });
      if (res.data) {
        setMetrics(res.data);
      }
    } catch (e) {
      console.error("Fetch course metrics error:", e);
    }
  }, [courseId, selectedCollege]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  const currentCourse = coursesList.find((c) => String(c.id) === String(courseId)) || coursesList[0];

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
      {/* Course profile + 2 cascading dropdown selectors */}
      <div className="dashboard-row">
        <ProfileBanner
          avatarIcon="bi-mortarboard-fill"
          name={currentCourse ? currentCourse.name : "Overall Classification"}
          subtitle={`${currentCourse ? currentCourse.category : "General"} · ${currentCourse ? currentCourse.duration : "All Courses"}`}
          rating={metrics.courseRating}
          ratingLabel={`(${metrics.enrolledStudents || 0} students enrolled)`}
        >
          <div className="d-flex gap-3 align-items-center flex-wrap">
            <SelectDropdown
              icon="bi-building"
              value={selectedCollege}
              onChange={handleCollegeChange}
              options={availableColleges.map((col) => ({ value: col, label: col }))}
            />
            <SelectDropdown
              icon="bi-mortarboard-fill"
              value={courseId}
              onChange={setCourseId}
              options={coursesList.map((c) => ({ value: String(c.id), label: c.name }))}
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