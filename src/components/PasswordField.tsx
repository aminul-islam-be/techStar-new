"use client";

import { useState } from "react";

/**
 * Password box with an eye icon. Tap the eye to see what was typed, tap again to hide it.
 * The surrounding <form> still sends the value under the given `name`.
 */
export default function PasswordField({
  name,
  placeholder,
  autoComplete = "current-password",
  required = false,
}: {
  name: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const label = visible ? "Hide password" : "Show password";

  return (
    <div style={{ position: "relative", marginBottom: "14px" }}>
      <input
        name={name}
        type={visible ? "text" : "password"}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "14px 52px 14px 14px",
          borderRadius: "12px",
          border: "1px solid #334155",
          background: "#020617",
          color: "white",
        }}
      />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={label}
        title={label}
        style={{
          position: "absolute",
          right: "4px",
          top: "50%",
          transform: "translateY(-50%)",
          width: "44px",
          height: "44px",
          padding: 0,
          border: 0,
          background: "transparent",
          color: "#94a3b8",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}
