import { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import ActivityCard from "./ActivityCard";
import { io } from "socket.io-client";

const socket = io("http://localhost:3000");

/* ─── shared table styles ─── */
const thStyle = {
  padding: "10px 14px",
  textAlign: "left",
  borderBottom: "2px solid #ccc",
  fontWeight: "600",
  whiteSpace: "nowrap",
};
const tdStyle = {
  padding: "10px 14px",
  borderBottom: "1px solid #e0e0e0",
  verticalAlign: "top",
};

/* ─── reusable modal backdrop + card ─── */
function Modal({ onClose, children, wide }) {
  useEffect(() => {
    const esc = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(8,8,20,0.62)",
        backdropFilter: "blur(6px)",
        zIndex: 3000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        animation: "fadeInBackdrop 0.2s ease",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "20px",
          width: "100%",
          maxWidth: wide ? "640px" : "460px",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow:
            "0 32px 80px rgba(0,0,40,0.28), 0 0 0 1px rgba(0,0,40,0.06)",
          animation: "slideUp 0.28s cubic-bezier(0.34,1.56,0.64,1)",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ icon, title, subtitle, onClose }) {
  return (
    <div
      style={{
        padding: "28px 28px 0",
        borderBottom: "1px solid #f0f0f6",
        paddingBottom: "20px",
        marginBottom: "24px",
        display: "flex",
        alignItems: "flex-start",
        gap: "14px",
      }}
    >
      <div
        style={{
          width: "44px",
          height: "44px",
          borderRadius: "12px",
          background: "linear-gradient(135deg,#1a1a2e,#3a3a6e)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1.2rem",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, paddingTop: "2px" }}>
        <div
          style={{
            fontFamily: "'DM Serif Display',serif",
            fontSize: "1.25rem",
            color: "#111",
            lineHeight: 1.2,
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div style={{ fontSize: "0.8rem", color: "#888", marginTop: "3px" }}>
            {subtitle}
          </div>
        )}
      </div>
      <button
        onClick={onClose}
        style={{
          background: "#f4f4f8",
          border: "none",
          borderRadius: "8px",
          width: "32px",
          height: "32px",
          cursor: "pointer",
          fontSize: "1rem",
          color: "#666",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          transition: "background 0.15s",
        }}
        onMouseOver={(e) => (e.currentTarget.style.background = "#e8e8f0")}
        onMouseOut={(e) => (e.currentTarget.style.background = "#f4f4f8")}
      >
        ×
      </button>
    </div>
  );
}

/* ─── styled input / label helpers ─── */
const labelStyle = {
  display: "block",
  fontSize: "0.78rem",
  fontWeight: "600",
  letterSpacing: "0.05em",
  color: "#555",
  textTransform: "uppercase",
  marginBottom: "6px",
};
const inputStyle = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: "10px",
  border: "1.5px solid #e0e0ec",
  fontSize: "0.92rem",
  color: "#111",
  background: "#fafafa",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.15s, box-shadow 0.15s",
  fontFamily: "inherit",
};
const focusStyle = {
  borderColor: "#3a3a6e",
  boxShadow: "0 0 0 3px rgba(58,58,110,0.1)",
  background: "#fff",
};

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: "18px" }}>
      {label && <label style={labelStyle}>{label}</label>}
      {children}
    </div>
  );
}

function StyledInput({ label, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <Field label={label}>
      <input
        {...props}
        style={{ ...inputStyle, ...(focused ? focusStyle : {}) }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </Field>
  );
}

function StyledSelect({ label, children, value, onChange, required }) {
  const [focused, setFocused] = useState(false);
  return (
    <Field label={label}>
      <select
        value={value}
        onChange={onChange}
        required={required}
        style={{
          ...inputStyle,
          cursor: "pointer",
          ...(focused ? focusStyle : {}),
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      >
        {children}
      </select>
    </Field>
  );
}

function StyledTextarea({ label, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <Field label={label}>
      <textarea
        {...props}
        style={{
          ...inputStyle,
          resize: "vertical",
          minHeight: "80px",
          ...(focused ? focusStyle : {}),
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </Field>
  );
}

function PrimaryBtn({ children, disabled, onClick, type = "submit", danger }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "11px 24px",
        borderRadius: "10px",
        border: "none",
        background: danger
          ? "linear-gradient(135deg,#c0392b,#e74c3c)"
          : "linear-gradient(135deg,#1a1a2e,#3a3a6e)",
        color: "#fff",
        fontFamily: "inherit",
        fontSize: "0.9rem",
        fontWeight: "600",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        transition: "opacity 0.15s, transform 0.1s",
      }}
      onMouseOver={(e) =>
        !disabled && (e.currentTarget.style.transform = "translateY(-1px)")
      }
      onMouseOut={(e) => (e.currentTarget.style.transform = "none")}
    >
      {children}
    </button>
  );
}

function GhostBtn({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "11px 20px",
        borderRadius: "10px",
        border: "1.5px solid #e0e0ec",
        background: "transparent",
        color: "#666",
        fontFamily: "inherit",
        fontSize: "0.9rem",
        cursor: "pointer",
        transition: "background 0.15s",
      }}
      onMouseOver={(e) => (e.currentTarget.style.background = "#f4f4f8")}
      onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {children}
    </button>
  );
}

/* ─── nav pill buttons ─── */
function NavBtn({ icon, label, onClick, accent }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "9px 18px",
        borderRadius: "100px",
        border: "1.5px solid #e0e0ec",
        background: "#fff",
        color: "#1a1a2e",
        fontFamily: "inherit",
        fontSize: "0.85rem",
        fontWeight: "500",
        cursor: "pointer",
        boxShadow: "0 2px 8px rgba(0,0,40,0.06)",
        transition: "all 0.15s",
        whiteSpace: "nowrap",
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.background = "#1a1a2e";
        e.currentTarget.style.color = "#fff";
        e.currentTarget.style.borderColor = "#1a1a2e";
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.background = "#fff";
        e.currentTarget.style.color = "#1a1a2e";
        e.currentTarget.style.borderColor = "#e0e0ec";
      }}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

/* ═══════════════════════════════════════
   MAIN DASHBOARD
════════════════════════════════════════ */
export default function Dashboard({ session }) {
  const [suggestion, setSuggestion] = useState(null);
  const audioRef = useRef(null);
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [time, setTime] = useState("");
  const [payment, setPayment] = useState("");
  const [location, setLocation] = useState("");
  const [showNotifyForm, setShowNotifyForm] = useState(false);
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [webhook, setWebhook] = useState("");
  const [telegramToken, setTelegramToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [activities, setActivities] = useState([]);
  const [message, setMessage] = useState("");
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [slots, setSlots] = useState([]);
  const [mySlot, setMySlot] = useState(null);
  const [showMeditation, setShowMeditation] = useState(false);
  const [duration, setDuration] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [assignmentFile, setAssignmentFile] = useState(null);
  const [assignmentDeadline, setAssignmentDeadline] = useState("");
  const [assignmentMessage, setAssignmentMessage] = useState("");
  const [assignmentUploading, setAssignmentUploading] = useState(false);
  const [meditatingCount, setMeditatingCount] = useState(0);

  useEffect(() => {
    loadActivities();
    loadSuggestion();
  }, []);

  useEffect(() => {
    socket.on("meditation_count", (count) => setMeditatingCount(count));
    return () => socket.off("meditation_count");
  }, []);

  useEffect(() => {
    fetch("http://localhost:3000/music")
      .then((r) => r.json())
      .then((data) => {
        if (data && data[0]?.audio_url) setAudioUrl(data[0].audio_url);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!isRunning) return;
    if (timeLeft <= 0) {
      setIsRunning(false);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      socket.emit("meditation_stop", session.user.id);
      return;
    }
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [isRunning, timeLeft]);

  async function loadSuggestion() {
    const { data, error } = await supabase
      .from("student_suggestions")
      .select("suggestion")
      .eq("user_id", session.user.id)
      .single();
    if (!error && data) setSuggestion(data.suggestion);
  }

  async function loadActivities() {
    // fetch hidden activity IDs for this user
    const { data: hidden } = await supabase
      .from("hidden_activities")
      .select("activity_id")
      .eq("user_id", session.user.id);

    const hiddenIds = hidden ? hidden.map((h) => h.activity_id) : [];

    // fetch all activities
    const { data, error } = await supabase
      .from("activities")
      .select("*")
      .order("time", { ascending: false });

    if (error) {
      setMessage("Error loading activities: " + error.message);
    } else {
      // filter out hidden ones client-side
      const visible = data.filter((a) => !hiddenIds.includes(a.id));
      setActivities(visible);
    }
  }

  async function handleAssignmentSubmit(e) {
    e.preventDefault();
    if (!assignmentFile || !assignmentDeadline) {
      setAssignmentMessage("Please select a PDF and set a deadline.");
      return;
    }
    setAssignmentUploading(true);
    setAssignmentMessage("Uploading…");
    const filePath = `/${session.user.id}/${Date.now()}_${assignmentFile.name}`;
    const { error: uploadError } = await supabase.storage
      .from("assignments")
      .upload(filePath, assignmentFile, { contentType: "application/pdf" });
    if (uploadError) {
      setAssignmentMessage("Upload failed: " + uploadError.message);
      setAssignmentUploading(false);
      return;
    }
    const { error: dbError } = await supabase.from("assignments").insert([
      {
        user_id: session.user.id,
        pdf_path: filePath,
        deadline: new Date(assignmentDeadline).toISOString(),
      },
    ]);
    if (dbError) {
      setAssignmentMessage("DB error: " + dbError.message);
    } else {
      setAssignmentMessage("✓ Submitted successfully!");
      setAssignmentFile(null);
      setAssignmentDeadline("");
      setTimeout(() => {
        setShowAssignmentForm(false);
        setAssignmentMessage("");
      }, 1200);
    }
    setAssignmentUploading(false);
  }

  async function saveNotification() {
    const { error } = await supabase.from("profiles").upsert({
      user_id: session.user.id,
      discord_webhook_url: webhook,
      telegram_token: telegramToken,
      telegram_chat_id: chatId,
    });
    if (error) setMessage(error.message);
    else {
      setMessage("Notification settings saved.");
      setShowNotifyForm(false);
    }
  }

  function handleDateChange(date) {
    setSelectedDate(date);
    loadSlots(date);
  }

  async function loadSlots(date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    const { data } = await supabase
      .from("inspection_time")
      .select("*")
      .gte("inspection", start.toISOString())
      .lte("inspection", end.toISOString());
    const takenHours = data.map((i) => new Date(i.inspection).getHours());
    const mine = data.find((i) => i.user_id === session.user.id);
    setMySlot(mine ? new Date(mine.inspection).getHours() : null);
    const list = [];
    for (let h = 9; h <= 16; h++)
      list.push({ hour: h, taken: takenHours.includes(h) });
    setSlots(list);
  }

  async function startMeditation(minutes) {
    setDuration(minutes);
    setTimeLeft(minutes * 60);
    setIsRunning(true);
    socket.emit("meditation_start", session.user.id);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (audioUrl) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.loop = true;
      audioRef.current.play().catch(console.error);
    }
  }

  async function stopMeditation() {
    setIsRunning(false);
    setDuration(null);
    setTimeLeft(0);
    socket.emit("meditation_stop", session.user.id);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setShowMeditation(false);
  }

  async function bookSlot(hour) {
    const d = new Date(selectedDate);
    d.setHours(hour, 0, 0, 0);
    const { error } = await supabase
      .from("inspection_time")
      .upsert(
        { user_id: session.user.id, inspection: d.toISOString() },
        { onConflict: "user_id" },
      );
    if (error) alert("This slot is already taken.");
    else loadSlots(selectedDate);
  }
  async function hideOutdatedActivities() {
    const confirmed = window.confirm("Delete all past activities?");
    if (!confirmed) return;

    const now = new Date().toISOString();

    // get outdated activities
    const { data: outdated, error: fetchError } = await supabase
      .from("activities")
      .select("id")
      .lt("time", now);

    if (fetchError || !outdated?.length) {
      setMessage("Nothing to delete.");
      return;
    }

    // get already-hidden ones so we don't try to insert duplicates
    const { data: alreadyHidden } = await supabase
      .from("hidden_activities")
      .select("activity_id")
      .eq("user_id", session.user.id);

    const alreadyHiddenIds = new Set(
      alreadyHidden?.map((h) => h.activity_id) || [],
    );

    // only insert rows that aren't already hidden
    const newRows = outdated
      .filter((a) => !alreadyHiddenIds.has(a.id))
      .map((a) => ({ user_id: session.user.id, activity_id: a.id }));

    if (!newRows.length) {
      setMessage("All past activities are already deleted.");
      return;
    }

    const { error } = await supabase.from("hidden_activities").insert(newRows);

    if (error) {
      setMessage("Failed to delete: " + error.message);
    } else {
      setMessage("Past activities deleted.");
      loadActivities();
    }
  }
  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("Submitting…");
    const { error } = await supabase.from("activities").insert([
      {
        title,
        category,
        time: new Date(time).toISOString(),
        payment: payment || null,
        location,
        user_id: session.user.id,
      },
    ]);
    if (error) {
      console.error(error);
      setMessage("Submission failed: " + error.message);
      return;
    }
    setMessage("Activity submitted successfully.");
    setTitle("");
    setCategory("");
    setTime("");
    setPayment("");
    setLocation("");
    setShowForm(false);
    loadActivities();
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Sora:wght@300;400;500;600&display=swap');
        @keyframes fadeInBackdrop { from { opacity:0 } to { opacity:1 } }
        @keyframes slideUp { from { opacity:0; transform:translateY(28px) scale(0.97) } to { opacity:1; transform:translateY(0) scale(1) } }
        * { box-sizing: border-box; }
        body { font-family: 'Sora', sans-serif; }
        .hub-root * { font-family: 'Sora', sans-serif; }
        .slot-btn { padding:10px 16px; border-radius:10px; border:1.5px solid; font-family:'Sora',sans-serif; font-size:0.82rem; font-weight:600; cursor:pointer; transition:all 0.15s; }
        .slot-btn:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 4px 12px rgba(0,0,0,0.12); }
        .react-calendar { border:none !important; width:100% !important; font-family:'Sora',sans-serif !important; border-radius:12px; background:#f8f8fc !important; padding:8px; }
        .react-calendar__tile--active { background:#1a1a2e !important; border-radius:8px !important; }
        .react-calendar__tile:hover { background:#e8e8f4 !important; border-radius:8px !important; }
        .help-step { background:#f4f4fb; border-radius:8px; padding:12px 16px; margin-bottom:10px; }
        .help-step h4 { margin:0 0 6px; font-size:0.82rem; text-transform:uppercase; letter-spacing:0.06em; color:#3a3a6e; }
        .help-step ol { margin:0; padding-left:18px; font-size:0.82rem; color:#555; line-height:1.7; }
      `}</style>
      <div className="min-vh-100 bg-light">
        <div
          className="hub-root"
          style={{ padding: "32px 28px", maxWidth: "1200px", margin: "0 auto" }}
        >
          {/* ── PAGE HEADER ── */}
          <div
            className="px-4 py-5 text-center text-white rounded-4"
            style={{ background: "linear-gradient(135deg, #1a1a2e, #3a3a6e)" }}
          >
            <h1 className="display-4 fw-bold mb-2">Waikato Campus Hub</h1>
            <p className="lead text-white-50 mb-0">
              Manage your activities, assignments, and campus life
            </p>
          </div>

          {/* ── NAV BUTTONS ── */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
              marginBottom: "32px",
            }}
          >
            <NavBtn
              icon="✦"
              label="Submit Activity"
              onClick={() => setShowForm(true)}
            />
            <NavBtn
              icon="❌"
              label="Delete Past Activities"
              onClick={hideOutdatedActivities}
            />
            <NavBtn
              icon="📎"
              label="Submit Assignment"
              onClick={() => setShowAssignmentForm(true)}
            />
            <NavBtn
              icon="🔔"
              label="Notification Settings"
              onClick={() => setShowNotifyForm(true)}
            />
            <NavBtn
              icon="🔍"
              label="Lost something?"
              onClick={() => navigate("/lost-and-found")}
            />
            <NavBtn
              icon="📅"
              label="Book Inspection Time"
              onClick={() => setShowCalendar(true)}
            />
            <NavBtn
              icon="🧘"
              label="Meditation"
              onClick={() => setShowMeditation(true)}
            />
          </div>

          {message && (
            <div
              style={{
                padding: "12px 16px",
                borderRadius: "10px",
                background:
                  message.includes("success") || message.includes("saved")
                    ? "#e8f5e9"
                    : "#fdecea",
                color:
                  message.includes("success") || message.includes("saved")
                    ? "#2e7d32"
                    : "#c62828",
                fontSize: "0.85rem",
                marginBottom: "24px",
                fontWeight: "500",
              }}
            >
              {message}
            </div>
          )}

          {/* ── SUGGESTION PANEL ── */}
          {suggestion && (
            <div
              style={{
                marginBottom: "32px",
                border: "1.5px solid #e8e8f4",
                borderRadius: "16px",
                padding: "24px",
                background: "#fafafe",
              }}
            >
              <h2
                style={{
                  fontFamily: "'DM Serif Display',serif",
                  margin: "0 0 12px",
                  fontSize: "1.3rem",
                  color: "#1a1a2e",
                }}
              >
                📚 Assignment Suggestions
              </h2>
              <p
                style={{
                  lineHeight: "1.75",
                  color: "#444",
                  fontSize: "0.88rem",
                }}
              >
                {suggestion.study_plan}
              </p>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  marginTop: "16px",
                  fontSize: "0.85rem",
                }}
              >
                <thead>
                  <tr style={{ background: "#ededf8" }}>
                    <th style={thStyle}>#</th>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>Deadline</th>
                    <th style={thStyle}>Est. Hours</th>
                    <th style={thStyle}>Summary</th>
                  </tr>
                </thead>
                <tbody>
                  {suggestion.start_order.map((orderIndex, rank) => {
                    const a = suggestion.assignments[orderIndex - 1];
                    if (!a) return null;
                    const fileName = a.pdf_path.split("/").pop();
                    const deadlineNZ = new Date(a.deadline).toLocaleString(
                      "en-NZ",
                      {
                        timeZone: "Pacific/Auckland",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      },
                    );
                    return (
                      <tr
                        key={rank}
                        style={{
                          background: rank % 2 === 0 ? "#fff" : "#f6f6fc",
                        }}
                      >
                        <td style={tdStyle}>{rank + 1}</td>
                        <td style={tdStyle}>{fileName}</td>
                        <td style={tdStyle}>{deadlineNZ}</td>
                        <td style={tdStyle}>{a.estimated_hours}h</td>
                        <td style={tdStyle}>{a.summary}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <ActivityCalendar activities={activities} session={session} />
        </div>
      </div>
      {/* ════════════════════════════════
          MODAL: SUBMIT ACTIVITY
      ════════════════════════════════ */}
      {showForm && (
        <Modal onClose={() => setShowForm(false)}>
          <ModalHeader
            icon="✦"
            title="Submit Activity"
            subtitle="Log a new work, study, or life event"
            onClose={() => setShowForm(false)}
          />
          <form onSubmit={handleSubmit} style={{ padding: "0 28px 28px" }}>
            <StyledInput
              label="Activity Title"
              type="text"
              placeholder="e.g. Team meeting, Study session…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <StyledSelect
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            >
              <option value="" disabled>
                — Select category —
              </option>
              <option value="Work">Work</option>
              <option value="Study">Study</option>
              <option value="Life">Life</option>
            </StyledSelect>
            <StyledInput
              label="Date & Time"
              type="datetime-local"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
            />
            <StyledInput
              label="Payment (optional)"
              type="text"
              placeholder="spending: −50, income: +200"
              value={payment}
              onChange={(e) => setPayment(e.target.value)}
            />
            <StyledTextarea
              label="Location"
              placeholder="Paste a map link + short description"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
            />
            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "flex-end",
                marginTop: "8px",
              }}
            >
              <GhostBtn onClick={() => setShowForm(false)}>Cancel</GhostBtn>
              <PrimaryBtn>Submit Activity</PrimaryBtn>
            </div>
          </form>
        </Modal>
      )}

      {/* ════════════════════════════════
          MODAL: SUBMIT ASSIGNMENT
      ════════════════════════════════ */}
      {showAssignmentForm && (
        <Modal
          onClose={() => {
            setShowAssignmentForm(false);
            setAssignmentMessage("");
          }}
        >
          <ModalHeader
            icon="📎"
            title="Submit Assignment"
            subtitle="Upload a PDF before the deadline"
            onClose={() => {
              setShowAssignmentForm(false);
              setAssignmentMessage("");
            }}
          />
          <form
            onSubmit={handleAssignmentSubmit}
            style={{ padding: "0 28px 28px" }}
          >
            <Field label="PDF File">
              <div
                style={{
                  border: "2px dashed #d0d0ec",
                  borderRadius: "12px",
                  padding: "20px",
                  textAlign: "center",
                  background: "#fafafa",
                  cursor: "pointer",
                  transition: "border-color 0.15s",
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.borderColor = "#3a3a6e";
                }}
                onDragLeave={(e) => {
                  e.currentTarget.style.borderColor = "#d0d0ec";
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files[0];
                  if (f?.type === "application/pdf") setAssignmentFile(f);
                  e.currentTarget.style.borderColor = "#d0d0ec";
                }}
              >
                <div style={{ fontSize: "1.6rem", marginBottom: "6px" }}>
                  📄
                </div>
                <div style={{ fontSize: "0.82rem", color: "#888" }}>
                  {assignmentFile ? (
                    <span style={{ color: "#3a3a6e", fontWeight: "600" }}>
                      {assignmentFile.name}
                    </span>
                  ) : (
                    <>
                      Drag & drop or{" "}
                      <label
                        style={{
                          color: "#3a3a6e",
                          cursor: "pointer",
                          fontWeight: "600",
                          textDecoration: "underline",
                        }}
                      >
                        browse
                        <input
                          type="file"
                          accept="application/pdf"
                          required
                          style={{ display: "none" }}
                          onChange={(e) => setAssignmentFile(e.target.files[0])}
                        />
                      </label>
                    </>
                  )}
                </div>
              </div>
            </Field>
            <StyledInput
              label="Deadline"
              type="datetime-local"
              value={assignmentDeadline}
              onChange={(e) => setAssignmentDeadline(e.target.value)}
              required
            />
            {assignmentMessage && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: "8px",
                  background: assignmentMessage.includes("✓")
                    ? "#e8f5e9"
                    : "#fdecea",
                  color: assignmentMessage.includes("✓")
                    ? "#2e7d32"
                    : "#c62828",
                  fontSize: "0.83rem",
                  marginBottom: "16px",
                  fontWeight: "500",
                }}
              >
                {assignmentMessage}
              </div>
            )}
            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "flex-end",
              }}
            >
              <GhostBtn
                onClick={() => {
                  setShowAssignmentForm(false);
                  setAssignmentMessage("");
                }}
              >
                Cancel
              </GhostBtn>
              <PrimaryBtn disabled={assignmentUploading}>
                {assignmentUploading ? "Uploading…" : "Submit"}
              </PrimaryBtn>
            </div>
          </form>
        </Modal>
      )}

      {/* ════════════════════════════════
          MODAL: NOTIFICATION SETTINGS
      ════════════════════════════════ */}
      {showNotifyForm && (
        <Modal onClose={() => setShowNotifyForm(false)}>
          <ModalHeader
            icon="🔔"
            title="Notification Settings"
            subtitle="Connect Discord or Telegram for alerts"
            onClose={() => setShowNotifyForm(false)}
          />
          <div style={{ padding: "0 28px 28px" }}>
            <StyledInput
              label="Discord Webhook URL"
              type="text"
              placeholder="https://discord.com/api/webhooks/…"
              value={webhook}
              onChange={(e) => setWebhook(e.target.value)}
            />
            <StyledInput
              label="Telegram Bot Token"
              type="text"
              placeholder="123456:ABC-DEF…"
              value={telegramToken}
              onChange={(e) => setTelegramToken(e.target.value)}
            />
            <StyledInput
              label="Telegram Chat ID"
              type="text"
              placeholder="Your numeric chat ID"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
            />

            <button
              type="button"
              onClick={() => setShowHelpDialog(!showHelpDialog)}
              style={{
                background: "none",
                border: "none",
                color: "#3a3a6e",
                cursor: "pointer",
                fontSize: "0.82rem",
                fontWeight: "600",
                padding: "0",
                marginBottom: "20px",
                textDecoration: "underline",
                fontFamily: "inherit",
              }}
            >
              {showHelpDialog ? "▲ Hide setup guide" : "▼ How do I get these?"}
            </button>

            {showHelpDialog && (
              <div style={{ marginBottom: "20px" }}>
                <div className="help-step">
                  <h4>Discord Webhook URL</h4>
                  <ol>
                    <li>Open your Discord server → Server Settings</li>
                    <li>Go to Integrations → Webhooks</li>
                    <li>Create New Webhook → Copy URL</li>
                  </ol>
                </div>
                <div className="help-step">
                  <h4>Telegram Bot Token</h4>
                  <ol>
                    <li>Open Telegram, search @BotFather</li>
                    <li>Type /newbot and follow the prompts</li>
                    <li>Copy the API token provided</li>
                  </ol>
                </div>
                <div className="help-step">
                  <h4>Telegram Chat ID</h4>
                  <ol>
                    <li>Search @userinfobot in Telegram</li>
                    <li>Click Start → copy your Chat ID</li>
                  </ol>
                </div>
              </div>
            )}

            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "flex-end",
              }}
            >
              <GhostBtn onClick={() => setShowNotifyForm(false)}>
                Cancel
              </GhostBtn>
              <PrimaryBtn type="button" onClick={saveNotification}>
                Save Settings
              </PrimaryBtn>
            </div>
          </div>
        </Modal>
      )}

      {/* ════════════════════════════════
          MODAL: BOOK INSPECTION TIME
      ════════════════════════════════ */}
      {showCalendar && (
        <Modal onClose={() => setShowCalendar(false)} wide>
          <ModalHeader
            icon="📅"
            title="Book Inspection Time"
            subtitle="Pick a date then select an available hour"
            onClose={() => setShowCalendar(false)}
          />
          <div style={{ padding: "0 28px 28px" }}>
            <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 260px" }}>
                <Calendar onChange={handleDateChange} value={selectedDate} />
              </div>
              {selectedDate && (
                <div style={{ flex: "1 1 200px" }}>
                  <div
                    style={{
                      fontSize: "0.78rem",
                      fontWeight: "600",
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                      color: "#888",
                      marginBottom: "14px",
                    }}
                  >
                    Available Hours
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(4, 1fr)",
                      gap: "8px",
                    }}
                  >
                    {slots.map((s) => {
                      const isMine = mySlot === s.hour;
                      const isTaken = s.taken && !isMine;
                      return (
                        <button
                          key={s.hour}
                          className="slot-btn"
                          onClick={() => !isTaken && bookSlot(s.hour)}
                          disabled={isTaken}
                          style={{
                            borderColor: isMine
                              ? "#2eaf78"
                              : isTaken
                                ? "#e0e0ec"
                                : "#3a3a6e",
                            background: isMine
                              ? "#2eaf78"
                              : isTaken
                                ? "#f4f4f8"
                                : "#fff",
                            color: isMine
                              ? "#fff"
                              : isTaken
                                ? "#bbb"
                                : "#1a1a2e",
                            cursor: isTaken ? "not-allowed" : "pointer",
                          }}
                        >
                          {s.hour}:00
                        </button>
                      );
                    })}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "12px",
                      marginTop: "18px",
                      fontSize: "0.75rem",
                    }}
                  >
                    {[
                      ["#2eaf78", "Your booking"],
                      ["#3a3a6e", "Available"],
                      ["#f4f4f8", "Taken"],
                    ].map(([c, l]) => (
                      <div
                        key={l}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "5px",
                        }}
                      >
                        <span
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: 3,
                            background: c,
                            display: "inline-block",
                            border: "1.5px solid " + c,
                          }}
                        />
                        <span style={{ color: "#888" }}>{l}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: "20px",
              }}
            >
              <GhostBtn onClick={() => setShowCalendar(false)}>Close</GhostBtn>
            </div>
          </div>
        </Modal>
      )}

      {/* ════════════════════════════════
          MODAL: MEDITATION
      ════════════════════════════════ */}
      {showMeditation && (
        <Modal onClose={() => !isRunning && setShowMeditation(false)}>
          <div
            style={{
              background: "linear-gradient(160deg,#0d0d22,#1e1e42)",
              borderRadius: "20px",
              padding: "36px 32px",
              textAlign: "center",
              color: "#e0e0ff",
            }}
          >
            <div style={{ fontSize: "2rem", marginBottom: "6px" }}>🧘</div>
            <h2
              style={{
                fontFamily: "'DM Serif Display',serif",
                fontSize: "1.6rem",
                margin: "0 0 4px",
                color: "#fff",
              }}
            >
              Meditation
            </h2>
            <p
              style={{
                color: "#8888bb",
                fontSize: "0.82rem",
                margin: "0 0 24px",
              }}
            >
              {isRunning
                ? `${duration}-minute session in progress`
                : "Choose a duration to begin"}
            </p>

            {isRunning && (
              <p
                style={{
                  color: "#7eb8f7",
                  fontSize: "0.8rem",
                  margin: "0 0 16px",
                }}
              >
                🧘 {meditatingCount}{" "}
                {meditatingCount === 1 ? "person" : "people"} meditating now
              </p>
            )}

            {!isRunning ? (
              <>
                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    justifyContent: "center",
                    flexWrap: "wrap",
                    marginBottom: "24px",
                  }}
                >
                  {[5, 10, 15, 20].map((m) => (
                    <button
                      key={m}
                      onClick={() => startMeditation(m)}
                      style={{
                        padding: "14px 20px",
                        fontSize: "0.95rem",
                        borderRadius: "12px",
                        border: "1.5px solid #3a3a6e",
                        background: "rgba(58,58,110,0.4)",
                        color: "#c0c0ff",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        fontWeight: "600",
                        transition: "all 0.15s",
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = "#3a3a6e";
                        e.currentTarget.style.color = "#fff";
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background =
                          "rgba(58,58,110,0.4)";
                        e.currentTarget.style.color = "#c0c0ff";
                      }}
                    >
                      {m} min
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowMeditation(false)}
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "10px",
                    color: "#8888bb",
                    padding: "10px 28px",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    fontFamily: "inherit",
                  }}
                >
                  Close
                </button>
              </>
            ) : (
              <>
                <div
                  style={{
                    fontSize: "4.5rem",
                    fontWeight: "700",
                    letterSpacing: "0.06em",
                    color: "#a0c4ff",
                    margin: "16px 0",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {String(Math.floor(timeLeft / 60)).padStart(2, "0")}:
                  {String(timeLeft % 60).padStart(2, "0")}
                </div>
                <p
                  style={{
                    color: "#6688aa",
                    fontSize: "0.82rem",
                    marginBottom: "28px",
                  }}
                >
                  {timeLeft === 0
                    ? "✨ Session complete!"
                    : "🎵 Music playing…"}
                </p>
                <button
                  onClick={stopMeditation}
                  style={{
                    padding: "12px 32px",
                    borderRadius: "10px",
                    border: "none",
                    background: "linear-gradient(135deg,#7a1a1a,#c0392b)",
                    color: "#ffdddd",
                    cursor: "pointer",
                    fontSize: "0.95rem",
                    fontWeight: "600",
                    fontFamily: "inherit",
                    transition: "opacity 0.15s",
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.opacity = "0.85")}
                  onMouseOut={(e) => (e.currentTarget.style.opacity = "1")}
                >
                  End Session
                </button>
              </>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}

/* ════════════════════════════════
   ACTIVITY CALENDAR (unchanged logic, polished styles)
════════════════════════════════ */
const CATEGORY_COLORS = {
  Work: { bg: "#fff3cd", border: "#f0a500", dot: "#f0a500", label: "#7a5100" },
  Study: { bg: "#d4edff", border: "#3a9bd5", dot: "#3a9bd5", label: "#0a4a75" },
  Life: { bg: "#d4f5e9", border: "#2eaf78", dot: "#2eaf78", label: "#0a5235" },
};

function ActivityCalendar({ activities, session }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedActivity, setSelectedActivity] = useState(null);

  const monthStart = new Date(viewYear, viewMonth, 1);
  const monthEnd = new Date(viewYear, viewMonth + 1, 0);
  const startPad = monthStart.getDay();
  const totalCells = Math.ceil((startPad + monthEnd.getDate()) / 7) * 7;

  const activitiesByDay = {};
  activities.forEach((a) => {
    const d = new Date(a.time);
    if (d.getFullYear() === viewYear && d.getMonth() === viewMonth) {
      const key = d.getDate();
      if (!activitiesByDay[key]) activitiesByDay[key] = [];
      activitiesByDay[key].push(a);
    }
  });

  function prevMonth() {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else setViewMonth((m) => m + 1);
  }

  const monthLabel = new Date(viewYear, viewMonth).toLocaleString("en-NZ", {
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <style>{`
        .cal-wrap { font-family:'Sora',sans-serif; margin-top:0; }
        .cal-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; }
        .cal-title { font-family:'DM Serif Display',serif; font-size:1.5rem; color:#1a1a2e; letter-spacing:0.01em; }
        .cal-nav { background:#fff; border:1.5px solid #e0e0ec; border-radius:10px; width:36px; height:36px; cursor:pointer; font-size:1.1rem; display:flex; align-items:center; justify-content:center; transition:all 0.15s; box-shadow:0 2px 6px rgba(0,0,40,0.06); }
        .cal-nav:hover { background:#1a1a2e; color:#fff; border-color:#1a1a2e; }
        .cal-legend { display:flex; gap:16px; margin-bottom:16px; flex-wrap:wrap; }
        .cal-legend-item { display:flex; align-items:center; gap:6px; font-size:0.78rem; font-weight:600; }
        .cal-legend-dot { width:9px; height:9px; border-radius:50%; }
        .cal-grid { display:grid; grid-template-columns:repeat(7,1fr); border:1.5px solid #e8e8f4; border-radius:16px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,40,0.06); }
        .cal-dow { background:#f5f5fc; padding:10px 0; text-align:center; font-size:0.68rem; font-weight:700; letter-spacing:0.1em; color:#8888aa; text-transform:uppercase; border-right:1px solid #eeeef8; border-bottom:1px solid #eeeef8; }
        .cal-cell { min-height:110px; background:#fff; border-right:1px solid #eeeef8; border-bottom:1px solid #eeeef8; padding:8px 6px 6px; display:flex; flex-direction:column; gap:3px; position:relative; }
        .cal-cell.other-month { background:#fafafa; }
        .cal-cell.today .cal-day-num { background:#1a1a2e; color:#fff; border-radius:50%; }
        .cal-day-num { font-size:0.78rem; font-weight:600; color:#555; margin-bottom:2px; width:24px; height:24px; display:flex; align-items:center; justify-content:center; }
        .cal-chip { border-radius:6px; padding:3px 7px; font-size:0.69rem; font-weight:600; cursor:pointer; border:none; text-align:left; transition:filter 0.15s,transform 0.1s; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100%; font-family:'Sora',sans-serif; }
        .cal-chip:hover { filter:brightness(0.93); transform:scale(1.03); }
        .cal-more { font-size:0.66rem; color:#aaa; margin-top:2px; }
        .cal-modal-backdrop { position:fixed; inset:0; background:rgba(8,8,20,0.55); backdrop-filter:blur(6px); z-index:3000; display:flex; align-items:center; justify-content:center; padding:20px; animation:fadeInBackdrop 0.2s ease; }
        .cal-modal { background:#fff; border-radius:20px; max-width:480px; width:100%; max-height:85vh; overflow-y:auto; box-shadow:0 32px 80px rgba(0,0,40,0.25); animation:slideUp 0.28s cubic-bezier(0.34,1.56,0.64,1); }
        .cal-modal-inner { padding:24px; }
        .cal-modal-close { float:right; background:#f4f4f8; border:none; border-radius:8px; width:32px; height:32px; cursor:pointer; font-size:1rem; color:#666; display:flex; align-items:center; justify-content:center; }
        .cal-modal-close:hover { background:#e8e8f0; }
      `}</style>

      <div className="cal-wrap">
        <div className="cal-header">
          <button className="cal-nav" onClick={prevMonth}>
            ‹
          </button>
          <span className="cal-title">{monthLabel}</span>
          <button className="cal-nav" onClick={nextMonth}>
            ›
          </button>
        </div>

        <div className="cal-legend">
          {Object.entries(CATEGORY_COLORS).map(([cat, c]) => (
            <div key={cat} className="cal-legend-item">
              <span className="cal-legend-dot" style={{ background: c.dot }} />
              <span style={{ color: c.label }}>{cat}</span>
            </div>
          ))}
        </div>

        <div className="cal-grid">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="cal-dow">
              {d}
            </div>
          ))}

          {Array.from({ length: totalCells }).map((_, i) => {
            const dayNum = i - startPad + 1;
            const isThisMonth = dayNum >= 1 && dayNum <= monthEnd.getDate();
            const isToday =
              isThisMonth &&
              dayNum === today.getDate() &&
              viewMonth === today.getMonth() &&
              viewYear === today.getFullYear();
            const dayActivities = isThisMonth
              ? activitiesByDay[dayNum] || []
              : [];
            const visible = dayActivities.slice(0, 3);
            const overflow = dayActivities.length - visible.length;

            return (
              <div
                key={i}
                className={`cal-cell${!isThisMonth ? " other-month" : ""}${isToday ? " today" : ""}`}
              >
                {isThisMonth && (
                  <>
                    <div className="cal-day-num">{dayNum}</div>
                    {visible.map((a) => {
                      const c =
                        CATEGORY_COLORS[a.category] || CATEGORY_COLORS.Life;
                      const timeStr = new Date(a.time).toLocaleTimeString(
                        "en-NZ",
                        { hour: "2-digit", minute: "2-digit", hour12: true },
                      );
                      return (
                        <button
                          key={a.id}
                          className="cal-chip"
                          style={{
                            background: c.bg,
                            border: `1px solid ${c.border}`,
                            color: c.label,
                          }}
                          onClick={() => setSelectedActivity(a)}
                          title={`${a.title} — ${timeStr}`}
                        >
                          {timeStr} {a.title}
                        </button>
                      );
                    })}
                    {overflow > 0 && (
                      <span className="cal-more">+{overflow} more</span>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {selectedActivity && (
        <div
          className="cal-modal-backdrop"
          onClick={() => setSelectedActivity(null)}
        >
          <div className="cal-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cal-modal-inner">
              <button
                className="cal-modal-close"
                onClick={() => setSelectedActivity(null)}
              >
                ×
              </button>
              <ActivityCard activity={selectedActivity} session={session} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
