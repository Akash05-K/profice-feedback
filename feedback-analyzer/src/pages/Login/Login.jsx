import { useState } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";
import { firstAccessiblePath } from "../../lib/permissions";
import "./login.css";

const DEMO_ACCOUNTS = [
  { role: "Super Admin", email: "admin@profice.edu", password: "admin123" },
  { role: "Management", email: "management@profice.edu", password: "manage123" },
  { role: "Program Manager", email: "pm@profice.edu", password: "pm123" },
  { role: "ACE Lead", email: "acelead@profice.edu", password: "ace123" },
  { role: "Trainer", email: "dr.kumar@psgtech.ac.in", password: "trainer123" },
];

const FEATURES = [
  { tag: "Managing", text: "Create operational tracking with intelligent oversight to make awesome workflows that suit your needs." },
  { tag: "Analyzing", text: "Turn raw student feedback into AI-classified sentiment, keywords and actionable insights instantly." },
  { tag: "Reporting", text: "Generate role-based dashboards and exportable reports across every trainer, course and batch." },
];

function Login() {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [showDemo, setShowDemo] = useState(false);
  const [featureIdx, setFeatureIdx] = useState(0);

  if (isAuthenticated) {
    return <Navigate to={location.state?.from || firstAccessiblePath(user?.role)} replace />;
  }

  const validate = () => {
    const next = {};
    if (!/^\S+@\S+\.\S+$/.test(email)) next.email = "Enter a valid email address";
    if (!password) next.password = "Password is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate() || submitting) return;
    setSubmitting(true);
    try {
      const loggedIn = await login(email.trim(), password);
      toast.success(`Welcome back, ${loggedIn.name.split(" ")[0]}!`);
      navigate(location.state?.from || firstAccessiblePath(loggedIn.role), { replace: true });
    } catch (err) {
      toast.error(err.message || "Invalid credentials.");
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = (acct) => {
    setEmail(acct.email);
    setPassword(acct.password);
    setErrors({});
  };

  const feature = FEATURES[featureIdx];
  const cycleFeature = (dir) =>
    setFeatureIdx((i) => (i + dir + FEATURES.length) % FEATURES.length);

  return (
    <div className="login-page">
      <div className="login-shell">
        {/* ---------- Left: form ---------- */}
        <section className="login-left">
          <h1 className="login-welcome">
            Welcome to
            <br />
            Profice Feedback
          </h1>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <div className={`login-pill ${errors.email ? "login-pill--error" : ""}`}>
              <i className="bi bi-envelope" />
              <input
                type="email"
                autoComplete="username"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {errors.email && <span className="login-error">{errors.email}</span>}

            <div className={`login-pill ${errors.password ? "login-pill--error" : ""}`}>
              <i className="bi bi-lock" />
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="login-pill__eye"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <i className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`} />
              </button>
            </div>
            {errors.password && <span className="login-error">{errors.password}</span>}

            <div className="login-row">
              <label className="login-remember">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                <span>Remember me</span>
              </label>
              <button
                type="button"
                className="login-forgot"
                onClick={() => toast.info("Please contact your administrator to reset your password.")}
              >
                Forgot Password?
              </button>
            </div>

            <button type="submit" className="login-signin" disabled={submitting}>
              {submitting ? (
                <>
                  <span className="login-spinner" /> Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          {/* Social proof / demo toggle */}
          <div className="login-social">
            <div className="login-social__avatars">
              <span className="login-avatar login-avatar--1">S</span>
              <span className="login-avatar login-avatar--2">M</span>
              <span className="login-avatar login-avatar--3">+</span>
            </div>
            <div className="login-social__text">
              <strong>Join with 110+ Users!</strong>
              <span>Explore demo logins for each role</span>
            </div>
            <button
              type="button"
              className={`login-social__arrow ${showDemo ? "login-social__arrow--open" : ""}`}
              onClick={() => setShowDemo((s) => !s)}
              aria-label="Toggle demo accounts"
            >
              <i className="bi bi-arrow-up-right" />
            </button>
          </div>

          {showDemo && (
            <div className="login-demo">
              {DEMO_ACCOUNTS.map((a) => (
                <button type="button" key={a.email} className="login-demo__item" onClick={() => fillDemo(a)}>
                  <span className="login-demo__role">{a.role}</span>
                  <span className="login-demo__email">{a.email}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* ---------- Right: brand panel ---------- */}
        <aside className="login-right">
          <h2 className="login-right__headline">
            Revolutionizing the way we connect, manage, and experience work.
          </h2>

          <div className="login-logo-card">
            <svg viewBox="0 0 120 120" className="login-logo" aria-label="Profice">
              <rect x="20" y="60" width="14" height="34" rx="3" fill="#38bdf8" />
              <rect x="40" y="44" width="14" height="50" rx="3" fill="#2563eb" />
              <rect x="60" y="30" width="14" height="64" rx="3" fill="#1d4ed8" />
              <path d="M74 40 L86 24" stroke="#1d4ed8" strokeWidth="4" strokeLinecap="round" />
              <path d="M86 24 l-9 1 l3 8 z" fill="#1d4ed8" />
              <circle cx="84" cy="52" r="9" fill="#38bdf8" />
              <text x="60" y="112" textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight="800" fontSize="20" fill="#1d4ed8">
                Profice
              </text>
            </svg>
          </div>

          <div className="login-feature">
            <span className="login-feature__tag">{feature.tag}</span>
            <p className="login-feature__text">{feature.text}</p>
            <div className="login-feature__nav">
              <button type="button" onClick={() => cycleFeature(-1)} aria-label="Previous">
                <i className="bi bi-arrow-left" />
              </button>
              <button type="button" onClick={() => cycleFeature(1)} aria-label="Next">
                <i className="bi bi-arrow-right" />
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default Login;
