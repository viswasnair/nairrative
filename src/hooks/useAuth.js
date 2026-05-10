import { useState, useEffect } from "react";
import { getSession, signIn, signOut, onAuthStateChange } from "../lib/auth";

export function useAuth() {
  const [session,        setSession]        = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginEmail,     setLoginEmail]     = useState("");
  const [loginPassword,  setLoginPassword]  = useState("");
  const [loginError,     setLoginError]     = useState("");
  const [loginLoading,   setLoginLoading]   = useState(false);

  useEffect(() => {
    getSession().then(session => setSession(session));
    const unsubscribe = onAuthStateChange((_event, session) => setSession(session));
    return unsubscribe;
  }, []);

  const closeLoginModal = () => { setShowLoginModal(false); setLoginError(""); };

  useEffect(() => {
    if (!showLoginModal) return;
    const handler = (e) => { if (e.key === "Escape") closeLoginModal(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showLoginModal]);

  const login = async () => {
    setLoginLoading(true); setLoginError("");
    const { error } = await signIn(loginEmail, loginPassword);
    if (error) setLoginError(error.message);
    else { setShowLoginModal(false); setLoginEmail(""); setLoginPassword(""); }
    setLoginLoading(false);
  };

  const logout = async () => { await signOut(); };

  return {
    session,
    showLoginModal, setShowLoginModal,
    loginEmail, setLoginEmail,
    loginPassword, setLoginPassword,
    loginError, loginLoading,
    login, logout, closeLoginModal,
  };
}
