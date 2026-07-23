export const actions = [
  { id: "ACT-101", title: "Add more practical sessions to MERN Stack", assignedTo: "Karthik S", priority: "high", dueDate: "2026-07-20", status: "in-progress", progress: 60, notes: "Coordinating with content team to add 3 new lab sessions." },
  { id: "ACT-102", title: "Improve doubt-response time for Data Science batch", assignedTo: "Priya N", priority: "high", dueDate: "2026-07-15", status: "overdue", progress: 30, notes: "Dedicated Slack channel set up, still finalizing SLA." },
  { id: "ACT-103", title: "Publish all UI/UX session recordings", assignedTo: "Arjun D", priority: "medium", dueDate: "2026-07-25", status: "open", progress: 0, notes: "" },
  { id: "ACT-104", title: "Pre-provision Cloud Computing lab environments", assignedTo: "Meera J", priority: "medium", dueDate: "2026-07-18", status: "in-progress", progress: 75, notes: "Automation script ready, testing on next batch." },
  { id: "ACT-105", title: "Update Python Programming study materials", assignedTo: "Priya N", priority: "low", dueDate: "2026-07-30", status: "open", progress: 0, notes: "" },
  { id: "ACT-106", title: "Refresh React examples to latest version", assignedTo: "Karthik S", priority: "medium", dueDate: "2026-07-10", status: "completed", progress: 100, notes: "Completed and verified with two batches.", completedDate: "2026-07-09" },
  { id: "ACT-107", title: "Add real-world case studies to Data Science", assignedTo: "Priya N", priority: "medium", dueDate: "2026-07-08", status: "completed", progress: 100, notes: "Added 5 new case studies from industry partners.", completedDate: "2026-07-07" },
  { id: "ACT-108", title: "Increase studio/practice time for UI/UX batch", assignedTo: "Arjun D", priority: "high", dueDate: "2026-07-12", status: "overdue", progress: 20, notes: "Waiting on studio room availability." },
  { id: "ACT-109", title: "Add advanced track for Cloud Computing learners", assignedTo: "Meera J", priority: "low", dueDate: "2026-08-02", status: "open", progress: 0, notes: "" },
  { id: "ACT-110", title: "Set up dedicated doubt-clearing time slot", assignedTo: "Priya N", priority: "high", dueDate: "2026-07-05", status: "completed", progress: 100, notes: "New slot added Tue/Thu 5-6pm, well received.", completedDate: "2026-07-04" },
  { id: "ACT-111", title: "Improve lab facilities for MERN Stack batch", assignedTo: "Karthik S", priority: "medium", dueDate: "2026-07-22", status: "in-progress", progress: 45, notes: "New systems ordered, installation pending." },
  { id: "ACT-112", title: "Add group project component to MERN course", assignedTo: "Karthik S", priority: "low", dueDate: "2026-08-05", status: "open", progress: 0, notes: "" },
];

export const priorityOptions = [
  { value: "all", label: "All Priorities" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

export const statusOptions = [
  { value: "all", label: "All Statuses" },
  { value: "open", label: "Open" },
  { value: "in-progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "overdue", label: "Overdue" },
];