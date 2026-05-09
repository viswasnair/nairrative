import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export function useAuth() {
  const [session,        setSession]        = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginEmail,     setLoginEmail]     = useState("");
  const [loginPassword,  setLoginPassword]  = useState("");
  const [loginError,     setLoginError]     = useState("");
  const [loginLoading,   setLoginLoading]   = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  const closeLoginModal = () => { setShowLoginModal(false); setLoginError(""); };

  useEffect(() => {
    if (!showLoginModal) return;
    const handler = (e) => { if (e.key === "Escape") closeLoginModal(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showLoginModal]); // eslint-disable-line react-hooks/exhaustive-deps

  const login = async () => {
    setLoginLoading(true); setLoginError("");
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
    if (error) setLoginError(error.message);
    else { setShowLoginModal(false); setLoginEmail(""); setLoginPassword(""); }
    setLoginLoading(false);
  };

  const logout = async () => { await supabase.auth.signOut(); };

  return {
    session,
    showLoginModal, setShowLoginModal,
    loginEmail, setLoginEmail,
    loginPassword, setLoginPassword,
    loginError, loginLoading,
    login, logout, closeLoginModal,
  };
}
