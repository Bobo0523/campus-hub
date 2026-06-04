import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

function AuthForm() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [showOTP, setShowOTP] = useState(false);

  const validDomain = "@students.waikato.ac.nz";

  function checkEmail(email) {
    return email.endsWith(validDomain);
  }

  async function sendCode() {
    // if(!checkEmail(email)){
    //   setMessage("Use your Waikato student email.");
    //   return;
    // }

    const { error } = await supabase.auth.signInWithOtp({
      email,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("OTP sent. Check your email.");
      setShowOTP(true); // 👈 show OTP input
    }
  }

  async function verifyCode() {
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "email",
    });

    if (error) {
      setMessage(error.message);
    }
  }

  return (
    <div style={{ padding: "40px" }}>
      <h2>Waikato Student Signup/Login</h2>

      <input
        type="email"
        placeholder="yourname@students.waikato.ac.nz"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <br />
      <br />

      <button onClick={sendCode}>Send Signup/Login Code</button>

      {showOTP && (
        <div>
          <br />

          <input
            type="text"
            placeholder="Enter OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />

          <br />
          <br />

          <button onClick={verifyCode}>Verify Code</button>
        </div>
      )}

      <p>{message}</p>
    </div>
  );
}

export default AuthForm;
