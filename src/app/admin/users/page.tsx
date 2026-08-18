"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type User = {
  _id: string;
  fullName: string;
  phone: string;
  email?: string;
  role: "customer" | "admin";
  active: boolean;
  createdAt?: string;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");

  async function loadUsers() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (search.trim()) {
        params.set("search", search.trim());
      }

      if (role) {
        params.set("role", role);
      }

      const response = await fetch(
        `/api/admin/users?${params.toString()}`
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to load users."
        );
      }

      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load users."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, [role]);

  async function toggleUser(user: User) {
    try {
      setError("");
      setMessage("");

      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: user._id,
          active: !user.active,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to update user."
        );
      }

      setUsers((current) =>
        current.map((item) =>
          item._id === user._id
            ? { ...item, active: !user.active }
            : item
        )
      );

      setMessage(data.message);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update user."
      );
    }
  }
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "#f8fafc",
        padding: "25px 16px 50px",
      }}
    >
      <div
        style={{
          maxWidth: "1150px",
          margin: "0 auto",
        }}
      >
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "15px",
            flexWrap: "wrap",
            marginBottom: "25px",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "32px",
                fontWeight: 800,
              }}
            >
              👥 Users
            </h1>

            <p
              style={{
                color: "#94a3b8",
                marginTop: "6px",
              }}
            >
              Manage TechStar users
            </p>
          </div>

          <Link
            href="/admin"
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "10px 15px",
              borderRadius: "9px",
              background: "#0f172a",
              border: "1px solid #334155",
              color: "#fff",
              textDecoration: "none",
            }}
          >
            ← Admin Dashboard
          </Link>
        </header>

        <section
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
            marginBottom: "20px",
          }}
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                loadUsers();
              }
            }}
            placeholder="Search name, phone or email..."
            style={{
              flex: "1 1 260px",
              minWidth: "0",
              padding: "12px 14px",
              borderRadius: "9px",
              border: "1px solid #334155",
              background: "#0f172a",
              color: "#fff",
              outline: "none",
            }}
          />

          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            style={{
              padding: "12px 14px",
              borderRadius: "9px",
              border: "1px solid #334155",
              background: "#0f172a",
              color: "#fff",
            }}
          >
            <option value="">All Users</option>
            <option value="customer">Customers</option>
            <option value="admin">Admins</option>
          </select>

          <button
            onClick={loadUsers}
            style={{
              padding: "12px 16px",
              borderRadius: "9px",
              border: "1px solid #2563eb",
              background: "#2563eb",
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            🔎 Search
          </button>
        </section>

        {message && (
          <div
            style={{
              padding: "12px 14px",
              marginBottom: "15px",
              borderRadius: "9px",
              background: "#052e16",
              border: "1px solid #166534",
              color: "#bbf7d0",
            }}
          >
            ✓ {message}
          </div>
        )}

        {error && (
          <div
            style={{
              padding: "12px 14px",
              marginBottom: "15px",
              borderRadius: "9px",
              background: "#450a0a",
              border: "1px solid #991b1b",
              color: "#fecaca",
            }}
          >
            ⚠ {error}
          </div>
        )}

        {loading ? (
          <div
            style={{
              padding: "50px 20px",
              textAlign: "center",
              color: "#94a3b8",
            }}
          >
            Loading users...
          </div>
        ) : users.length === 0 ? (
          <div
            style={{
              padding: "55px 20px",
              textAlign: "center",
              background: "#0f172a",
              border: "1px solid #1e293b",
              borderRadius: "15px",
            }}
          >
            <div style={{ fontSize: "50px" }}>👥</div>
            <h2>No Users Found</h2>
            <p style={{ color: "#94a3b8" }}>
              No users match your search.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "15px",
            }}
          >
            {users.map((user) => (
              <article
                key={user._id}
                style={{
                  background: "#0f172a",
                  border: "1px solid #1e293b",
                  borderRadius: "15px",
                  padding: "18px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "10px",
                  }}
                >
                  <div>
                    <h2
                      style={{
                        margin: 0,
                        fontSize: "18px",
                      }}
                    >
                      {user.fullName}
                    </h2>

                    <p
                      style={{
                        margin: "7px 0",
                        color: "#94a3b8",
                      }}
                    >
                      📱 {user.phone}
                    </p>

                    <p
                      style={{
                        margin: 0,
                        color: "#94a3b8",
                        wordBreak: "break-word",
                      }}
                    >
                      ✉️ {user.email || "No email"}
                    </p>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                      alignItems: "flex-end",
                    }}
                  >
                    <span
                      style={{
                        padding: "5px 9px",
                        borderRadius: "999px",
                        background:
                          user.role === "admin"
                            ? "#312e81"
                            : "#164e63",
                        fontSize: "12px",
                        fontWeight: 700,
                      }}
                    >
                      {user.role}
                    </span>

                    <span
                      style={{
                        padding: "5px 9px",
                        borderRadius: "999px",
                        background: user.active
                          ? "#14532d"
                          : "#7f1d1d",
                        fontSize: "12px",
                        fontWeight: 700,
                      }}
                    >
                      {user.active
                        ? "● Active"
                        : "● Inactive"}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    borderTop: "1px solid #1e293b",
                    marginTop: "16px",
                    paddingTop: "14px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <span
                    style={{
                      color: "#64748b",
                      fontSize: "12px",
                    }}
                  >
                    {user.createdAt
                      ? new Date(
                          user.createdAt
                        ).toLocaleDateString()
                      : "Date unavailable"}
                  </span>

                  <button
                    onClick={() => toggleUser(user)}
                    style={{
                      padding: "9px 12px",
                      borderRadius: "8px",
                      border: "1px solid #334155",
                      background: user.active
                        ? "#1e293b"
                        : "#14532d",
                      color: "#fff",
                      cursor: "pointer",
                      fontWeight: 700,
                    }}
                  >
                    {user.active
                      ? "⏸ Disable"
                      : "▶ Activate"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

