import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

export default function Dashboard({ session }) {
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

  useEffect(() => {
    loadActivities();
  }, []);

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
      <div style={{ display: "flex", gap: "20px", marginTop: "30px" }}>
        <section style={{ flex: 1, border: "1px solid #ccc", padding: "10px" }}>
          <h3>Work</h3>
          {workActivities.map((a) => (
            <ActivityCard key={a.id} activity={a} session={session} />
          ))}
        </section>

        <section style={{ flex: 1, border: "1px solid #ccc", padding: "10px" }}>
          <h3>Study</h3>
          {studyActivities.map((a) => (
            <ActivityCard key={a.id} activity={a} session={session} />
          ))}
        </section>

        <section style={{ flex: 1, border: "1px solid #ccc", padding: "10px" }}>
          <h3>Life</h3>
          {lifeActivities.map((a) => (
            <ActivityCard key={a.id} activity={a} session={session} />
          ))}
        </section>
      </div>
    </div>
  );
}
function ActivityCard({ activity, session }) {
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState([]);
  const [subscriptionCount, setSubscriptionCount] = useState(0);
  const [subscribed, setSubscribed] = useState(false);
  const [weather, setWeather] = useState(null);
  useEffect(() => {
    checkSubscription();
    loadComments();
    loadSubscriptionCount();
    loadWeather();
  }, []);

  async function loadComments() {
    const { data, error } = await supabase
      .from("comments")
      .select("*")
      .eq("activity_id", activity.id)
      .order("created_at", { ascending: true });

    if (!error) {
      setComments(data);
    }
  }
  async function loadWeather() {
    try {
      const activityDate = new Date(activity.time);
      const now = new Date();

      // 1️⃣ past activity → do not show weather
      if (activityDate < now) {
        setWeather("past");
        return;
      }

      const response = await fetch(
        "https://api.openweathermap.org/data/2.5/forecast?q=Hamilton,NZ&appid=0fbb9a42ac0560c73eef8bf756c5cceb&units=metric",
      );

      const data = await response.json();

      if (!data.list) return;

      // 2️⃣ forecast only available for 5 days
      const lastForecastTime = new Date(data.list[data.list.length - 1].dt_txt);

      if (activityDate > lastForecastTime) {
        setWeather("noforecast");
        return;
      }

      // 3️⃣ find closest forecast

      const activityTime = activityDate.getTime();

      let closest = null;
      let minDiff = Infinity;

      data.list.forEach((w) => {
        const weatherTime = new Date(w.dt_txt).getTime();
        const diff = Math.abs(weatherTime - activityTime);

        if (diff < minDiff) {
          minDiff = diff;
          closest = w;
        }
      });

      if (closest) {
        setWeather(closest);
      }
    } catch (err) {
      console.error("Weather error:", err);
    }
  }
  async function loadSubscriptionCount() {
    const { count, error } = await supabase
      .from("subscription")
      .select("*", { count: "exact", head: true })
      .eq("activity_id", activity.id);

    if (!error) {
      setSubscriptionCount(count);
    }
  }
  async function checkSubscription() {
    const { data } = await supabase
      .from("subscription")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("activity_id", activity.id);

    if (data && data.length > 0) {
      setSubscribed(true);
    }
  }
  async function subscribe() {
    const { error } = await supabase.from("subscription").insert([
      {
        user_id: session.user.id,
        activity_id: activity.id,
      },
    ]);

    if (error) {
      console.error(error);
    } else {
      setSubscribed(true);
      loadSubscriptionCount();
    }
  }
  async function unsubscribe() {
    const { error } = await supabase
      .from("subscription")
      .delete()
      .eq("user_id", session.user.id)
      .eq("activity_id", activity.id);

    if (!error) {
      setSubscribed(false);
      loadSubscriptionCount();
    }
  }
  async function submitComment() {
    if (!commentText.trim()) return;

    const { error } = await supabase.from("comments").insert([
      {
        activity_id: activity.id,
        user_id: session.user.id,
        content: commentText,
      },
    ]);

    if (!error) {
      setCommentText("");
      loadComments();
    }
  }

  return (
    <div
      style={{
        border: "1px solid #ddd",
        padding: "10px",
        marginBottom: "10px",
      }}
    >
      <b>{activity.title}</b>

      <p>{activity.time.replace("T", " ").slice(0, 16)}</p>
      {weather === "past" ? null : weather === "noforecast" ? (
        <p style={{ color: "gray" }}>No weather forecast available</p>
      ) : weather ? (
        <div style={{ marginTop: "5px" }}>
          <p>
            Weather: {weather.weather[0].main}({weather.weather[0].description})
          </p>

          <p>Temperature: {weather.main.temp}°C</p>

          <img
            src={`https://openweathermap.org/img/wn/${weather.weather[0].icon}.png`}
            alt="weather"
          />
        </div>
      ) : null}
      {Number(activity.payment) !== 0 && activity.payment && (
        <p>Payment: {activity.payment}</p>
      )}

      <p>{activity.location}</p>

      {subscribed ? (
        <button onClick={unsubscribe}>Unsubscribe</button>
      ) : (
        <button onClick={subscribe}>Subscribe</button>
      )}
      <p style={{ marginTop: "5px" }}>Subscribers: {subscriptionCount}</p>

      <button onClick={() => setShowCommentBox(!showCommentBox)}>
        Comment
      </button>

      {showCommentBox && (
        <div style={{ marginTop: "10px" }}>
          <input
            type="text"
            placeholder="Write a comment"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
          />
          <button onClick={submitComment} style={{ marginLeft: "5px" }}>
            Submit
          </button>
        </div>
      )}

      <div style={{ marginTop: "10px" }}>
        {comments.map((c) => (
          <div
            key={c.id}
            style={{ borderTop: "1px solid #eee", marginTop: "5px" }}
          >
            <small>{new Date(c.created_at).toLocaleString()}</small>
            <p>{c.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
