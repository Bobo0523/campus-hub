import { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function ActivityCard({ activity, session }) {
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
  function addToCalendar() {
    const start = new Date(activity.time);
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    const formatICS = (date) =>
      date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

    const description = [
      activity.location ? `Location: ${activity.location}` : "",
      activity.payment ? `Payment: ${activity.payment}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const isApple = /iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent);

    if (isApple) {
      // webcal:// is handled by the OS → opens Calendar.app directly, no download
      const webcalUrl =
        `http://rich-ghosts-mix.loca.lt/api/calendar/${activity.id}`.replace(
          "http://",
          "webcal://",
        );
      window.location.href = webcalUrl;
    } else {
      // Google Calendar pre-filled URL → opens in browser tab, no download
      const googleUrl = new URL("https://calendar.google.com/calendar/render");
      googleUrl.searchParams.set("action", "TEMPLATE");
      googleUrl.searchParams.set("text", activity.title);
      googleUrl.searchParams.set(
        "dates",
        `${formatICS(start)}/${formatICS(end)}`,
      );
      if (description) googleUrl.searchParams.set("details", description);
      if (activity.location)
        googleUrl.searchParams.set("location", activity.location);
      window.open(googleUrl.toString(), "_blank");
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

      <p>{new Date(activity.time).toLocaleString()}</p>
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
      <button
        onClick={addToCalendar}
        style={{ marginLeft: "8px" }}
        title="Add to Apple / Google Calendar"
      >
        📅 Add to Calendar
      </button>
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
