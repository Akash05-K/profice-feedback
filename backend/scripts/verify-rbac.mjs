/**
 * End-to-end RBAC + program-isolation verification.
 *
 * Signs in as every seeded role and asserts, against the live API, that each
 * login behaves exactly as specified:
 *   - IBM and Oracle Program Managers never observe each other's trainers,
 *     courses, batches, actions, uploads or reports.
 *   - Management (CEO/MD) can read everything but write nothing, and has no
 *     Action Tracker at all.
 *   - ACE Lead has full Super Admin parity plus user management.
 *   - Trainers see only their own feedback.
 *   - Account creation is not open to the public.
 *
 * Usage:  npm run verify:rbac            (expects the API on :5000)
 *         API_URL=http://host:port npm run verify:rbac
 *
 * Uses only Node built-ins — no test framework or extra dependency.
 */

const BASE = (process.env.API_URL || "http://localhost:5000").replace(/\/$/, "") + "/api/v1";

const IBM_TRAINERS = ["Akash", "Harsha", "Theesthan", "Lokesh", "Harish"];
const ORACLE_TRAINERS = ["Anand R", "Arun P", "Divya S", "Keerthana R", "Nivetha M"];
const IBM_COURSES = ["AI & ML", "Cloud Computing", "Data Analytics", "Python Full Stack", "DAA"];
const ORACLE_COURSES = ["Java Full Stack", "Blockchain", "UI/UX Design", "Business Analytics", "DevOps Engineering"];

const ACCOUNTS = {
  admin: { email: "admin@profice.edu", password: "admin123" },
  aceLead: { email: "acelead@profice.edu", password: "ace123" },
  management: { email: "management@profice.edu", password: "manage123" },
  ibmPm: { email: "ibm_pm@profice.edu", password: "pm123" },
  oraclePm: { email: "oracle_pm@profice.edu", password: "pm123" },
  trainerAkash: { email: "akash@profice.edu", password: "trainer123" },
};

let passed = 0;
const failures = [];

const check = (name, condition, detail = "") => {
  if (condition) {
    passed += 1;
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
    console.log(`  \x1b[31m✗\x1b[0m ${name}${detail ? ` — ${detail}` : ""}`);
  }
};

const section = (title) => console.log(`\n\x1b[1m${title}\x1b[0m`);

/** Returns { status, body } — never throws on a non-2xx, so we can assert on it. */
const request = async (path, { token, method = "GET", body, raw = false } = {}) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (raw) return { status: res.status, body: await res.text() };

  const text = await res.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = { raw: text };
  }
  return { status: res.status, body: parsed };
};

const login = async ({ email, password }) => {
  const res = await request("/auth/login", { method: "POST", body: { email, password } });
  if (res.status !== 200 || !res.body?.data?.token) {
    throw new Error(`Login failed for ${email} (status ${res.status}). Did you run \`npm run prisma:seed\`?`);
  }
  return res.body.data.token;
};

/** Collect every string in an arbitrary payload, so we can scan for leaked names. */
const flattenStrings = (value, acc = []) => {
  if (typeof value === "string") acc.push(value);
  else if (Array.isArray(value)) value.forEach((v) => flattenStrings(v, acc));
  else if (value && typeof value === "object") Object.values(value).forEach((v) => flattenStrings(v, acc));
  return acc;
};

const mentionsAny = (payload, names) => {
  const haystack = flattenStrings(payload).join(" | ");
  return names.filter((name) => haystack.includes(name));
};

const namesFrom = (rows, key = "name") =>
  (Array.isArray(rows) ? rows : []).map((r) => r[key]).filter((n) => n && n !== "Overall Classification");

async function verifyProgramManager(label, token, ownTrainers, otherTrainers, ownCourses, otherCourses) {
  section(`${label} — data isolation`);

  const trainers = await request("/trainers", { token });
  const trainerNames = namesFrom(trainers.body?.data);
  check(
    `${label}: trainer list is exactly their own 5`,
    ownTrainers.every((n) => trainerNames.includes(n)) && trainerNames.length === ownTrainers.length,
    `got [${trainerNames.join(", ")}]`
  );
  check(
    `${label}: trainer list excludes the other team`,
    mentionsAny(trainers.body, otherTrainers).length === 0,
    `leaked ${mentionsAny(trainers.body, otherTrainers).join(", ")}`
  );

  const courses = await request("/courses", { token });
  const courseNames = namesFrom(courses.body?.data);
  check(
    `${label}: course list is exactly their own 5`,
    ownCourses.every((c) => courseNames.includes(c)) && courseNames.length === ownCourses.length,
    `got [${courseNames.join(", ")}]`
  );
  check(
    `${label}: course list excludes the other team`,
    mentionsAny(courses.body, otherCourses).length === 0
  );

  // Batch Insights had no scoping at all before this change.
  const batches = await request("/batches", { token });
  check(
    `${label}: batches leak no other-team trainer`,
    mentionsAny(batches.body, otherTrainers).length === 0,
    `leaked ${mentionsAny(batches.body, otherTrainers).join(", ")}`
  );

  const actions = await request("/actions", { token });
  check(
    `${label}: action tracker leaks no other-team trainer`,
    mentionsAny(actions.body, otherTrainers).length === 0,
    `leaked ${mentionsAny(actions.body, otherTrainers).join(", ")}`
  );

  const filterOptions = await request("/trainers/filter-options", { token });
  check(
    `${label}: trainer filter dropdown excludes the other team`,
    mentionsAny(filterOptions.body, otherTrainers).length === 0
  );

  const feedbackFilters = await request("/feedback/filter-options", { token });
  check(
    `${label}: repository filters exclude the other team`,
    mentionsAny(feedbackFilters.body, otherTrainers).length === 0
  );

  const reports = await request("/reports/data", { token });
  check(
    `${label}: report data leaks no other-team trainer`,
    mentionsAny(reports.body, otherTrainers).length === 0
  );

  const feedback = await request("/feedback", { token });
  check(
    `${label}: feedback repository leaks no other-team trainer`,
    mentionsAny(feedback.body, otherTrainers).length === 0
  );

  const aiRecs = await request("/ai/recommendations", { token });
  check(
    `${label}: AI recommendations leak no other-team trainer`,
    mentionsAny(aiRecs.body, otherTrainers).length === 0
  );

  return { trainerNames, courseNames };
}

async function main() {
  console.log(`\nVerifying RBAC against ${BASE}\n${"=".repeat(60)}`);

  const health = await request("/health");
  if (health.status !== 200) {
    console.error(`\n\x1b[31mAPI is not reachable at ${BASE}.\x1b[0m Start it with \`npm run dev\` first.\n`);
    process.exit(1);
  }

  const tokens = {};
  for (const [key, creds] of Object.entries(ACCOUNTS)) {
    tokens[key] = await login(creds);
  }

  // ---------------------------------------------------------------- isolation
  await verifyProgramManager("IBM PM", tokens.ibmPm, IBM_TRAINERS, ORACLE_TRAINERS, IBM_COURSES, ORACLE_COURSES);
  await verifyProgramManager("Oracle PM", tokens.oraclePm, ORACLE_TRAINERS, IBM_TRAINERS, ORACLE_COURSES, IBM_COURSES);

  // -------------------------------------------------- cross-program targeting
  section("Cross-program access is refused, not silently empty");

  const allTrainers = await request("/trainers", { token: tokens.admin });
  const oracleTrainer = (allTrainers.body?.data || []).find((t) => t.name === "Anand R");
  const ibmTrainer = (allTrainers.body?.data || []).find((t) => t.name === "Akash");

  if (oracleTrainer) {
    const denied = await request(`/trainers/${oracleTrainer.id}/metrics`, { token: tokens.ibmPm });
    check("IBM PM requesting an Oracle trainer's metrics gets 403", denied.status === 403, `got ${denied.status}`);
  }
  if (ibmTrainer) {
    const denied = await request(`/trainers/${ibmTrainer.id}/metrics`, { token: tokens.oraclePm });
    check("Oracle PM requesting an IBM trainer's metrics gets 403", denied.status === 403, `got ${denied.status}`);
  }

  const allCourses = await request("/courses", { token: tokens.admin });
  const oracleCourse = (allCourses.body?.data || []).find((c) => c.name === "Blockchain");
  if (oracleCourse) {
    const denied = await request(`/courses/${oracleCourse.id}/metrics`, { token: tokens.ibmPm });
    check("IBM PM requesting an Oracle course's metrics gets 403", denied.status === 403, `got ${denied.status}`);
  }

  // An action assigned to another program's trainer must be refused outright,
  // not quietly re-pointed at an arbitrary in-scope trainer.
  const misassign = await request("/actions", {
    token: tokens.ibmPm,
    method: "POST",
    body: { title: "RBAC probe — should be rejected", assignedTo: "Anand R", priority: "low", dueDate: "2026-12-01" },
  });
  check(
    "IBM PM cannot create an action for an Oracle trainer",
    misassign.status === 400,
    `got ${misassign.status} ${JSON.stringify(misassign.body?.message || "")}`
  );

  // Deleting another manager's upload session must 404 rather than succeed.
  const oracleSessions = await request("/upload/sessions", { token: tokens.oraclePm });
  const oracleSession = (oracleSessions.body?.data || [])[0];
  if (oracleSession) {
    const denied = await request(`/upload/sessions/${oracleSession.id}`, { token: tokens.ibmPm, method: "DELETE" });
    check("IBM PM cannot delete an Oracle upload session", denied.status === 404, `got ${denied.status}`);
  } else {
    console.log("  \x1b[33m•\x1b[0m no Oracle upload session present — skipping cross-delete probe");
  }

  // ---------------------------------------------------------------- management
  section("Management (CEO/MD) — read everything, write nothing");

  const mgmt = tokens.management;
  check("Management can read the dashboard", (await request("/dashboard/stats", { token: mgmt })).status === 200);
  check("Management can read reports", (await request("/reports/data", { token: mgmt })).status === 200);
  check("Management can read the feedback repository", (await request("/feedback", { token: mgmt })).status === 200);
  check("Management can read trainer insights", (await request("/trainers", { token: mgmt })).status === 200);
  check("Management can read course insights", (await request("/courses", { token: mgmt })).status === 200);

  check(
    "Management CANNOT list upload sessions",
    (await request("/upload/sessions", { token: mgmt })).status === 403
  );
  check(
    "Management CANNOT open the action tracker",
    (await request("/actions", { token: mgmt })).status === 403
  );
  check(
    "Management CANNOT create an action",
    (await request("/actions", { token: mgmt, method: "POST", body: { title: "x", assignedTo: "Akash", dueDate: "2026-12-01" } })).status === 403
  );
  check(
    "Management CANNOT delete feedback",
    (await request("/feedback/FB-1001", { token: mgmt, method: "DELETE" })).status === 403
  );
  check(
    "Management CANNOT bulk-action feedback",
    (await request("/feedback/bulk-action", { token: mgmt, method: "POST", body: { ids: ["FB-1001"], action: "delete" } })).status === 403
  );
  check(
    "Management CANNOT manage users",
    (await request("/users", { token: mgmt })).status === 403
  );

  // ------------------------------------------------------------------ ace lead
  section("ACE Lead — full Super Admin parity");

  for (const [path, label] of [
    ["/users", "user management"],
    ["/reports/data", "reports"],
    ["/actions", "action tracker"],
    ["/upload/sessions", "upload sessions"],
    ["/dashboard/stats", "dashboard"],
    ["/feedback", "feedback repository"],
    ["/trainers", "trainer insights"],
    ["/courses", "course insights"],
  ]) {
    const res = await request(path, { token: tokens.aceLead });
    check(`ACE Lead can access ${label}`, res.status === 200, `got ${res.status}`);
  }

  const aceTrainers = await request("/trainers", { token: tokens.aceLead });
  const aceNames = namesFrom(aceTrainers.body?.data);
  check(
    "ACE Lead sees both programs' trainers (unrestricted)",
    IBM_TRAINERS.every((n) => aceNames.includes(n)) && ORACLE_TRAINERS.every((n) => aceNames.includes(n))
  );

  // ------------------------------------------------------------------- trainer
  section("Trainer — own data only");

  const trainerFeedback = await request("/feedback", { token: tokens.trainerAkash });
  check("Trainer can read their own feedback", trainerFeedback.status === 200, `got ${trainerFeedback.status}`);
  const foreign = mentionsAny(trainerFeedback.body, ORACLE_TRAINERS);
  check("Trainer sees no other-program trainer", foreign.length === 0, `leaked ${foreign.join(", ")}`);
  check("Trainer CANNOT manage users", (await request("/users", { token: tokens.trainerAkash })).status === 403);
  check("Trainer CANNOT open the action tracker", (await request("/actions", { token: tokens.trainerAkash })).status === 403);

  // -------------------------------------------------------------- registration
  section("Account creation is administrative only");

  const anon = await request("/auth/register", {
    method: "POST",
    body: { email: `probe${Date.now()}@example.com`, password: "hunter22", name: "Probe", role: "super_admin" },
  });
  check("Anonymous registration is rejected", anon.status === 401, `got ${anon.status}`);

  const pmCreate = await request("/users", {
    token: tokens.ibmPm,
    method: "POST",
    body: { email: `probe${Date.now()}@example.com`, password: "hunter22", name: "Probe", role: "trainer", program: "IBM" },
  });
  check("Program Manager cannot create users", pmCreate.status === 403, `got ${pmCreate.status}`);

  // ACE Lead creating a scoped user, then cleaning it up.
  const probeEmail = `rbac-probe-${Date.now()}@profice.edu`;
  const created = await request("/users", {
    token: tokens.aceLead,
    method: "POST",
    body: { email: probeEmail, password: "probe123", name: "RBAC Probe", role: "program_manager", program: "Oracle" },
  });
  check("ACE Lead can create a Program Manager", created.status === 201, `got ${created.status}`);

  if (created.status === 201) {
    const probeToken = await login({ email: probeEmail, password: "probe123" });
    const probeTrainers = await request("/trainers", { token: probeToken });
    const probeNames = namesFrom(probeTrainers.body?.data);
    check(
      "A newly created Oracle PM is scoped to Oracle immediately",
      ORACLE_TRAINERS.every((n) => probeNames.includes(n)) && mentionsAny(probeTrainers.body, IBM_TRAINERS).length === 0,
      `got [${probeNames.join(", ")}]`
    );

    const removed = await request(`/users/${created.body.data.id}`, { token: tokens.aceLead, method: "DELETE" });
    check("ACE Lead can delete a user", removed.status === 200, `got ${removed.status}`);
  }

  const missingProgram = await request("/users", {
    token: tokens.aceLead,
    method: "POST",
    body: { email: `noprog${Date.now()}@profice.edu`, password: "probe123", name: "No Program", role: "program_manager" },
  });
  check(
    "Creating a Program Manager without a program is rejected",
    missingProgram.status === 400,
    `got ${missingProgram.status}`
  );

  // --------------------------------------------------------------- notifications
  section("Notifications are private to their owner");

  const adminNotifs = await request("/notifications", { token: tokens.admin });
  const pmNotifs = await request("/notifications", { token: tokens.ibmPm });
  const adminIds = new Set((adminNotifs.body?.data || []).map((n) => n.id));
  const overlap = (pmNotifs.body?.data || []).filter((n) => adminIds.has(n.id));
  check("One user's notifications never appear in another's list", overlap.length === 0, `${overlap.length} shared`);

  // ------------------------------------------------------------------- summary
  console.log(`\n${"=".repeat(60)}`);
  if (failures.length === 0) {
    console.log(`\x1b[32m\x1b[1mAll ${passed} checks passed.\x1b[0m\n`);
    process.exit(0);
  }
  console.log(`\x1b[31m\x1b[1m${failures.length} check(s) failed\x1b[0m (${passed} passed):\n`);
  failures.forEach((f) => console.log(`  \x1b[31m✗\x1b[0m ${f}`));
  console.log("");
  process.exit(1);
}

main().catch((err) => {
  console.error(`\n\x1b[31mVerification aborted:\x1b[0m ${err.message}\n`);
  process.exit(1);
});
