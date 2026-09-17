"use client";

import { useState, useEffect } from "react";

type Conversation = {
  id: string;
  studentName: string;
  studentEmail: string;
  status: string;
  priority: string;
  category: string | null;
  escalationReason: string | null;
  safeguarding: boolean;
  messages: Array<{
    id: string;
    role: string;
    content: string;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
};

export default function StaffDashboard() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchConversations = async () => {
    try {
      const res = await fetch("/api/conversations");
      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }
      const data = await res.json();
      setConversations(Array.isArray(data) ? data : []);
      setLoading(false);
      setError("");
    } catch (err) {
      console.error("Fetch error:", err);
      setError(err instanceof Error ? err.message : "Failed to load conversations");
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error(`Failed to update: ${res.status}`);
      fetchConversations();
    } catch (err) {
      console.error("Update error:", err);
      alert("Failed to update case");
    }
  };

  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const filtered = conversations
    .filter(
      (c) =>
        filterStatus === "all" ||
        c.status === filterStatus ||
        (filterStatus === "urgent" && (c.priority === "critical" || c.priority === "high"))
    )
    .sort((a, b) => {
      if (a.safeguarding && !b.safeguarding) return -1;
      if (!a.safeguarding && b.safeguarding) return 1;
      return (priorityOrder[a.priority as keyof typeof priorityOrder] || 3) - 
             (priorityOrder[b.priority as keyof typeof priorityOrder] || 3);
    });

  const selected = conversations.find((c) => c.id === selectedId);
  const latestMessage = selected?.messages[selected.messages.length - 1];

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;
  if (error) return <div style={{ padding: 20, color: "red" }}>Error: {error}</div>;

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <div style={{ width: "40%", borderRight: "1px solid #ccc", overflowY: "auto", padding: 20 }}>
        <h1>Cases</h1>
        <div style={{ marginBottom: 20 }}>
          <label>
            Filter:{" "}
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="all">All</option>
              <option value="urgent">Urgent</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
          </label>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((conv) => (
            <div
              key={conv.id}
              onClick={() => setSelectedId(conv.id)}
              style={{
                padding: 12,
                border: selectedId === conv.id ? "2px solid #007bff" : "1px solid #ccc",
                borderRadius: 4,
                cursor: "pointer",
                backgroundColor: selectedId === conv.id ? "#e7f3ff" : "#f9f9f9",
              }}
            >
              <div style={{ fontWeight: "bold" }}>
                {conv.safeguarding && "🚨 "}
                {conv.studentName}
              </div>
              <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                {conv.category} • {conv.priority.toUpperCase()} • {conv.status}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ width: "60%", padding: 20, overflowY: "auto" }}>
        {selected ? (
          <>
            <h2>{selected.studentName}</h2>
            <div style={{ marginBottom: 20, fontSize: 14, color: "#666" }}>
              <p>Email: {selected.studentEmail}</p>
              <p>Status: {selected.status}</p>
              <p>Priority: {selected.priority}</p>
              {selected.safeguarding && <p style={{ color: "red", fontWeight: "bold" }}>⚠️ Safeguarding</p>}
            </div>

            <div style={{ backgroundColor: "#f9f9f9", padding: 15, borderRadius: 4, marginBottom: 20, maxHeight: 400, overflowY: "auto" }}>
              {selected.messages.map((msg) => (
                <div key={msg.id} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid #eee" }}>
                  <strong>{msg.role === "user" ? selected.studentName : "Assistant"}</strong>
                  <p style={{ margin: "5px 0 0 0", whiteSpace: "pre-wrap" }}>{msg.content}</p>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => updateStatus(selected.id, "in_progress")} style={{ padding: "10px 15px", backgroundColor: "#ffc107", border: "none", borderRadius: 4, cursor: "pointer" }}>
                Assign
              </button>
              <button onClick={() => updateStatus(selected.id, "resolved")} style={{ padding: "10px 15px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: 4, cursor: "pointer" }}>
                Resolved
              </button>
            </div>
          </>
        ) : (
          <p style={{ color: "#999" }}>Select a case</p>
        )}
      </div>
    </div>
  );
}
