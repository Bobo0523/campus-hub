import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

function AuthForm() {

  const [email,setEmail] = useState("");
  const [message,setMessage] = useState("");

  const validDomain = "@students.waikato.ac.nz";

  function checkEmail(email){
    return email.endsWith(validDomain);
  }

  async function handleOTP(e){
    e.preventDefault();

    if(!checkEmail(email)){
      setMessage("Use your Waikato student email.");
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email
    });

    if(error){
      setMessage(error.message);
    } else {
      setMessage("Check your email for the login link.");
    }
  }

  return (
    <div style={{padding:"40px"}}>

      <h2>Waikato Student Login</h2>

      <input
        type="email"
        placeholder="yourname@students.waikato.ac.nz"
        value={email}
        onChange={(e)=>setEmail(e.target.value)}
      />

      <br/><br/>

      <button onClick={handleOTP}>
        Send Login Code
      </button>

      <p>{message}</p>

    </div>
  );
}

export default AuthForm;
