import { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import ActivityCard from "./ActivityCard";
import { io } from "socket.io-client";

// Create socket outside component so it's not recreated on re-render
const socket = io("http://localhost:3000");
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
    socket.on("meditation_count", (count) => {
      setMeditatingCount(count);
    });

    return () => {
      socket.off("meditation_count");
    };
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
      socket.emit("meditation_stop", session.user.id); // ← replaces supabase delete
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

    if (!error && data) {
      setSuggestion(data.suggestion);
    }
  }
  async function loadActivities() {
    const { data, error } = await supabase
      .from("activities")
      .select("*")
      .order("time", { ascending: false });

    if (error) {
      console.error(error);
      setMessage("Error loading activities: " + error.message);
    } else {
      setActivities(data);
    }
  }
  async function handleAssignmentSubmit(e) {
    e.preventDefault();
    if (!assignmentFile || !assignmentDeadline) {
      setAssignmentMessage("Please select a PDF and set a deadline.");
      return;
    }

    setAssignmentUploading(true);
    setAssignmentMessage("Uploading...");

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
      setAssignmentMessage("Assignment submitted successfully!");
      setAssignmentFile(null);
      setAssignmentDeadline("");
      setShowAssignmentForm(false);
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

    if (error) {
      setMessage(error.message);
    } else {
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

    // find current user's booking
    const mine = data.find((i) => i.user_id === session.user.id);
    setMySlot(mine ? new Date(mine.inspection).getHours() : null);

    const list = [];

    for (let h = 9; h <= 16; h++) {
      list.push({
        hour: h,
        taken: takenHours.includes(h),
      });
    }

    setSlots(list);
  }
  async function startMeditation(minutes) {
    setDuration(minutes);
    setTimeLeft(minutes * 60);
    setIsRunning(true);

    socket.data = { userId: session.user.id }; // attach for disconnect cleanup
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

    const { error } = await supabase.from("inspection_time").upsert(
      {
        user_id: session.user.id,
        inspection: d.toISOString(),
      },
      {
        onConflict: "user_id",
      },
    );

    if (error) {
      alert("This slot is already taken.");
    } else {
      loadSlots(selectedDate);
    }
  }
  async function handleSubmit(e) {
    e.preventDefault();

    setMessage("Submitting...");

    const { data, error } = await supabase.from("activities").insert([
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

  const workActivities = activities.filter((a) => a.category === "Work");
  const studyActivities = activities.filter((a) => a.category === "Study");
  const lifeActivities = activities.filter((a) => a.category === "Life");

  return (
    <div style={{ padding: "20px" }}>
      <h1>Waikato Campus Hub</h1>

      <button onClick={() => setShowForm(true)}>Submit Activity</button>
      <button
        onClick={() => setShowAssignmentForm(true)}
        style={{ marginLeft: "10px" }}
      >
        Submit Assignment
      </button>
      <button
        onClick={() => setShowNotifyForm(true)}
        style={{ marginLeft: "10px" }}
      >
        Notification Settings
      </button>
      <button
        onClick={() => navigate("/lost-and-found")}
        style={{ marginLeft: "10px" }}
      >
        Lost something?
      </button>
      <button
        onClick={() => {
          setShowCalendar(true);
        }}
        style={{ marginLeft: "10px" }}
      >
        Book Inspection Time
      </button>
      <button
        onClick={() => setShowMeditation(true)}
        style={{ marginLeft: "10px" }}
      >
        Meditation
      </button>
      {showMeditation && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "#1a1a2e",
              color: "#e0e0ff",
              borderRadius: "16px",
              padding: "36px 40px",
              minWidth: "320px",
              textAlign: "center",
              boxShadow: "0 8px 40px rgba(0,0,100,0.4)",
            }}
          >
            <h2
              style={{
                margin: "0 0 8px",
                fontSize: "1.6rem",
                letterSpacing: "0.05em",
              }}
            >
              🧘 Meditation
            </h2>

            {!isRunning ? (
              <>
                <p style={{ color: "#aaa", marginBottom: "24px" }}>
                  Select a duration to begin
                </p>
                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    justifyContent: "center",
                    flexWrap: "wrap",
                  }}
                >
                  {[5, 10, 15, 20].map((m) => (
                    <button
                      key={m}
                      onClick={() => startMeditation(m)}
                      style={{
                        padding: "14px 22px",
                        fontSize: "1rem",
                        borderRadius: "10px",
                        border: "none",
                        background: "#3a3a6e",
                        color: "#e0e0ff",
                        cursor: "pointer",
                        fontWeight: "600",
                        transition: "background 0.2s",
                      }}
                      onMouseOver={(e) =>
                        (e.target.style.background = "#5555aa")
                      }
                      onMouseOut={(e) =>
                        (e.target.style.background = "#3a3a6e")
                      }
                    >
                      {m} min
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowMeditation(false)}
                  style={{
                    marginTop: "28px",
                    padding: "10px 28px",
                    borderRadius: "8px",
                    border: "1px solid #555",
                    background: "transparent",
                    color: "#aaa",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                  }}
                >
                  Close
                </button>
              </>
            ) : (
              <>
                <p style={{ color: "#aaa", margin: "0 0 16px" }}>
                  {duration}-minute session
                </p>
                {/* Live count */}
                <p
                  style={{
                    color: "#7eb8f7",
                    fontSize: "0.85rem",
                    margin: "0 0 16px",
                  }}
                >
                  🧘 {meditatingCount}{" "}
                  {meditatingCount === 1 ? "person" : "people"} meditating now
                </p>
                <div
                  style={{
                    fontSize: "4rem",
                    fontWeight: "700",
                    letterSpacing: "0.05em",
                    color: "#a0c4ff",
                    margin: "16px 0",
                  }}
                >
                  {String(Math.floor(timeLeft / 60)).padStart(2, "0")}:
                  {String(timeLeft % 60).padStart(2, "0")}
                </div>
                <p
                  style={{
                    color: "#888",
                    fontSize: "0.85rem",
                    marginBottom: "24px",
                  }}
                >
                  {timeLeft === 0
                    ? "✨ Session complete!"
                    : "🎵 Music playing..."}
                </p>
                <button
                  onClick={stopMeditation}
                  style={{
                    padding: "12px 32px",
                    borderRadius: "10px",
                    border: "none",
                    background: "#6e3a3a",
                    color: "#ffdddd",
                    cursor: "pointer",
                    fontSize: "1rem",
                    fontWeight: "600",
                  }}
                >
                  End Session
                </button>
              </>
            )}
          </div>
        </div>
      )}
      {showCalendar && (
        <div
          style={{
            border: "1px solid #ccc",
            padding: "20px",
            marginTop: "20px",
          }}
        >
          <h3>Select Date</h3>

          <Calendar onChange={handleDateChange} value={selectedDate} />

          {selectedDate && (
            <div style={{ marginTop: "20px" }}>
              <h4>Select Hour</h4>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                {slots.map((s) => {
                  const isMine = mySlot === s.hour;
                  const isTaken = s.taken && !isMine;

                  return (
                    <button
                      key={s.hour}
                      onClick={() => bookSlot(s.hour)}
                      disabled={isTaken}
                      style={{
                        padding: "10px",
                        backgroundColor: isMine
                          ? "green"
                          : isTaken
                            ? "red"
                            : "#eee",
                        color: isTaken || isMine ? "white" : "black",
                        cursor: isTaken ? "not-allowed" : "pointer",
                      }}
                    >
                      {s.hour}:00
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <button
            onClick={() => setShowCalendar(false)}
            style={{ marginTop: "20px" }}
          >
            Close
          </button>
        </div>
      )}
      {showForm && (
        <div
          style={{
            border: "1px solid #ccc",
            padding: "20px",
            marginTop: "20px",
            maxWidth: "400px",
          }}
        >
          <h3>Submit Activity</h3>

          <form onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Activity title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <br />
            <br />

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            >
              <option value="" disabled>
                -- Select Category --
              </option>
              <option value="Work">Work</option>
              <option value="Study">Study</option>
              <option value="Life">Life</option>
            </select>

            <br />
            <br />

            <input
              type="datetime-local"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
            />

            <br />
            <br />
            <label>
              Payment(optional):
              <input
                type="text"
                size="25"
                placeholder="number only spending:- income:+"
                value={payment}
                onChange={(e) => setPayment(e.target.value)}
              />
            </label>
            <br />
            <br />
            <label style={{ display: "block" }}>Location:</label>
            <textarea
              type="text"
              rows={2}
              cols={50}
              placeholder="Recommend a map link + a simple description"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
            />

            <br />
            <br />

            <button type="submit">Submit</button>

            <button
              type="button"
              onClick={() => setShowForm(false)}
              style={{ marginLeft: "10px" }}
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      {message && <p style={{ marginTop: "15px", color: "red" }}>{message}</p>}
      {showAssignmentForm && (
        <div
          style={{
            border: "1px solid #ccc",
            padding: "20px",
            marginTop: "20px",
            maxWidth: "400px",
          }}
        >
          <h3>Submit Assignment</h3>
          <form onSubmit={handleAssignmentSubmit}>
            <label style={{ display: "block", marginBottom: "6px" }}>
              PDF File:
            </label>
            <input
              type="file"
              accept="application/pdf"
              required
              onChange={(e) => setAssignmentFile(e.target.files[0])}
            />

            <br />
            <br />

            <label style={{ display: "block", marginBottom: "6px" }}>
              Deadline:
            </label>
            <input
              type="datetime-local"
              value={assignmentDeadline}
              onChange={(e) => setAssignmentDeadline(e.target.value)}
              required
            />

            <br />
            <br />

            <button type="submit" disabled={assignmentUploading}>
              {assignmentUploading ? "Uploading..." : "Submit"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAssignmentForm(false);
                setAssignmentMessage("");
              }}
              style={{ marginLeft: "10px" }}
            >
              Cancel
            </button>
          </form>

          {assignmentMessage && (
            <p
              style={{
                marginTop: "10px",
                color: assignmentMessage.includes("success") ? "green" : "red",
              }}
            >
              {assignmentMessage}
            </p>
          )}
        </div>
      )}
      {showNotifyForm && (
        <div
          style={{
            border: "1px solid #ccc",
            padding: "20px",
            marginTop: "20px",
            maxWidth: "400px",
          }}
        >
          <h3>Notification Settings</h3>
          <button
            onClick={() => setShowHelpDialog(!showHelpDialog)}
            style={{
              marginBottom: "10px",
              background: "#f0f0f0",
              border: "1px solid #ccc",
              cursor: "pointer",
            }}
          >
            how to get them?
          </button>
          {showHelpDialog && (
            <div
              style={{
                border: "1px solid #aaa",
                padding: "15px",
                marginBottom: "15px",
                background: "#fafafa",
              }}
            >
              <h4>How to get notification settings</h4>

              <p>
                <b>Discord Webhook Link</b>
              </p>
              <ol>
                <li>Open Discord</li>
                <li>Go to your server</li>
                <li>Click Server Settings</li>
                <li>Integrations → Webhooks</li>
                <li>Create New Webhook</li>
                <li>Copy Webhook URL</li>
              </ol>

              <p>
                <b>Telegram Bot Token</b>
              </p>
              <ol>
                <li>Open Telegram</li>
                <li>
                  Search <b>@BotFather</b>
                </li>
                <li>Type /start</li>
                <li>Type /newbot</li>
                <li>Follow instructions</li>
                <li>Copy API token</li>
              </ol>

              <p>
                <b>Telegram Chat ID</b>
              </p>
              <ol>
                <li>
                  Search <b>@userinfobot</b>
                </li>
                <li>Click Start</li>
                <li>Copy your Chat ID</li>
              </ol>

              <button
                onClick={() => setShowHelpDialog(false)}
                style={{ marginTop: "10px" }}
              >
                Close
              </button>
            </div>
          )}
          <div>
            <label>Webhook Link</label>
            <input
              type="text"
              value={webhook}
              onChange={(e) => setWebhook(e.target.value)}
            />

            <br />
            <br />

            <label>Telegram Bot Token</label>
            <input
              type="text"
              value={telegramToken}
              onChange={(e) => setTelegramToken(e.target.value)}
            />

            <br />
            <br />

            <label>Telegram Chat ID</label>
            <input
              type="text"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
            />

            <br />
            <br />

            <button onClick={saveNotification}>Save</button>

            <button
              onClick={() => setShowNotifyForm(false)}
              style={{ marginLeft: "10px" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {suggestion && (
        <div
          style={{
            marginTop: "30px",
            marginBottom: "10px",
            border: "1px solid #ccc",
            borderRadius: "8px",
            padding: "20px",
            background: "#f9f9ff",
          }}
        >
          <h2 style={{ marginTop: 0 }}>📚 Assignment Suggestions</h2>

          <p style={{ lineHeight: "1.7", color: "#333" }}>
            {suggestion.study_plan}
          </p>

          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginTop: "16px",
              fontSize: "0.9rem",
            }}
          >
            <thead>
              <tr style={{ background: "#e8e8f0" }}>
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
                    style={{ background: rank % 2 === 0 ? "#fff" : "#f4f4fb" }}
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
  );
}
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
  const startPad = monthStart.getDay(); // 0=Sun
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
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500&display=swap');
        .cal-wrap { font-family: 'DM Sans', sans-serif; margin-top: 32px; }
        .cal-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; }
        .cal-title { font-family:'DM Serif Display',serif; font-size:1.6rem; color:#1a1a2e; letter-spacing:0.02em; }
        .cal-nav { background:none; border:1.5px solid #d0d0e0; border-radius:8px; width:36px; height:36px; cursor:pointer; font-size:1.1rem; display:flex; align-items:center; justify-content:center; transition:background 0.15s; }
        .cal-nav:hover { background:#f0f0f8; }
        .cal-legend { display:flex; gap:16px; margin-bottom:16px; flex-wrap:wrap; }
        .cal-legend-item { display:flex; align-items:center; gap:6px; font-size:0.8rem; font-weight:500; }
        .cal-legend-dot { width:10px; height:10px; border-radius:50%; }
        .cal-grid { display:grid; grid-template-columns:repeat(7,1fr); border-left:1px solid #e8e8f0; border-top:1px solid #e8e8f0; border-radius:12px; overflow:hidden; box-shadow:0 2px 16px rgba(0,0,40,0.07); }
        .cal-dow { background:#f5f5fc; padding:10px 0; text-align:center; font-size:0.72rem; font-weight:600; letter-spacing:0.08em; color:#7070a0; text-transform:uppercase; border-right:1px solid #e8e8f0; border-bottom:1px solid #e8e8f0; }
        .cal-cell { min-height:110px; background:#fff; border-right:1px solid #e8e8f0; border-bottom:1px solid #e8e8f0; padding:8px 6px 6px; display:flex; flex-direction:column; gap:3px; position:relative; }
        .cal-cell.other-month { background:#fafafa; }
        .cal-cell.today .cal-day-num { background:#1a1a2e; color:#fff; border-radius:50%; width:24px; height:24px; display:flex; align-items:center; justify-content:center; }
        .cal-day-num { font-size:0.8rem; font-weight:500; color:#444; margin-bottom:2px; width:24px; height:24px; display:flex; align-items:center; justify-content:center; }
        .cal-chip { border-radius:5px; padding:2px 6px; font-size:0.72rem; font-weight:500; cursor:pointer; border:none; text-align:left; transition:filter 0.15s, transform 0.1s; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100%; }
        .cal-chip:hover { filter:brightness(0.93); transform:scale(1.03); }
        .cal-more { font-size:0.68rem; color:#8888aa; margin-top:1px; cursor:pointer; }
        .cal-modal-backdrop { position:fixed; inset:0; background:rgba(10,10,30,0.45); z-index:2000; display:flex; align-items:center; justify-content:center; padding:20px; }
        .cal-modal { background:#fff; border-radius:16px; max-width:480px; width:100%; max-height:85vh; overflow-y:auto; box-shadow:0 20px 60px rgba(0,0,40,0.25); }
        .cal-modal-inner { padding:24px; }
        .cal-modal-close { float:right; background:none; border:none; font-size:1.4rem; cursor:pointer; color:#888; line-height:1; }
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
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        },
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
