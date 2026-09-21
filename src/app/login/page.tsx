"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveCustomerUser, CustomerUser } from "@/lib/customerAuth";

export default function LoginPage() {
  const router = useRouter();

  // "forgot" নামে নতুন একটি মোড যুক্ত করা হলো
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function submitForm() {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      let endpoint = "";
      let body = {};

      if (mode === "login") {
        endpoint = "/api/auth/login";
        body = { phone, password };
      } else if (mode === "register") {
        endpoint = "/api/auth/register";
        body = { fullName, phone, email, password };
      } else if (mode === "forgot") {
        endpoint = "/api/auth/reset-password";
        body = { phone, newPassword: password };
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Something went wrong.");
      }

      setMessage(data.message);

      // পাসওয়ার্ড রিসেট হলে ২ সেকেন্ড পর আবার লগিন পেজে ফিরিয়ে আনবে
      if (mode === "forgot") {
        setTimeout(() => {
          setMode("login");
          setPassword("");
          setMessage("");
        }, 2000);
        return;
      }

      const user = data.user as CustomerUser;
      saveCustomerUser(user);

      setTimeout(() => {
        const params = new URLSearchParams(window.location.search);
        const redirectUrl = params.get("redirect") || "/";
        router.push(redirectUrl);
        router.refresh();
      }, 500);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", background: "#020617", color: "#fff" }}>
      <div style={{ width: "100%", maxWidth: "430px", background: "#0f172a", border: "1px solid #1e293b", borderRadius: "18px", padding: "25px" }}>
        <div style={{ textAlign: "center", marginBottom: "25px" }}>
          <div style={{ fontSize: "42px" }}>⚡</div>
          <h1 style={{ margin: "8px 0 5px", fontSize: "28px" }}>TechStar</h1>
          <p style={{ margin: 0, color: "#94a3b8" }}>
            {mode === "login" ? "Welcome back" : mode === "register" ? "Create your account" : "Reset your password"}
          </p>
        </div>

        {mode === "register" && (
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full Name" style={{ width: "100%", boxSizing: "border-box", padding: "13px", marginBottom: "12px", borderRadius: "9px", border: "1px solid #334155", background: "#020617", color: "#fff" }} />
        )}

        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone Number" inputMode="tel" style={{ width: "100%", boxSizing: "border-box", padding: "13px", marginBottom: "12px", borderRadius: "9px", border: "1px solid #334155", background: "#020617", color: "#fff" }} />

        {mode === "register" && (
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email Address (optional)" type="email" style={{ width: "100%", boxSizing: "border-box", padding: "13px", marginBottom: "12px", borderRadius: "9px", border: "1px solid #334155", background: "#020617", color: "#fff" }} />
        )}
        <div style={{ position: "relative", width: "100%" }}>
          <input 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            placeholder={mode === "forgot" ? "Enter New Password" : "Password"} 
            type={showPassword ? "text" : "password"} 
            style={{ width: "100%", boxSizing: "border-box", padding: "13px", paddingRight: "45px", marginBottom: mode === "login" ? "8px" : "15px", borderRadius: "9px", border: "1px solid #334155", background: "#020617", color: "#fff" }} 
          />
          
          <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: "12px", top: "13px", background: "transparent", border: "none", cursor: "pointer", color: "#94a3b8", padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {showPassword ? (
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            ) : (
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a10.05 10.05 0 011.52-3.14m3.05-3.05A10.05 10.05 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.05 10.05 0 01-1.52 3.14m-3.05 3.05A3 3 0 018.95 8.95m3.05 3.05A3 3 0 0115 15m-6.05-6.05l6.1 6.1M3 3l18 18" /></svg>
            )}
          </button>
        </div>

        {/* Forgot Password Link (Only shows in Login mode) */}
        {mode === "login" && (
          <div style={{ textAlign: "right", marginBottom: "15px" }}>
            <button type="button" onClick={() => { setMode("forgot"); setError(""); setMessage(""); }} style={{ background: "transparent", border: "none", color: "#38bdf8", cursor: "pointer", fontSize: "13px" }}>
              Forgot Password?
            </button>
          </div>
        )}

        {error && <div style={{ padding: "10px", marginBottom: "12px", borderRadius: "8px", background: "#450a0a", color: "#fecaca", fontSize: "14px" }}>⚠️ {error}</div>}
        {message && <div style={{ padding: "10px", marginBottom: "12px", borderRadius: "8px", background: "#052e16", color: "#bbf7d0", fontSize: "14px" }}>✓ {message}</div>}

        <button onClick={submitForm} disabled={loading} style={{ width: "100%", padding: "13px", borderRadius: "9px", border: "none", background: "#2563eb", color: "#fff", fontWeight: 800, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
          {loading ? "Please wait..." : mode === "login" ? "Login" : mode === "register" ? "Create Account" : "Reset Password"}
        </button>

        <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); setMessage(""); }} style={{ width: "100%", marginTop: "12px", padding: "11px", borderRadius: "9px", border: "1px solid #334155", background: "transparent", color: "#cbd5e1", cursor: "pointer" }}>
          {mode === "login" ? "Create a new account" : mode === "register" ? "Already have an account? Login" : "Back to Login"}
        </button>
      </div>
    </main>
  );
}
