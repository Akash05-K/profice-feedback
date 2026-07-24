function AIInsightIllustration() {
  return (
    <svg
      viewBox="0 0 320 240"
      xmlns="http://www.w3.org/2000/svg"
      className="ai-insight-illustration"
      role="img"
      aria-label="AI insight illustration"
    >
      <defs>
        <linearGradient id="aiIllo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
        <linearGradient id="aiIlloBar" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.6" />
        </linearGradient>
      </defs>

      {/* soft backdrop */}
      <circle cx="160" cy="118" r="96" fill="url(#aiIllo)" opacity="0.06" />

      {/* card with bars */}
      <rect x="46" y="70" width="150" height="110" rx="14" fill="#ffffff" stroke="#e5e7eb" />
      <rect x="64" y="140" width="18" height="26" rx="4" fill="url(#aiIlloBar)" />
      <rect x="92" y="120" width="18" height="46" rx="4" fill="url(#aiIlloBar)" />
      <rect x="120" y="132" width="18" height="34" rx="4" fill="url(#aiIlloBar)" />
      <rect x="148" y="104" width="18" height="62" rx="4" fill="url(#aiIllo)" />
      <rect x="64" y="86" width="70" height="8" rx="4" fill="#eef2ff" />
      <rect x="64" y="100" width="46" height="6" rx="3" fill="#f1f5f9" />

      {/* sparkline */}
      <polyline
        points="60,132 88,116 116,124 144,98 172,108"
        fill="none"
        stroke="url(#aiIllo)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* AI badge */}
      <circle cx="228" cy="86" r="30" fill="url(#aiIllo)" />
      <text x="228" y="92" textAnchor="middle" fontSize="20" fontWeight="700" fill="#ffffff" fontFamily="Inter, sans-serif">
        AI
      </text>
      <circle cx="256" cy="150" r="8" fill="#6366f1" opacity="0.5" />
      <circle cx="70" cy="196" r="6" fill="#2563eb" opacity="0.4" />
      <circle cx="212" cy="188" r="5" fill="#6366f1" opacity="0.35" />
    </svg>
  );
}

export default AIInsightIllustration;
