export const feedbackCollectionSummary = [
  {
    id: "total-forms",
    label: "Total Forms Built",
    value: "12",
    change: "+2 new",
    changeLabel: "this week",
    trend: "up",
    icon: "bi-file-earmark-plus",
    tone: "violet",
  },
  {
    id: "active-campaigns",
    label: "Active Campaigns",
    value: "4",
    change: "+1 new",
    changeLabel: "since yesterday",
    trend: "up",
    icon: "bi-play-circle-fill",
    tone: "green",
  },
  {
    id: "response-rate",
    label: "Average Response Rate",
    value: "86.2",
    valueSuffix: "%",
    change: "2.4%",
    changeLabel: "vs last month",
    trend: "up",
    icon: "bi-percent",
    tone: "amber",
  },
  {
    id: "emails-sent",
    label: "Email Invites Sent",
    value: "1,250",
    change: "15.4%",
    changeLabel: "vs last week",
    trend: "up",
    icon: "bi-envelope-check",
    tone: "blue",
  },
  {
    id: "qr-scans",
    label: "QR Code Scans",
    value: "342",
    change: "12.8%",
    changeLabel: "vs last month",
    trend: "up",
    icon: "bi-qr-code-scan",
    tone: "violet",
  },
];

export const mockBatches = [
  "M.Sc TCS",
  "M.Sc Data Science",
  "B.Tech CSE - Sec A",
  "B.Tech CSE - Sec B",
  "MBA Batch 2026",
];

export const mockCourses = [
  "Machine Learning",
  "Advanced React",
  "Cloud Computing",
  "Database Management Systems",
  "Artificial Intelligence",
];

export const mockTrainers = [
  "Karthik S",
  "Priya N",
  "Arjun D",
  "Meera J",
  "Dr. Rajesh K",
];

export const predefinedTemplates = [
  {
    id: "t-1",
    title: "Course Exit Feedback Form",
    description: "Standard template evaluating syllabus coverage, trainer feedback, and overall satisfaction.",
    questions: [
      { id: "q1", type: "rating", text: "Rate the syllabus coverage and relevance of the course.", required: true, maxStars: 5 },
      { id: "q2", type: "rating", text: "How would you rate the effectiveness of the trainer's teaching style?", required: true, maxStars: 5 },
      { id: "q3", type: "mcq", text: "Did the practical sessions match the theory lectures?", required: true, options: ["Fully matched", "Partially matched", "Did not match"] },
      { id: "q4", type: "text", text: "What is your biggest take-away or improvement suggestion?", required: false },
    ],
  },
  {
    id: "t-2",
    title: "Mid-Term Trainer Evaluation",
    description: "Evaluates trainer pacing, classroom management, and doubt resolution effectiveness.",
    questions: [
      { id: "q1", type: "rating", text: "How clear are the explanations given by the trainer?", required: true, maxStars: 5 },
      { id: "q2", type: "rating", text: "Is the pace of teaching comfortable for you?", required: true, maxStars: 5 },
      { id: "q3", type: "mcq", text: "How helpful are the trainer's answers during doubt resolution sessions?", required: true, options: ["Very Helpful", "Somewhat Helpful", "Not Helpful"] },
      { id: "q4", type: "text", text: "Identify areas where the trainer could adjust their teaching methodology.", required: false },
    ],
  },
  {
    id: "t-3",
    title: "Hands-on Lab Session Evaluation",
    description: "Collects insights specifically about laboratory exercises, assistant guidance, and setup.",
    questions: [
      { id: "q1", type: "rating", text: "Rate the functionality and condition of the lab hardware/software setup.", required: true, maxStars: 5 },
      { id: "q2", type: "rating", text: "How helpful is the support provided by the lab assistants?", required: true, maxStars: 5 },
      { id: "q3", type: "text", text: "Describe any technical difficulties you faced during the sessions.", required: false },
    ],
  },
];

export const mockRecentCampaigns = [
  {
    id: "c-1",
    title: "ML Mid-Term Feedback",
    channel: "Email",
    target: "M.Sc TCS | Machine Learning (Karthik S)",
    responsesCount: 48,
    totalCount: 50,
    status: "active",
    date: "2026-07-15",
  },
  {
    id: "c-2",
    title: "React Lab Evaluation",
    channel: "QR Code",
    target: "M.Sc Data Science | Advanced React (Priya N)",
    responsesCount: 32,
    totalCount: 35,
    status: "active",
    date: "2026-07-18",
  },
  {
    id: "c-3",
    title: "Cloud Computing Seminar",
    channel: "LMS Sync",
    target: "B.Tech CSE - Sec A | Cloud Computing (Arjun D)",
    responsesCount: 112,
    totalCount: 120,
    status: "completed",
    date: "2026-07-10",
  },
  {
    id: "c-4",
    title: "DBMS Course Exit Feedback",
    channel: "Import",
    target: "B.Tech CSE - Sec B | Database Management Systems (Meera J)",
    responsesCount: 45,
    totalCount: 45,
    status: "completed",
    date: "2026-07-05",
  },
  {
    id: "c-5",
    title: "AI & Robotics Guest Lecture",
    channel: "Email",
    target: "MBA Batch 2026 | Artificial Intelligence (Dr. Rajesh K)",
    responsesCount: 0,
    totalCount: 60,
    status: "draft",
    date: "2026-07-20",
  },
];

export const mockLmsIntegrations = [
  {
    id: "integration-moodle",
    name: "Moodle LMS",
    logoClass: "bi-mortarboard-fill",
    tone: "orange",
    connected: true,
    syncInterval: "daily",
    lastSync: "2026-07-20 08:30 AM",
    recordsSynced: 1240,
    statusLogs: [
      { id: "log-m1", type: "success", text: "Synced 45 student feedbacks for Batch M.Sc TCS.", time: "Today, 08:30 AM" },
      { id: "log-m2", type: "success", text: "Fetched course enrollment metadata for Advanced React.", time: "Yesterday, 08:30 AM" },
    ],
  },
  {
    id: "integration-canvas",
    name: "Canvas LMS",
    logoClass: "bi-microsoft",
    tone: "danger",
    connected: false,
    syncInterval: "hourly",
    lastSync: "Never synced",
    recordsSynced: 0,
    statusLogs: [],
  },
  {
    id: "integration-webhook",
    name: "Custom Webhook API",
    logoClass: "bi-code-slash",
    tone: "violet",
    connected: true,
    syncInterval: "realtime",
    lastSync: "2026-07-20 10:45 AM",
    recordsSynced: 852,
    statusLogs: [
      { id: "log-w1", type: "success", text: "Successfully received anonymous feedback packet via POST /feedback-webhook.", time: "Today, 10:45 AM" },
      { id: "log-w2", type: "info", text: "Webhook payload validation passed.", time: "Today, 10:45 AM" },
    ],
  },
];

export const mockEmailCampaignLogs = [
  { id: "ec-1", recipient: "tcs2026-students@adroit.edu", subject: "ML Mid-Term Feedback Invites", sentAt: "2026-07-15 10:00 AM", status: "delivered", count: 50 },
  { id: "ec-2", recipient: "ds2026-students@adroit.edu", subject: "Lab Evaluation: Advanced React", sentAt: "2026-07-18 11:30 AM", status: "delivered", count: 35 },
  { id: "ec-3", recipient: "mba2026-students@adroit.edu", subject: "AI & Robotics Guest Lecture Feedback", sentAt: "Draft - Not Sent", status: "draft", count: 60 },
];
