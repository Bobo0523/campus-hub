// App.jsx 的逻辑雏形
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState, useEffect } from 'react';
import AuthForm from './components/auth/AuthForm';
import Dashboard from './components/layout/Dashboard';
import { supabase } from './lib/supabaseClient';
import LostAndFound from './components/layout/LostAndFound';
function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {

    // check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // listen for login/logout changes
    const { data: { subscription } } =
      supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
      });

    return () => subscription.unsubscribe();

  }, []);

  // if not logged in → show login/signup
  if (!session) {
    return <AuthForm />;
  }

  // if logged in → show dashboard
  return (
    <BrowserRouter basename="/campus-hub">

      <Routes>

        <Route
          path="/"
          element={<Dashboard session={session} />}
        />

        <Route
          path="/lost-and-found"
          element={<LostAndFound session={session} />}
        />

      </Routes>

    </BrowserRouter>);
}

export default App;