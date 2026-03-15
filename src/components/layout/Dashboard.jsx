import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function Dashboard({ session }) {

  const [showForm,setShowForm] = useState(false);

  const [title,setTitle] = useState("");
  const [category,setCategory] = useState("");
  const [time,setTime] = useState("");
  const [payment,setPayment] = useState("");
  const [location,setLocation] = useState("");

  const [activities,setActivities] = useState([]);
  const [message,setMessage] = useState("");

  useEffect(()=>{
    loadActivities();
  },[]);

  async function loadActivities(){
    const { data, error } = await supabase
      .from("activities")
      .select("*")
      .order("time",{ ascending:true });

    if(error){
      console.error(error);
      setMessage("Error loading activities: " + error.message);
    } else {
      setActivities(data);
    }
  }

  async function handleSubmit(e){
    e.preventDefault();

    setMessage("Submitting...");

    const { data, error } = await supabase
      .from("activities")
      .insert([
        {
          title,
          category,
          time,
          payment: payment || null,
          location,
          user_id: session.user.id
        }
      ]);

    if(error){
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

  const workActivities = activities.filter(a=>a.category==="Work");
  const studyActivities = activities.filter(a=>a.category==="Study");
  const lifeActivities = activities.filter(a=>a.category==="Life");

  return (
    <div style={{ padding: "20px" }}>

      <h1>Waikato Campus Hub</h1>

      <button onClick={()=>setShowForm(true)}>
        Submit Activity
      </button>

      {showForm && (

        <div style={{
          border:"1px solid #ccc",
          padding:"20px",
          marginTop:"20px",
          maxWidth:"400px"
        }}>

          <h3>Submit Activity</h3>

          <form onSubmit={handleSubmit}>

            <input
              type="text"
              placeholder="Activity title"
              value={title}
              onChange={(e)=>setTitle(e.target.value)}
              required
            />

            <br/><br/>
          
            <select
              value={category}
              onChange={(e)=>setCategory(e.target.value)}
              required
            >
              <option value="" disabled>-- Select Category --</option>
              <option value="Work">Work</option>
              <option value="Study">Study</option>
              <option value="Life">Life</option>
            </select>
          

            <br/><br/>

            <input
              type="datetime-local"
              value={time}
              onChange={(e)=>setTime(e.target.value)}
              required
            />

            <br/><br/>
          <label>Payment(optional):  
            <input
              type="text"
              size="25"
              placeholder="number only spending:- income:+"
              value={payment}
              onChange={(e)=>setPayment(e.target.value)}
            />
          </label>
            <br/><br/>
          <label style={{display: 'block'}}>
            Location: 
            </label>
            <textarea
              type="text"
              rows={2}
              cols={50}
              placeholder="Recommend a map link + a simple description"
              value={location}
              onChange={(e)=>setLocation(e.target.value)}
              required
            />
            

            <br/><br/>

            <button type="submit">
              Submit
            </button>

            <button
              type="button"
              onClick={()=>setShowForm(false)}
              style={{marginLeft:"10px"}}
            >
              Cancel
            </button>

          </form>

        </div>

      )}

      {message && (
        <p style={{marginTop:"15px",color:"red"}}>
          {message}
        </p>
      )}

      <div style={{ display: "flex", gap: "20px", marginTop:"30px" }}>

        <section style={{ flex: 1, border: "1px solid #ccc", padding:"10px" }}>
          <h3>Work</h3>
          {workActivities.map(a=>(
            <ActivityCard
            key={a.id}
            activity={a}
            session={session}
            />
          ))}
        </section>

        <section style={{ flex: 1, border: "1px solid #ccc", padding:"10px" }}>
          <h3>Study</h3>
          {studyActivities.map(a=>(
            <ActivityCard 
            key={a.id}
            activity={a}
            session={session}
            />
          ))}
        </section>

        <section style={{ flex: 1, border: "1px solid #ccc", padding:"10px" }}>
          <h3>Life</h3>
          {lifeActivities.map(a=>(
            <ActivityCard
            key={a.id}
            activity={a}
            session={session}
            />
          ))}
        </section>

      </div>

    </div>
  );
  
}
function ActivityCard({ activity, session }) {

  const [showCommentBox,setShowCommentBox] = useState(false);
  const [commentText,setCommentText] = useState("");
  const [comments,setComments] = useState([]);

  useEffect(()=>{
    loadComments();
  },[]);

  async function loadComments(){

    const { data, error } = await supabase
      .from("comments")
      .select("*")
      .eq("activity_id", activity.id)
      .order("created_at",{ascending:true});

    if(!error){
      setComments(data);
    }
  }

  async function submitComment(){

    if(!commentText.trim()) return;

    const { error } = await supabase
      .from("comments")
      .insert([
        {
          activity_id: activity.id,
          user_id: session.user.id,
          content: commentText
        }
      ]);

    if(!error){
      setCommentText("");
      loadComments();
    }
  }

  return (

    <div style={{border:"1px solid #ddd",padding:"10px",marginBottom:"10px"}}>

      <b>{activity.title}</b>

      <p>{activity.time.replace("T"," ").slice(0,16)}</p>
      {Number(activity.payment) !== 0 && activity.payment && (
      <p>Payment: {activity.payment}</p>
      )}

      <p>{activity.location}</p>

      <button onClick={()=>setShowCommentBox(!showCommentBox)}>
        Comment
      </button>

      {showCommentBox && (
        <div style={{marginTop:"10px"}}>
          <input
            type="text"
            placeholder="Write a comment"
            value={commentText}
            onChange={(e)=>setCommentText(e.target.value)}
          />
          <button onClick={submitComment} style={{marginLeft:"5px"}}>
            Submit
          </button>
        </div>
      )}

      <div style={{marginTop:"10px"}}>
        {comments.map(c=>(
          <div key={c.id} style={{borderTop:"1px solid #eee",marginTop:"5px"}}>
            <small>{new Date(c.created_at).toLocaleString()}</small>
            <p>{c.content}</p>
          </div>
        ))}
      </div>

    </div>

  );
}