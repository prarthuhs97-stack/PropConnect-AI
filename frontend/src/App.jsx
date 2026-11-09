import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "./api";
import "./App.css";
import {
  EmptyState,
  Field,
  Icon,
  ProjectArt,
  StatusBadge,
  TypingDots,
  formatDate,
  formatDay,
  formatPrice,
  formatPriceRange,
  formatTime,
  initials,
  pick,
  statusLabel,
} from "./ui";

// Same default the original admin link used (http://localhost:8000/docs).
const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");
const DOCS_URL = `${API_BASE}/docs`;

const SUGGESTIONS = [
  "What configurations are available?",
  "What is the price range?",
  "Can I schedule a site visit?",
];

const BHK_OPTIONS = ["2 BHK", "3 BHK"];
const TIMELINES = ["Immediately", "Within 3 months", "Within 6 months", "Just exploring"];

// value is sent to the API unchanged; label is display only
const LEAD_STATUSES = [
  ["new", "New"],
  ["contacted", "Contacted"],
  ["qualified", "Qualified"],
  ["site_visit", "Site visit"],
  ["converted", "Converted"],
  ["lost", "Lost"],
];

const BUYER_TABS = [
  { id: "assistant", label: "Assistant", icon: "chat" },
  { id: "requirements", label: "Requirements", icon: "file" },
  { id: "visits", label: "Site visits", icon: "calendar" },
  { id: "enquiries", label: "My enquiries", icon: "user" },
];

let messageCounter = 0;
const nextId = () => `m${Date.now()}-${messageCounter++}`;

function budgetText(min, max) {
  return formatPriceRange(min, max, "Not specified");
}

function App() {
  // ---- original state (unchanged names where possible) -------------------
  const [projects, setProjects] = useState([]);
  const [user, setUser] = useState(null);
  const [mode, setMode] = useState("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({ name: "", email: "", password: "" });

  const [projectId, setProjectId] = useState("");
  const [question, setQuestion] = useState("");
  const [lead, setLead] = useState({
    bhk: "2 BHK",
    budget_min: "",
    budget_max: "",
    purchase_timeline: "Within 3 months",
    contact_consent: false,
  });
  const [leads, setLeads] = useState([]);
  const [slots, setSlots] = useState([]);
  const [bookings, setBookings] = useState([]);

  // ---- new UI state -------------------------------------------------------
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [authChecking, setAuthChecking] = useState(() => Boolean(localStorage.getItem("token")));
  const [chats, setChats] = useState({}); // { [projectId]: [{id, role, text, ...}] }
  const [asking, setAsking] = useState(false);
  const [tab, setTab] = useState("assistant");
  const [submitting, setSubmitting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsLoaded, setSlotsLoaded] = useState(false);
  const [bookingSlotId, setBookingSlotId] = useState(null);
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [updatingLeadId, setUpdatingLeadId] = useState(null);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [salesFilter, setSalesFilter] = useState("all");
  const [salesSearch, setSalesSearch] = useState("");
  const [adminSlots, setAdminSlots] = useState(null); // { [projectId]: number|null }
  const [adminStats, setAdminStats] = useState(null);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [creatingProject, setCreatingProject] = useState(false);
const [showSlotForm, setShowSlotForm] = useState(false);
const [creatingSlot, setCreatingSlot] = useState(false);

const [slotForm, setSlotForm] = useState({
  project_id: "",
  visit_date: "",
  start_time: "",
});
  const [projectForm, setProjectForm] = useState({
  name: "",
  location: "",
  description: "",
  min_price: "",
  max_price: "",
  });

  const authRef = useRef(null);
  const chatBodyRef = useRef(null);

  // ---- boot ---------------------------------------------------------------
  useEffect(() => {
    loadProjects();
    if (localStorage.getItem("token")) {
      loadUser();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadProjects() {
    setProjectsLoading(true);
    try {
      const data = await api("/projects/");
      setProjects(data);
      if (data.length) setProjectId(String(data[0].id));
    } catch (err) {
      setError("Could not load projects. Check that the backend is running and CORS is enabled.");
    } finally {
      setProjectsLoading(false);
    }
  }

  async function handleCreateProject(e) {
  e.preventDefault();
  setCreatingProject(true);
  setError("");
  setMessage("");

  const minPrice = projectForm.min_price.trim();
  const maxPrice = projectForm.max_price.trim();

  if (
    (minPrice && Number(minPrice) < 0) ||
    (maxPrice && Number(maxPrice) < 0) ||
    (minPrice && maxPrice && Number(minPrice) > Number(maxPrice))
  ) {
    setError("Please enter a valid price range.");
    setCreatingProject(false);
    return;
  }

  try {
    const created = await api("/projects/", {
      method: "POST",
      body: JSON.stringify({
        name: projectForm.name.trim(),
        location: projectForm.location.trim(),
        description: projectForm.description.trim() || null,
        min_price: minPrice ? Number(minPrice) : null,
        max_price: maxPrice ? Number(maxPrice) : null,
      }),
    });

    await loadProjects();
    setProjectId(String(created.id));

    setProjectForm({
      name: "",
      location: "",
      description: "",
      min_price: "",
      max_price: "",
    });

    setShowProjectForm(false);
    setMessage("Project created successfully!");
  } catch (err) {
    setError(err.message);
  } finally {
    setCreatingProject(false);
  }
}
async function handleCreateSlot(e) {
  e.preventDefault();
  setCreatingSlot(true);
  setError("");
  setMessage("");

  try {
    await api("/visits/slots", {
      method: "POST",
      body: JSON.stringify({
        project_id: Number(slotForm.project_id),
        visit_date: slotForm.visit_date,
        start_time: slotForm.start_time,
      }),
    });

    setSlotForm({
      project_id: "",
      visit_date: "",
      start_time: "",
    });

    setShowSlotForm(false);
    setMessage("Visit slot created successfully!");
  } catch (err) {
    setError(err.message);
  } finally {
    setCreatingSlot(false);
  }
}
  async function loadUser() {
    try {
      const data = await api("/auth/me");
      setUser(data);
      setError("");
    } catch {
      localStorage.removeItem("token");
      setUser(null);
    } finally {
      setAuthChecking(false);
    }
  }

  // ---- auth ---------------------------------------------------------------
  async function handleAuth(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (mode === "register") {
        await api("/auth/register", {
          method: "POST",
          body: JSON.stringify(form),
        });
        setMessage("Registration successful. Please log in.");
        setMode("login");
      } else {
        const data = await api("/auth/login", {
          method: "POST",
          body: JSON.stringify({
            email: form.email,
            password: form.password,
          }),
        });

        localStorage.setItem("token", data.access_token);
        const currentUser = await api("/auth/me");
        setUser(currentUser);
        setTab("assistant");
        setMessage("Login successful!");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("token");
    setUser(null);
    setLeads([]);
    setBookings([]);
    setSlots([]);
    setSlotsLoaded(false);
    setChats({});
    setJustSubmitted(false);
    setSelectedLeadId("");
    setSalesFilter("all");
    setSalesSearch("");
    setMessage("You have logged out.");
  }

  function switchMode() {
    setMode(mode === "login" ? "register" : "login");
    setError("");
    setMessage("");
  }

  // ---- chatbot ------------------------------------------------------------
  function pushChat(pid, entry) {
    setChats((prev) => ({ ...prev, [pid]: [...(prev[pid] || []), entry] }));
  }

  async function askAssistant(e, preset) {
    if (e) e.preventDefault();
    const text = String(preset !== undefined ? preset : question).trim();
    if (!text || asking || !projectId) return;

    const pid = projectId;
    setError("");
    setQuestion("");
    setAsking(true);
    pushChat(pid, { id: nextId(), role: "user", text });

    try {
      const data = await api("/chat/ask", {
        method: "POST",
        body: JSON.stringify({
          project_id: Number(pid),
          question: text,
        }),
      });

      const ids = Array.isArray(data.source_fact_ids)
        ? data.source_fact_ids
        : data.source_fact_id != null
        ? [data.source_fact_id]
        : [];

      pushChat(pid, {
        id: nextId(),
        role: "assistant",
        text: data.answer || "No answer was returned.",
        grounded: data.grounded,
        status: data.status,
        sources: ids,
        contactSales: data.contact_sales === true,
      });
    } catch (err) {
      pushChat(pid, {
        id: nextId(),
        role: "assistant",
        text: err.message || "Sorry, I could not get an answer just now.",
        failed: true,
      });
    } finally {
      setAsking(false);
    }
  }

  // ---- buyer: requirements / handoff ---------------------------------------
  async function createLead(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setJustSubmitted(false);

    if (!projectId) {
      setError("Please select a project first.");
      return;
    }
    if (lead.budget_min && lead.budget_max && Number(lead.budget_min) > Number(lead.budget_max)) {
      setError("Minimum budget cannot be higher than maximum budget.");
      return;
    }

    setSubmitting(true);
    try {
      const requirements = {
        project_id: Number(projectId),
        bhk: lead.bhk,
        budget_min: lead.budget_min ? Number(lead.budget_min) : null,
        budget_max: lead.budget_max ? Number(lead.budget_max) : null,
        purchase_timeline: lead.purchase_timeline,
        contact_consent: lead.contact_consent,
        source: "website",
      };

      if (lead.contact_consent) {
        // Same summary as before, built from the latest exchange in the chat.
        const thread = chats[projectId] || [];
        const lastUser = [...thread].reverse().find((m) => m.role === "user");
        const lastAnswer = [...thread].reverse().find((m) => m.role === "assistant" && !m.failed);

        const summary = [
          `Buyer is interested in a ${lead.bhk} apartment.`,
          `Budget: ${lead.budget_min || "Not specified"} to ${lead.budget_max || "Not specified"} rupees.`,
          `Purchase timeline: ${lead.purchase_timeline}.`,
          lastUser ? `Recent question: ${lastUser.text}.` : "",
          lastAnswer ? `Assistant response: ${lastAnswer.text}.` : "",
          "Buyer has consented to sales team follow-up.",
        ]
          .filter(Boolean)
          .join(" ");

        await api("/leads/handoff", {
          method: "POST",
          body: JSON.stringify({
            ...requirements,
            conversation_summary: summary,
          }),
        });

        setMessage("Requirements submitted! Your enquiry has been shared with the sales team.");
      } else {
        await api("/leads/", {
          method: "POST",
          body: JSON.stringify(requirements),
        });

        setMessage("Your requirements have been submitted!");
      }

      setJustSubmitted(true);
      setSelectedLeadId(""); // so the newest enquiry is selected after reload
      loadBuyerData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // ---- buyer: data, slots, booking -----------------------------------------
  async function loadBuyerData() {
    setDataLoading(true);
    try {
      const [myLeads, myBookings] = await Promise.all([api("/leads/my"), api("/visits/my")]);
      setLeads(myLeads);
      setBookings(myBookings);
    } catch (err) {
      setError(err.message);
    } finally {
      setDataLoading(false);
    }
  }

  async function loadSlots() {
    if (!projectId) return;
    setSlotsLoading(true);
    try {
      const data = await api(`/visits/slots?project_id=${projectId}`);
      setSlots(data);
      setSlotsLoaded(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSlotsLoading(false);
    }
  }

  async function bookVisit(slotId, leadId) {
    setError("");
    setMessage("");
    setBookingSlotId(slotId);

    try {
      await api("/visits/book", {
        method: "POST",
        body: JSON.stringify({
          lead_id: Number(leadId),
          slot_id: Number(slotId),
        }),
      });
      setMessage("Site visit booked successfully!");
      loadBuyerData();
      loadSlots();
    } catch (err) {
      setError(err.message);
    } finally {
      setBookingSlotId(null);
    }
  }

  // ---- salesperson ---------------------------------------------------------
  async function loadAssignedLeads() {
    setLeadsLoading(true);
    try {
      const data = await api("/leads/assigned");
      setLeads(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLeadsLoading(false);
    }
  }

  async function updateLeadStatus(leadId, status) {
    setUpdatingLeadId(leadId);
    try {
      await api(`/leads/${leadId}/status?new_status=${encodeURIComponent(status)}`, {
        method: "PUT",
      });
      setMessage("Lead status updated.");
      await loadAssignedLeads();
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingLeadId(null);
    }
  }

  async function loadAdminDashboard() {
  try {
    const data = await api("/admin/dashboard");
    setAdminStats(data);
  } catch (err) {
    setError(err.message);
  }
}

  // ---- effects -------------------------------------------------------------
  useEffect(() => {
    if (user?.role === "buyer") loadBuyerData();
    if (user?.role === "salesperson") loadAssignedLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Slots refresh whenever the buyer picks another project.
  useEffect(() => {
    if (user?.role === "buyer" && projectId) {
      setSlots([]);
      setSlotsLoaded(false);
      loadSlots();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, projectId]);

  // Keep a valid enquiry selected for booking (defaults to the newest).
  useEffect(() => {
    if (user?.role !== "buyer") return;
    if (!leads.length) {
      setSelectedLeadId("");
      return;
    }
    if (!leads.some((l) => String(l.id) === String(selectedLeadId))) {
      const latest = leads.reduce((a, b) => (Number(b.id) > Number(a.id) ? b : a));
      setSelectedLeadId(String(latest.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads, user]);

  useEffect(() => {
  if (user?.role === "admin") {
    loadAdminDashboard();
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [user]);

  // Admin: real slot counts per project (only data the API already exposes).
  useEffect(() => {
    if (user?.role !== "admin" || !projects.length) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        projects.map(async (p) => {
          try {
            const result = await api(`/visits/slots?project_id=${p.id}`);
            return [p.id, Array.isArray(result) ? result.length : null];
          } catch {
            return [p.id, null];
          }
        })
      );
      if (!cancelled) setAdminSlots(Object.fromEntries(entries));
    })();
    return () => {
      cancelled = true;
    };
  }, [user, projects]);

  // Toasts auto-dismiss.
  useEffect(() => {
    if (!message) return undefined;
    const t = setTimeout(() => setMessage(""), 6000);
    return () => clearTimeout(t);
  }, [message]);
  useEffect(() => {
    if (!error) return undefined;
    const t = setTimeout(() => setError(""), 9000);
    return () => clearTimeout(t);
  }, [error]);

  // Keep the chat scrolled to the latest message.
  const thread = chats[projectId] || [];
  useEffect(() => {
    const el = chatBodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [thread.length, asking, tab]);

  // ---- derived -------------------------------------------------------------
  const selectedProject = projects.find((p) => String(p.id) === String(projectId));

  const sortedSlots = useMemo(
    () =>
      [...slots].sort((a, b) =>
        `${a.visit_date} ${a.start_time}`.localeCompare(`${b.visit_date} ${b.start_time}`)
      ),
    [slots]
  );

  const statusCounts = useMemo(() => {
    const counts = {};
    leads.forEach((l) => {
      counts[l.status] = (counts[l.status] || 0) + 1;
    });
    return counts;
  }, [leads]);

  const projectName = (id) => {
    const p = projects.find((x) => String(x.id) === String(id));
    return p ? p.name : undefined;
  };

  const filteredLeads = useMemo(() => {
    const needle = salesSearch.trim().toLowerCase();
    return leads.filter((l) => {
      if (salesFilter !== "all" && l.status !== salesFilter) return false;
      if (!needle) return true;
      const haystack = [
        `lead ${l.id}`,
        l.bhk,
        l.purchase_timeline,
        l.status,
        pick(l, ["source", "lead_source"]),
        pick(l, ["conversation_summary", "summary", "handoff_summary"]),
        projectName(l.project_id),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads, salesFilter, salesSearch, projects]);

  function scrollToAuth() {
    if (authRef.current) authRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  // =========================================================================
  // Views (plain render functions, so inputs never lose focus on re-render)
  // =========================================================================

  function renderLandingProject(project, index) {
    const rera = pick(project, ["rera_number", "rera_registration_number", "rera"]);
    return (
      <article className="project-card" key={project.id}>
        <ProjectArt index={index} src={pick(project, ["image_url", "image"])} name={project.name} />
        <div className="project-body">
          <p className="eyebrow">Residential project</p>
          <h3>{project.name}</h3>
          {project.location && (
            <p className="meta">
              <Icon name="pin" size={14} /> {project.location}
            </p>
          )}
          {project.description && <p className="desc">{project.description}</p>}
          <div className="project-foot">
            <div>
              <span className="label">Price range</span>
              <strong>{formatPriceRange(project.min_price, project.max_price)}</strong>
            </div>
            {rera && <span className="chip">RERA {rera}</span>}
          </div>
          <button type="button" className="btn btn-ghost btn-block" onClick={scrollToAuth}>
            Sign in to explore <Icon name="arrow" size={16} />
          </button>
        </div>
      </article>
    );
  }

  function renderLanding() {
    return (
      <>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">Property discovery, simplified</p>
            <h1>
              Find a home you love, with answers you can <em>trust.</em>
            </h1>
            <p className="lead">
              Explore residential projects, ask the AI Property Assistant about verified project
              details, share what you are looking for and book a site visit, all in one place.
            </p>
            <ul className="value-list">
              <li>
                <span className="value-icon">
                  <Icon name="shield" />
                </span>
                <div>
                  <strong>Answers from approved information</strong>
                  <p>The assistant is designed to answer only from verified project facts.</p>
                </div>
              </li>
              <li>
                <span className="value-icon">
                  <Icon name="calendar" />
                </span>
                <div>
                  <strong>Real visit slots</strong>
                  <p>Pick from the slots the sales team has actually opened.</p>
                </div>
              </li>
              <li>
                <span className="value-icon">
                  <Icon name="lock" />
                </span>
                <div>
                  <strong>You control contact</strong>
                  <p>Your details are shared with sales only when you give consent.</p>
                </div>
              </li>
            </ul>
          </div>

          <section className="auth-card" ref={authRef} aria-labelledby="auth-title">
            <div className="segmented" role="tablist" aria-label="Account">
              <button
                type="button"
                role="tab"
                aria-selected={mode === "login"}
                className={mode === "login" ? "active" : ""}
                onClick={() => mode !== "login" && switchMode()}
              >
                Sign in
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "register"}
                className={mode === "register" ? "active" : ""}
                onClick={() => mode !== "register" && switchMode()}
              >
                Create account
              </button>
            </div>

            <h2 id="auth-title">{mode === "login" ? "Welcome back" : "Create your account"}</h2>
            <p className="muted">
              {mode === "login"
                ? "Sign in to continue to your dashboard."
                : "Register as a buyer to start your enquiry."}
            </p>

            <form onSubmit={handleAuth} className="stack">
              {mode === "register" && (
                <Field label="Full name" htmlFor="auth-name">
                  <input
                    id="auth-name"
                    placeholder="Your full name"
                    required
                    autoComplete="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </Field>
              )}
              <Field label="Email address" htmlFor="auth-email">
                <input
                  id="auth-email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </Field>
              <Field label="Password" htmlFor="auth-password" hint="Minimum 8 characters">
                <input
                  id="auth-password"
                  type="password"
                  placeholder="Password"
                  required
                  minLength="8"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </Field>
              <button className="btn btn-primary btn-block" disabled={loading}>
                {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
              </button>
            </form>
          </section>
        </section>

        <section className="section">
          <div className="section-head">
            <div>
              <p className="eyebrow">Projects</p>
              <h2>Available projects</h2>
            </div>
          </div>
          {projectsLoading ? (
            <div className="project-grid">
              <div className="project-card skeleton" />
              <div className="project-card skeleton" />
            </div>
          ) : projects.length === 0 ? (
            <EmptyState icon="building" title="No projects to show">
              Projects will appear here once they are available from the backend.
            </EmptyState>
          ) : (
            <div className="project-grid">{projects.map(renderLandingProject)}</div>
          )}
        </section>
      </>
    );
  }

  // ---------------------------------------------------------------- buyer --
  function renderChatCard() {
    return (
      <section className="card chat-card" aria-label="AI Property Assistant">
        <header className="card-head">
          <div>
            <h3>AI Property Assistant</h3>
            <p className="muted">
              Asking about <strong>{selectedProject ? selectedProject.name : "your project"}</strong>
            </p>
          </div>
        </header>

        <div className="chat-body" ref={chatBodyRef} aria-live="polite">
          {thread.length === 0 && !asking && (
            <div className="chat-welcome">
              <span className="avatar assistant">
                <Icon name="building" size={18} />
              </span>
              <div>
                <strong>Hello {user?.name ? user.name.split(" ")[0] : ""}, how can I help?</strong>
                <p>
                  Ask about this project. If I cannot verify an answer, I will say so and offer to
                  connect you with the sales team.
                </p>
              </div>
            </div>
          )}

          {thread.map((m) => (
            <div className={`bubble-row ${m.role}`} key={m.id}>
              {m.role === "assistant" && (
                <span className="avatar assistant">
                  <Icon name="building" size={16} />
                </span>
              )}
              <div className={`bubble ${m.role}${m.failed ? " failed" : ""}`}>
                <p>{m.text}</p>
                {m.role === "assistant" && !m.failed && m.grounded === true && (
                  <span
                    className="verified"
                    title={m.sources.length ? `Fact IDs: ${m.sources.join(", ")}` : undefined}
                  >
                    <Icon name="shield" size={13} /> Verified from approved project facts
                    {m.sources.length > 0 && ` (${m.sources.length})`}
                  </span>
                )}
                {m.role === "assistant" && !m.failed && m.status !== "error" && (m.grounded === false || m.contactSales) && (
                  <div className="bubble-note">
                    <span>Not in the verified project information.</span>
                    <button type="button" className="link" onClick={() => setTab("requirements")}>
                      Share requirements with sales <Icon name="arrow" size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {asking && (
            <div className="bubble-row assistant">
              <span className="avatar assistant">
                <Icon name="building" size={16} />
              </span>
              <div className="bubble assistant">
                <TypingDots />
              </div>
            </div>
          )}
        </div>

        <div className="suggestions" aria-label="Suggested questions">
          {SUGGESTIONS.map((s) => (
            <button
              type="button"
              key={s}
              className="suggestion"
              disabled={asking || !projectId}
              onClick={() => askAssistant(null, s)}
            >
              {s}
            </button>
          ))}
        </div>

        <form className="chat-input" onSubmit={askAssistant}>
          <input
            aria-label="Your question"
            placeholder="Ask about price, location, amenities..."
            value={question}
            maxLength={1000}
            onChange={(e) => setQuestion(e.target.value)}
            required
          />
          <button className="btn btn-primary" disabled={asking || !projectId}>
            <Icon name="send" size={16} /> <span className="hide-sm">Send</span>
          </button>
        </form>
      </section>
    );
  }

  function renderProjectSummary() {
    if (!selectedProject) return null;
    const rera = pick(selectedProject, ["rera_number", "rera_registration_number", "rera"]);
    return (
      <aside className="card side-card">
        <h3>{selectedProject.name}</h3>
        {selectedProject.location && (
          <p className="meta">
            <Icon name="pin" size={14} /> {selectedProject.location}
          </p>
        )}
        <dl className="facts">
          <div>
            <dt>Price range</dt>
            <dd>{formatPriceRange(selectedProject.min_price, selectedProject.max_price)}</dd>
          </div>
          {rera && (
            <div>
              <dt>RERA registration</dt>
              <dd>{rera}</dd>
            </div>
          )}
        </dl>
        {selectedProject.description && <p className="desc">{selectedProject.description}</p>}
        <div className="note">
          <Icon name="info" size={16} />
          <p>Final pricing and offers are confirmed by the sales team.</p>
        </div>
      </aside>
    );
  }

  function renderRequirements() {
    return (
      <div className="two-col">
        <section className="card">
          <header className="card-head">
            <div>
              <h3>Share your requirements</h3>
              <p className="muted">
                {selectedProject ? (
                  <>
                    For <strong>{selectedProject.name}</strong>
                  </>
                ) : (
                  "Select a project above."
                )}
              </p>
            </div>
          </header>

          <form onSubmit={createLead} className="stack">
            <div className="form-grid">
              <Field label="Preferred configuration" htmlFor="lead-bhk">
                <select
                  id="lead-bhk"
                  value={lead.bhk}
                  onChange={(e) => setLead({ ...lead, bhk: e.target.value })}
                >
                  {BHK_OPTIONS.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </Field>

              <Field label="Purchase timeline" htmlFor="lead-timeline">
                <select
                  id="lead-timeline"
                  value={lead.purchase_timeline}
                  onChange={(e) => setLead({ ...lead, purchase_timeline: e.target.value })}
                >
                  {TIMELINES.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </Field>

              <Field
                label="Minimum budget (₹)"
                htmlFor="lead-min"
                hint={formatPrice(lead.budget_min) || "Example: 6500000"}
              >
                <input
                  id="lead-min"
                  type="number"
                  min="0"
                  placeholder="6500000"
                  value={lead.budget_min}
                  onChange={(e) => setLead({ ...lead, budget_min: e.target.value })}
                />
              </Field>

              <Field
                label="Maximum budget (₹)"
                htmlFor="lead-max"
                hint={formatPrice(lead.budget_max) || "Example: 12000000"}
              >
                <input
                  id="lead-max"
                  type="number"
                  min="0"
                  placeholder="12000000"
                  value={lead.budget_max}
                  onChange={(e) => setLead({ ...lead, budget_max: e.target.value })}
                />
              </Field>
            </div>

            <label className={`consent ${lead.contact_consent ? "on" : ""}`}>
              <input
                type="checkbox"
                checked={lead.contact_consent}
                onChange={(e) => setLead({ ...lead, contact_consent: e.target.checked })}
              />
              <span>
                <strong>I agree to be contacted by the sales team about this enquiry.</strong>
                <small>
                  {lead.contact_consent
                    ? "Your requirements and a summary of your chat will be shared with a salesperson."
                    : "Without consent, your requirements are saved but not shared for sales follow-up."}
                </small>
              </span>
            </label>

            <button className="btn btn-primary" disabled={submitting || !projectId}>
              {submitting ? "Submitting..." : "Submit requirements"}
            </button>
          </form>

          {justSubmitted && (
            <div className="callout success">
              <Icon name="check" size={18} />
              <div>
                <strong>Enquiry received.</strong>
                <p>You can now choose a site-visit slot for it.</p>
              </div>
              <button type="button" className="btn btn-ghost" onClick={() => setTab("visits")}>
                Book a visit
              </button>
            </div>
          )}
        </section>
        {renderProjectSummary()}
      </div>
    );
  }

  function renderVisits() {
    return (
      <div className="stack-lg">
        <section className="card">
          <header className="card-head">
            <div>
              <h3>Available site-visit slots</h3>
              <p className="muted">
                {selectedProject ? `Slots for ${selectedProject.name}` : "Select a project above."}
              </p>
            </div>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={loadSlots}
              disabled={slotsLoading || !projectId}
            >
              <Icon name="refresh" size={16} /> {slotsLoading ? "Loading..." : "Refresh"}
            </button>
          </header>

          {leads.length === 0 ? (
            <EmptyState
              icon="file"
              title="Submit your requirements first"
              action={
                <button type="button" className="btn btn-primary" onClick={() => setTab("requirements")}>
                  Share requirements
                </button>
              }
            >
              A site visit is booked against an enquiry, so you will need one before choosing a slot.
            </EmptyState>
          ) : (
            <>
              <Field label="Booking for enquiry" htmlFor="booking-lead">
                <select
                  id="booking-lead"
                  value={selectedLeadId}
                  onChange={(e) => setSelectedLeadId(e.target.value)}
                >
                  {leads.map((item) => {
                    const pn = projectName(item.project_id);
                    return (
                      <option key={item.id} value={item.id}>
                        Enquiry #{item.id} · {item.bhk}
                        {pn ? ` · ${pn}` : ""}
                      </option>
                    );
                  })}
                </select>
              </Field>

              {slotsLoading && !slotsLoaded ? (
                <div className="slot-grid">
                  <div className="slot-card skeleton" />
                  <div className="slot-card skeleton" />
                  <div className="slot-card skeleton" />
                </div>
              ) : sortedSlots.length === 0 ? (
                <EmptyState icon="calendar" title="No open slots right now">
                  There are no available slots for this project at the moment. Please check back soon.
                </EmptyState>
              ) : (
                <div className="slot-grid">
                  {sortedSlots.map((slot) => {
                    const day = formatDay(slot.visit_date);
                    const end = slot.end_time ? ` – ${formatTime(slot.end_time)}` : "";
                    return (
                      <article className="slot-card" key={slot.id}>
                        <div className="slot-date">
                          <span>{day.weekday}</span>
                          <strong>{day.day}</strong>
                          <span>{day.month}</span>
                        </div>
                        <div className="slot-info">
                          <p>
                            <Icon name="clock" size={15} /> {formatTime(slot.start_time)}
                            {end}
                          </p>
                          <button
                            type="button"
                            className="btn btn-primary btn-block"
                            disabled={bookingSlotId === slot.id || !selectedLeadId}
                            onClick={() => bookVisit(slot.id, selectedLeadId)}
                          >
                            {bookingSlotId === slot.id ? "Booking..." : "Book this slot"}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </section>

        <section className="card">
          <header className="card-head">
            <div>
              <h3>Your bookings</h3>
              <p className="muted">Site visits you have booked.</p>
            </div>
          </header>
          {bookings.length === 0 ? (
            <EmptyState icon="calendar" title="No bookings yet">
              Once you book a slot, it will show up here.
            </EmptyState>
          ) : (
            <ul className="rows">
              {bookings.map((b) => {
                const date = pick(b, ["visit_date"]);
                const time = pick(b, ["start_time"]);
                return (
                  <li key={b.id || b.slot_id}>
                    <div>
                      <strong>Booking #{b.id || b.slot_id}</strong>
                      <p className="muted">
                        {[
                          date ? formatDate(`${date}T00:00:00`) : "",
                          time ? formatTime(time) : "",
                          b.lead_id ? `Enquiry #${b.lead_id}` : "",
                        ]
                          .filter(Boolean)
                          .join(" · ") || "Site visit"}
                      </p>
                    </div>
                    <StatusBadge status={b.status} />
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    );
  }

  function renderEnquiries() {
    return (
      <section className="card">
        <header className="card-head">
          <div>
            <h3>Your enquiries</h3>
            <p className="muted">Track the progress of each enquiry you have submitted.</p>
          </div>
          <button type="button" className="btn btn-ghost" onClick={loadBuyerData} disabled={dataLoading}>
            <Icon name="refresh" size={16} /> {dataLoading ? "Loading..." : "Refresh"}
          </button>
        </header>
        {leads.length === 0 ? (
          <EmptyState
            icon="file"
            title="No enquiries yet"
            action={
              <button type="button" className="btn btn-primary" onClick={() => setTab("requirements")}>
                Share requirements
              </button>
            }
          >
            Tell us what you are looking for and we will take it from there.
          </EmptyState>
        ) : (
          <ul className="rows">
            {leads.map((item) => {
              const pn = projectName(item.project_id);
              const created = pick(item, ["created_at"]);
              return (
                <li key={item.id}>
                  <div>
                    <strong>
                      Enquiry #{item.id} · {item.bhk}
                    </strong>
                    <p className="muted">
                      {[
                        pn,
                        item.purchase_timeline,
                        budgetText(item.budget_min, item.budget_max) !== "Not specified"
                          ? budgetText(item.budget_min, item.budget_max)
                          : "",
                        created ? formatDate(created) : "",
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <StatusBadge status={item.status} />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    );
  }

  function renderBuyer() {
    return (
      <>
        <section className="welcome-card">
          <div>
            <p className="eyebrow">Buyer dashboard</p>
            <h1>Welcome, {user.name}</h1>
            <p className="lead">
              Ask questions, share what you need and book a site visit. We will help you take the
              next step.
            </p>
          </div>
          <dl className="stat-row">
            <div>
              <dt>Enquiries</dt>
              <dd>{leads.length}</dd>
            </div>
            <div>
              <dt>Visits booked</dt>
              <dd>{bookings.length}</dd>
            </div>
          </dl>
        </section>

        <section className="section tight" aria-label="Choose a project">
          <div className="section-head">
            <div>
              <p className="eyebrow">Your project</p>
              <h2>Choose a project</h2>
            </div>
          </div>
          {projectsLoading ? (
            <div className="project-strip">
              <div className="strip-card skeleton" />
              <div className="strip-card skeleton" />
            </div>
          ) : projects.length === 0 ? (
            <EmptyState icon="building" title="No projects available">
              Projects will appear here once they are available from the backend.
            </EmptyState>
          ) : (
            <div className="project-strip">
              {projects.map((p, i) => (
                <button
                  type="button"
                  key={p.id}
                  className={`strip-card ${String(p.id) === String(projectId) ? "selected" : ""}`}
                  aria-pressed={String(p.id) === String(projectId)}
                  onClick={() => setProjectId(String(p.id))}
                >
                  <ProjectArt index={i} src={pick(p, ["image_url", "image"])} name={p.name} />
                  <div className="strip-body">
                    <strong>{p.name}</strong>
                    {p.location && <span className="muted">{p.location}</span>}
                    <span className="price">{formatPriceRange(p.min_price, p.max_price)}</span>
                  </div>
                  {String(p.id) === String(projectId) && (
                    <span className="strip-check">
                      <Icon name="check" size={14} />
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </section>

        <nav className="tabs" role="tablist" aria-label="Buyer sections">
          {BUYER_TABS.map((t) => (
            <button
              type="button"
              role="tab"
              key={t.id}
              aria-selected={tab === t.id}
              className={tab === t.id ? "active" : ""}
              onClick={() => setTab(t.id)}
            >
              <Icon name={t.icon} size={16} /> {t.label}
            </button>
          ))}
        </nav>

        <div className="tab-panel">
          {tab === "assistant" && (
            <div className="two-col chat-layout">
              {renderChatCard()}
              {renderProjectSummary()}
            </div>
          )}
          {tab === "requirements" && renderRequirements()}
          {tab === "visits" && renderVisits()}
          {tab === "enquiries" && renderEnquiries()}
        </div>
      </>
    );
  }

  // ---------------------------------------------------------- salesperson --
  function renderLeadCard(item) {
    const summary = pick(item, ["conversation_summary", "summary", "handoff_summary"]);
    const source = pick(item, ["source", "lead_source"]);
    const pn = projectName(item.project_id);
    const created = pick(item, ["created_at"]);

    return (
      <article className="lead-card" key={item.id}>
        <header className="lead-head">
          <div>
            <h3>Lead #{item.id}</h3>
            <p className="muted">{[pn, created ? formatDate(created) : ""].filter(Boolean).join(" · ")}</p>
          </div>
          <StatusBadge status={item.status} />
        </header>

        <div className="pill-row">
          {item.contact_consent ? (
            <span className="pill pill-ok">
              <Icon name="check" size={13} /> Consent to contact
            </span>
          ) : (
            <span className="pill pill-warn">
              <Icon name="lock" size={13} /> No contact consent
            </span>
          )}
          {source && <span className="pill">Source: {statusLabel(source)}</span>}
        </div>

        <dl className="req-grid">
          <div>
            <dt>Configuration</dt>
            <dd>{item.bhk || "—"}</dd>
          </div>
          <div>
            <dt>Budget</dt>
            <dd>{budgetText(item.budget_min, item.budget_max)}</dd>
          </div>
          <div>
            <dt>Timeline</dt>
            <dd>{item.purchase_timeline || "—"}</dd>
          </div>
        </dl>

        <div className={`summary ${summary ? "" : "empty-summary"}`}>
          <span className="summary-label">
            <Icon name="chat" size={14} /> Conversation summary
          </span>
          <p>{summary || "No conversation summary was attached to this lead."}</p>
        </div>

        {!item.contact_consent && (
          <p className="caution">
            <Icon name="info" size={14} /> The buyer has not consented to contact, so "Contacted" is unavailable.
          </p>
        )}

        <Field label="Update status" htmlFor={`status-${item.id}`}>
          <select
            id={`status-${item.id}`}
            value={item.status}
            disabled={updatingLeadId === item.id}
            onChange={(e) => updateLeadStatus(item.id, e.target.value)}
          >
            {LEAD_STATUSES.filter(
              ([value]) => value !== "contacted" || item.contact_consent || item.status === "contacted"
            ).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
      </article>
    );
  }

  function renderSales() {
    const inProgress =
      (statusCounts.contacted || 0) + (statusCounts.qualified || 0) + (statusCounts.site_visit || 0);
    return (
      <>
        <section className="welcome-card">
          <div>
            <p className="eyebrow">Sales dashboard</p>
            <h1>Welcome, {user.name}</h1>
            <p className="lead">Review your assigned leads, read the conversation and update progress.</p>
          </div>
          <button type="button" className="btn btn-ghost" onClick={loadAssignedLeads} disabled={leadsLoading}>
            <Icon name="refresh" size={16} /> {leadsLoading ? "Refreshing..." : "Refresh leads"}
          </button>
        </section>

        <section className="stat-cards" aria-label="Lead overview">
          <div className="stat-card">
            <span>Assigned leads</span>
            <strong>{leads.length}</strong>
          </div>
          <div className="stat-card">
            <span>New</span>
            <strong>{statusCounts.new || 0}</strong>
          </div>
          <div className="stat-card">
            <span>In progress</span>
            <strong>{inProgress}</strong>
          </div>
          <div className="stat-card">
            <span>Converted</span>
            <strong>{statusCounts.converted || 0}</strong>
          </div>
        </section>

        <section className="section tight">
          <div className="toolbar">
            <div className="search">
              <Icon name="search" size={16} />
              <input
                aria-label="Search leads"
                placeholder="Search by lead, configuration, source, summary..."
                value={salesSearch}
                onChange={(e) => setSalesSearch(e.target.value)}
              />
            </div>
            <div className="chips" role="group" aria-label="Filter by status">
              <button
                type="button"
                className={`chip-btn ${salesFilter === "all" ? "active" : ""}`}
                onClick={() => setSalesFilter("all")}
              >
                All <span>{leads.length}</span>
              </button>
              {LEAD_STATUSES.map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  className={`chip-btn ${salesFilter === value ? "active" : ""}`}
                  onClick={() => setSalesFilter(value)}
                >
                  {label} <span>{statusCounts[value] || 0}</span>
                </button>
              ))}
            </div>
          </div>

          {leadsLoading && leads.length === 0 ? (
            <div className="lead-grid">
              <div className="lead-card skeleton" />
              <div className="lead-card skeleton" />
            </div>
          ) : leads.length === 0 ? (
            <EmptyState icon="users" title="No assigned leads yet">
              Leads assigned to you will appear here.
            </EmptyState>
          ) : filteredLeads.length === 0 ? (
            <EmptyState icon="search" title="No leads match your filters">
              Try a different search or clear the status filter.
            </EmptyState>
          ) : (
            <div className="lead-grid">{filteredLeads.map(renderLeadCard)}</div>
          )}
        </section>
      </>
    );
  }

  // ---------------------------------------------------------------- admin --
  function renderAdmin() {
    const counts = adminSlots ? Object.values(adminSlots).filter((v) => v !== null) : [];
    const totalSlots = counts.length ? counts.reduce((a, b) => a + b, 0) : null;


    return (
      <>
        <section className="welcome-card">
          <div>
            <p className="eyebrow">Admin dashboard</p>
            <h1>Administration</h1>
            <p className="lead">
              An overview of what is available through the API. Management tasks open in the backend
              API documentation.
            </p>
          </div>
          <a className="btn btn-primary" href={DOCS_URL} target="_blank" rel="noreferrer">
            Open API documentation <Icon name="external" size={16} />
          </a>
        </section>

        <section className="stat-cards" aria-label="Overview">
  <div className="stat-card">
    <span>Projects</span>
    <strong>{adminStats ? adminStats.total_projects : "…"}</strong>
  </div>

  <div className="stat-card">
    <span>Available visit slots</span>
    <strong>{totalSlots === null ? "…" : totalSlots}</strong>
  </div>

  <div className="stat-card">
    <span>Total leads</span>
    <strong>{adminStats ? adminStats.total_leads : "…"}</strong>
  </div>

  <div className="stat-card">
    <span>Unassigned leads</span>
    <strong>{adminStats ? adminStats.unassigned_leads : "…"}</strong>
  </div>

  <div className="stat-card">
    <span>Salespeople</span>
    <strong>{adminStats ? adminStats.total_salespeople : "…"}</strong>
  </div>

  <div className="section-actions">
  <button
    className="btn btn-primary"
    type="button"
    onClick={() => setShowProjectForm(!showProjectForm)}
  >
    {showProjectForm ? "Cancel" : "Add project"}
  </button>

  <button
    className="btn btn-primary"
    type="button"
    onClick={() => setShowSlotForm(!showSlotForm)}
  >
    {showSlotForm ? "Cancel" : "Add visit slot"}
  </button>
</div>

{showProjectForm && (
  <form className="card stack" onSubmit={handleCreateProject}>
    <Field label="Project name">
      <input
        required
        minLength={2}
        maxLength={150}
        value={projectForm.name}
        onChange={(e) =>
          setProjectForm({ ...projectForm, name: e.target.value })
        }
        placeholder="e.g. PropConnect Gardens"
      />
    </Field>

    <Field label="Location">
      <input
        required
        value={projectForm.location}
        onChange={(e) =>
          setProjectForm({ ...projectForm, location: e.target.value })
        }
        placeholder="e.g. Ahmedabad"
      />
    </Field>

    <Field label="Description">
      <textarea
        value={projectForm.description}
        onChange={(e) =>
          setProjectForm({ ...projectForm, description: e.target.value })
        }
        placeholder="Describe the residential project"
      />
    </Field>

    <Field label="Minimum price (₹)">
      <input
        type="number"
        min="0"
        value={projectForm.min_price}
        onChange={(e) =>
          setProjectForm({ ...projectForm, min_price: e.target.value })
        }
      />
    </Field>

    <Field label="Maximum price (₹)">
      <input
        type="number"
        min="0"
        value={projectForm.max_price}
        onChange={(e) =>
          setProjectForm({ ...projectForm, max_price: e.target.value })
        }
      />
    </Field>

    <button className="btn btn-primary" type="submit" disabled={creatingProject}>
      {creatingProject ? "Creating..." : "Create project"}
    </button>
  </form>
)}
{showSlotForm && (
  <form className="card stack" onSubmit={handleCreateSlot}>
    <h3>Create visit slot</h3>

    <Field label="Select project">
      <select
        required
        value={slotForm.project_id}
        onChange={(e) =>
          setSlotForm({ ...slotForm, project_id: e.target.value })
        }
      >
        <option value="">Choose a project</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </Field>

    <Field label="Visit date">
      <input
        type="date"
        required
        min={new Date().toLocaleDateString("en-CA")}
        value={slotForm.visit_date}
        onChange={(e) =>
          setSlotForm({ ...slotForm, visit_date: e.target.value })
        }
      />
    </Field>

    <Field label="Start time">
      <input
        type="time"
        required
        value={slotForm.start_time}
        onChange={(e) =>
          setSlotForm({ ...slotForm, start_time: e.target.value })
        }
      />
    </Field>

    <button
      className="btn btn-primary"
      type="submit"
      disabled={creatingSlot || projects.length === 0}
    >
      {creatingSlot ? "Creating..." : "Create visit slot"}
    </button>
  </form>
)}
          {projects.length === 0 ? (
            <EmptyState icon="building" title="No projects found">
              Create projects through the API documentation.
            </EmptyState>
          ) : (
            <div className="card table-card">
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Project</th>
                      <th>Location</th>
                      <th>Price range</th>
                      <th>Available slots</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <strong>{p.name}</strong>
                        </td>
                        <td>{p.location || "—"}</td>
                        <td>{formatPriceRange(p.min_price, p.max_price)}</td>
                        <td>
                          {adminSlots && adminSlots[p.id] !== null && adminSlots[p.id] !== undefined
                            ? adminSlots[p.id]
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        <section className="section tight">
          <div className="section-head">
            <div>
              <p className="eyebrow">Manage</p>
              <h2>Administrative functions</h2>
            </div>
          </div>
          <div className="admin-links">
            {[
              ["file", "Project fact sheet", "Create, edit and approve the project facts the assistant relies on."],
              ["calendar", "Site-visit slots", "Create and review visit slots for each project."],
              ["users", "Lead assignment", "Assign leads to salespeople (/leads/{lead_id}/assign)."],
            ].map(([icon, title, text]) => (
              <a className="admin-link" key={title} href={DOCS_URL} target="_blank" rel="noreferrer">
                <span className="value-icon">
                  <Icon name={icon} />
                </span>
                <div>
                  <strong>{title}</strong>
                  <p>{text}</p>
                </div>
                <Icon name="external" size={16} />
              </a>
            ))}
          </div>
          <div className="note">
            <Icon name="info" size={16} />
            <p>

            </p>
          </div>
        </section>
      </>
    );
  }

  // =========================================================================
  // Page
  // =========================================================================
  if (authChecking) {
    return (
      <div className="boot">
        <TypingDots />
      </div>
    );
  }

  return (
    <div className="app">
      <header className="navbar">
        <div className="navbar-inner">
          <a className="brand" href="/" onClick={(e) => e.preventDefault()}>
            <span className="brand-mark">
              <Icon name="home" size={16} />
            </span>
            PropConnect<span>AI</span>
          </a>
          <div className="nav-right">
            {user ? (
              <>
                <span className="avatar user">{initials(user.name)}</span>
                <div className="nav-user">
                  <strong>{user.name}</strong>
                  <span className="role">{user.role}</span>
                </div>
                <button type="button" onClick={logout} className="btn btn-ghost btn-sm">
                  <Icon name="logout" size={15} /> <span className="hide-sm">Logout</span>
                </button>
              </>
            ) : (
              <span className="nav-tagline">Find your next home</span>
            )}
          </div>
        </div>
      </header>

      <div className="toasts" aria-live="polite">
        {error && (
          <div className="toast error" role="alert">
            <Icon name="info" size={18} />
            <span>{error}</span>
            <button type="button" aria-label="Dismiss" onClick={() => setError("")}>
              <Icon name="x" size={16} />
            </button>
          </div>
        )}
        {message && (
          <div className="toast success" role="status">
            <Icon name="check" size={18} />
            <span>{message}</span>
            <button type="button" aria-label="Dismiss" onClick={() => setMessage("")}>
              <Icon name="x" size={16} />
            </button>
          </div>
        )}
      </div>

      <main className="container">
        {!user && renderLanding()}
        {user?.role === "buyer" && renderBuyer()}
        {user?.role === "salesperson" && renderSales()}
        {user?.role === "admin" && renderAdmin()}
        {user && !["buyer", "salesperson", "admin"].includes(user.role) && (
          <EmptyState icon="info" title="Unsupported account role">
            This interface does not have a dashboard for the role "{user.role}".
          </EmptyState>
        )}
      </main>

      <footer className="footer">
        <div className="footer-inner">
          <strong>
            PropConnect<span>AI</span>
          </strong>
          <p>Smarter property discovery and lead management.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;