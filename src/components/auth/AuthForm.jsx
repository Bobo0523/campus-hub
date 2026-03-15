import { useState } from "react";
import { supabase } from "../../lib/supabaseClient"

function AuthForm() {

  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [message,setMessage] = useState("");

  const validDomain = "@students.waikato.ac.nz";

  function checkEmail(email){
    return email.endsWith(validDomain);
  }

  async function handleSignup(e){
    e.preventDefault();

    if(!checkEmail(email)){
      setMessage("Use your Waikato student email.");
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password
    });

    if(error){
      setMessage(error.message);
    }else{
      setMessage("Signup successful. Check your email.");
    }
  }

  async function handleLogin(e){
    e.preventDefault();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if(error){
      setMessage(error.message);
    }
  }

  return (
    <div style={{padding:"40px"}}>

      <h2>Student Login</h2>

      <input
        type="email"
        placeholder="student email"
        value={email}
        onChange={(e)=>setEmail(e.target.value)}
      />

      <br/><br/>

      <input
        type="password"
        placeholder="password"
        value={password}
        onChange={(e)=>setPassword(e.target.value)}
      />

      <br/><br/>

      <button onClick={handleLogin}>Login</button>

      <button onClick={handleSignup} style={{marginLeft:"10px"}}>
        Sign Up
      </button>

      <p>{message}</p>

    </div>
  );
}

export default AuthForm;