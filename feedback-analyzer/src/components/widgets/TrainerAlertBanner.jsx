import { useNavigate } from "react-router-dom";

function TrainerAlertBanner({ alertData }) {
  const navigate = useNavigate();

  if (!alertData || !alertData.hasAlert) return null;

  return (
    <div className="dashboard-row mb-3">
      <div className="alert-banner alert-banner--danger d-flex align-items-center justify-content-between p-3 rounded-3 shadow-sm border border-danger-subtle bg-danger-subtle text-danger-emphasis w-100 flex-wrap gap-3">
        <div className="d-flex align-items-center gap-3">
          <div className="alert-banner__icon-box rounded-circle bg-danger text-white d-flex align-items-center justify-content-center p-2 fs-4" style={{ width: "44px", height: "44px", flexShrink: 0 }}>
            <i className="bi bi-exclamation-triangle-fill" />
          </div>
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <span className="badge bg-danger text-white px-2 py-1 fs-7 fw-bold">
                ATTENTION REQUIRED
              </span>
              <span className="fw-semibold text-danger fs-7">{alertData.collegeName}</span>
            </div>
            <div className="fw-bold fs-6 text-dark">
              Trainer with Most Negative Feedback: <span className="text-danger">{alertData.trainerName}</span> ({alertData.negativeCount} negative / {alertData.totalCount} total reviews)
            </div>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-danger btn-sm px-3 py-2 fw-semibold d-flex align-items-center gap-2 shadow-sm"
          onClick={() => navigate("/trainer-insights")}
        >
          <i className="bi bi-person-workspace" />
          Investigate Trainer Insights
        </button>
      </div>
    </div>
  );
}

export default TrainerAlertBanner;
