"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  saveCustomerUser,
  CustomerUser,
} from "@/lib/customerAuth";

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "register">(
    "login"
  );

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function submitForm() {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const endpoint =
        mode === "login"
          ? "/api/auth/login"
          : "/api/auth/register";

      const body =
        mode === "login"
          ? {
              phone,
              password,
            }
          : {
              fullName,
              phone,
              email,
              password,
            };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Something went wrong."
        );
      }

      const user = data.user as CustomerUser;

      saveCustomerUser(user);

      setMessage(data.message);

      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 500);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        background: "#020617",
        color: "#fff",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "430px",
          background: "#0f172a",
          border: "1px solid #1e293b",
          borderRadius: "18px",
          padding: "25px",
        }}
      >
        <div
          style={{
            textAlign: "center",
            marginBottom: "25px",
          }}
        >
          <div style={{ fontSize: "42px" }}>⚡</div>

          <h1
            style={{
              margin: "8px 0 5px",
              fontSize: "28px",
            }}
          >
            TechStar
          </h1>

          <p
            style={{
              margin: 0,
              color: "#94a3b8",
            }}
          >
            {mode === "login"
              ? "Welcome back"
              : "Create your account"}
          </p>
        </div>

        {mode === "register" && (
          <input
            value={fullName}
            onChange={(e) =>
              setFullName(e.target.value)
            }
            placeholder="Full Name"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "13px",
              marginBottom: "12px",
              borderRadius: "9px",
              border: "1px solid #334155",
              background: "#020617",
              color: "#fff",
            }}
          />
        )}

        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone Number"
          inputMode="tel"
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "13px",
            marginBottom: "12px",
            borderRadius: "9px",
            border: "1px solid #334155",
            background: "#020617",
            color: "#fff",
          }}
        />

        {mode === "register" && (
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email Address (optional)"
            type="email"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "13px",
              marginBottom: "12px",
              borderRadius: "9px",
              border: "1px solid #334155",
              background: "#020617",
              color: "#fff",
            }}
          />
        )}

        <input
          value={password}
          onChange={(e) =>
            setPassword(e.target.value)
          }
          placeholder="Password"
          type="password"
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "13px",
            marginBottom: "15px",
            borderRadius: "9px",
            border: "1px solid #334155",
            background: "#020617",
            color: "#fff",
          }}
        />

        {error && (
          <div
            style={{
              padding: "10px",
              marginBottom: "12px",
              borderRadius: "8px",
              background: "#450a0a",
              color: "#fecaca",
              fontSize: "14px",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {message && (
          <div
            style={{
              padding: "10px",
              marginBottom: "12px",
              borderRadius: "8px",
              background: "#052e16",
              color: "#bbf7d0",
              fontSize: "14px",
            }}
          >
            ✓ {message}
          </div>
        )}

        <button
          onClick={submitForm}
          disabled={loading}
          style={{
            width: "100%",
            padding: "13px",
            borderRadius: "9px",
            border: "none",
            background: "#2563eb",
            color: "#fff",
            fontWeight: 800,
            cursor: loading
              ? "not-allowed"
              : "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading
            ? "Please wait..."
            : mode === "login"
              ? "Login"
              : "Create Account"}
        </button>

        <button
          onClick={() => {
            setMode(
              mode === "login"
                ? "register"
                : "login"
            );
            setError("");
            setMessage("");
          }}
          style={{
            width: "100%",
            marginTop: "12px",
            padding: "11px",
            borderRadius: "9px",
            border: "1px solid #334155",
            background: "transparent",
            color: "#cbd5e1",
            cursor: "pointer",
          }}
        >
          {mode === "login"
            ? "Create a new account"
            : "Already have an account? Login"}
        </button>
      </div>
    </main>
  );
}

