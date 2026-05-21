import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function LostAndFound({ session }) {
  const [item, setItem] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [lostItems, setLostItems] = useState([]);

  useEffect(() => {
    loadLostItems();
  }, []);

  async function loadLostItems() {
    const { data, error } = await supabase
      .from("lost_and_found")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setMessage(error.message);
    } else {
      setLostItems(data);
    }
  }

  async function submitLostItem(e) {
    e.preventDefault();

    if (!item || !contact) {
      setMessage("Please fill all fields");
      return;
    }

    const { error } = await supabase.from("lost_and_found").insert([
      {
        item: item,
        personal_contact: contact,
      },
    ]);

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Lost item submitted");

      setItem("");
      setContact("");

      loadLostItems();
    }
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1>Lost and Found</h1>

      <form onSubmit={submitLostItem}>
        <h3>Submit Lost Item</h3>

        <input
          type="text"
          placeholder="Lost item description"
          value={item}
          onChange={(e) => setItem(e.target.value)}
        />

        <br />
        <br />

        <input
          type="text"
          placeholder="Personal contact"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
        />

        <br />
        <br />

        <button type="submit">Submit</button>
      </form>

      {message && <p style={{ color: "red" }}>{message}</p>}

      <hr />

      <h3>All Lost Items</h3>

      {lostItems.map((item) => (
        <div
          key={item.id}
          style={{
            border: "1px solid #ccc",
            padding: "10px",
            marginBottom: "10px",
          }}
        >
          <p>
            <b>Item:</b> {item.item}
          </p>
          <p>
            <b>Contact:</b> {item.personal_contact}
          </p>
          <p>
            <small>{new Date(item.created_at).toLocaleString()}</small>
          </p>
        </div>
      ))}
    </div>
  );
}
