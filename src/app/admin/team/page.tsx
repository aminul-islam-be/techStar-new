"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { ADMIN_SECTIONS, SECTION_LABELS, type AdminSection } from "@/lib/adminPermissions";

type Role = "customer" | "moderator" | "admin";

type Member = {
  _id: string;
  fullName: string;
  phone: string;
  role: Role;
  active: boolean;
  permissions?: string[];
};

type Editing = {
  id: string;
  role: Role;
  permissions: string[];
};

const ROLE_HELP: Record<Role, string> = {
  admin: "Admin: সব অংশে পূর্ণ অ্যাক্সেস, team-ও সামলাতে পারবে।",
  moderator: "Moderator: শুধু বেছে দেওয়া অংশে কাজ করতে পারবে।",
  customer: "Customer: সাধারণ user, admin প্যানেলে ঢুকতে পারবে না।",
};

const panel: CSSProperties = {
  background: "#0f172a",
  border: "1px solid #1e293b",
  borderRadius: "16px",
  padding: "18px",
  marginBottom: "18px",
};

const input: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 14px",
  borderRadius: "10px",
  border: "1px solid #334155",
  background: "#020617",
  color: "white",
};

const button: CSSProperties = {
  padding: "10px 16px",
  borderRadius: "10px",
  border: "1px solid #2563eb",
  background: "#2563eb",
  color: "white",
  fontWeight: 700,
  cursor: "pointer",
};

const ghostButton: CSSProperties = {
  ...button,
  background: "transparent",
  border: "1px solid #334155",
  color: "#cbd5e1",
};

function roleBadge(role: Role): CSSProperties {
  return {
    padding: "5px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 700,
    background: role === "admin" ? "#312e81" : role === "moderator" ? "#78350f" : "#164e63",
  };
}

export default function AdminTeamPage() {
  const [team, setTeam] = useState<Member[]>([]);
  const [customers, setCustomers] = useState<Member[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Editing | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load(term: string) {
    try {
      const response = await fetch(`/api/admin/team?search=${encodeURIComponent(term)}`, {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to load team.");
      }

      setTeam(Array.isArray(data.team) ? data.team : []);
      setCustomers(Array.isArray(data.customers) ? data.customers : []);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load team.");
    }
  }

  useEffect(() => {
    load("");
  }, []);

  function startEdit(member: Member) {
    setMessage("");
    setError("");
    setEditing({
      id: member._id,
      role: member.role,
      permissions: member.permissions || [],
    });
  }

  function toggleSection(section: AdminSection) {
    if (!editing) return;

    const has = editing.permissions.includes(section);

    setEditing({
      ...editing,
      permissions: has
        ? editing.permissions.filter((item) => item !== section)
        : [...editing.permissions, section],
    });
  }

  async function save() {
    if (!editing) return;

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/admin/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editing.id,
          role: editing.role,
          permissions: editing.permissions,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to save.");
      }

      setMessage(data.message || "Saved.");
      setEditing(null);
      await load(search.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save.");
    } finally {
      setBusy(false);
    }
  }

  function renderMember(member: Member) {
    const current = editing && editing.id === member._id ? editing : null;

    return (
      <div key={member._id} style={{ borderTop: "1px solid #1e293b", padding: "14px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
          <div>
            <strong>{member.fullName}</strong>
            <div style={{ color: "#94a3b8", fontSize: "14px" }}>📞 {member.phone}</div>
          </div>
          <span style={roleBadge(member.role)}>{member.role}</span>
        </div>

        {member.role === "moderator" && member.permissions && member.permissions.length > 0 ? (
          <div style={{ color: "#94a3b8", fontSize: "13px", marginTop: "6px" }}>
            Access: {member.permissions.map((p) => SECTION_LABELS[p as AdminSection] || p).join(", ")}
          </div>
        ) : null}

        {current ? (
          <div
            style={{
              marginTop: "12px",
              background: "#020617",
              border: "1px solid #334155",
              borderRadius: "12px",
              padding: "14px",
            }}
          >
            <label style={{ display: "block", color: "#94a3b8", fontSize: "13px", marginBottom: "6px" }}>
              Role
            </label>
            <select
              value={current.role}
              onChange={(e) => setEditing({ ...current, role: e.target.value as Role })}
              style={input}
            >
              <option value="admin">admin</option>
              <option value="moderator">moderator</option>
              <option value="customer">customer</option>
            </select>
            <p style={{ color: "#64748b", fontSize: "13px", margin: "8px 0 0" }}>
              {ROLE_HELP[current.role]}
            </p>

            {current.role === "moderator" ? (
              <div style={{ marginTop: "14px" }}>
                <div style={{ color: "#94a3b8", fontSize: "13px", marginBottom: "8px" }}>
                  কোন কোন অংশে অ্যাক্সেস দেবেন
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  {ADMIN_SECTIONS.map((section) => (
                    <label
                      key={section}
                      style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", cursor: "pointer" }}
                    >
                      <input
                        type="checkbox"
                        checked={current.permissions.includes(section)}
                        onChange={() => toggleSection(section)}
                      />
                      {SECTION_LABELS[section]}
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            <div style={{ display: "flex", gap: "8px", marginTop: "14px" }}>
              <button
                type="button"
                onClick={save}
                disabled={busy}
                style={{ ...button, opacity: busy ? 0.6 : 1 }}
              >
                {busy ? "Saving..." : "Save"}
              </button>
              <button type="button" onClick={() => setEditing(null)} style={ghostButton}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => startEdit(member)}
            style={{ ...ghostButton, marginTop: "10px" }}
          >
            Change role
          </button>
        )}
      </div>
    );
  }

  const searchTerm = search.trim();

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "white",
        padding: "24px 16px 60px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ maxWidth: "720px", margin: "0 auto" }}>
        <Link href="/admin" style={{ color: "#94a3b8", textDecoration: "none" }}>
          ← Admin dashboard
        </Link>

        <h1 style={{ fontSize: "clamp(26px, 6vw, 34px)", margin: "14px 0 6px" }}>
          Team &amp; permissions
        </h1>
        <p style={{ color: "#94a3b8", marginBottom: "18px", lineHeight: 1.6 }}>
          Customer-কে admin বা moderator বানাতে পারবেন। Admin role শুধু admin-রাই দিতে বা সরাতে পারে।
        </p>

        {message ? <div style={{ ...panel, borderColor: "#14532d", color: "#86efac" }}>{message}</div> : null}
        {error ? <div style={{ ...panel, borderColor: "#7f1d1d", color: "#fca5a5" }}>{error}</div> : null}

        <section style={panel}>
          <h2 style={{ fontSize: "20px", margin: "0 0 4px" }}>Current team</h2>
          {team.length === 0 ? (
            <p style={{ color: "#94a3b8" }}>এখনো কোনো admin বা moderator নেই।</p>
          ) : (
            team.map(renderMember)
          )}
        </section>

        <section style={panel}>
          <h2 style={{ fontSize: "20px", margin: "0 0 12px" }}>Find a customer</h2>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Phone or name"
              style={{ ...input, flex: 1 }}
            />
            <button type="button" onClick={() => load(searchTerm)} style={button}>
              Search
            </button>
          </div>

          {searchTerm && customers.length === 0 ? (
            <p style={{ color: "#94a3b8", marginTop: "14px" }}>কোনো customer পাওয়া যায়নি।</p>
          ) : null}

          {customers.map(renderMember)}
        </section>
      </div>
    </main>
  );
}
