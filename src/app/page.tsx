"use client";

import { useState, useRef, useEffect } from "react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  resourceLinks?: Array<{ id: string; title: string; url: string }>;
};

export default function ChatPage() {
  const [conversationId, setConversationId] = useState<string>("");
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<"collect" | "chat">("collect");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleStartChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim() || !studentEmail.trim()) return;

    // Create conversation
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentName, studentEmail }),
    });

    const { id } = await res.json();
    setConversationId(id);
    setPhase("chat");
    setMessages([
      {
        id: "greeting",
        role: "assistant",
        content: `Hi ${studentName}, I'm the welfare assistant. I'm here to help with questions about finance, housing, visas, academics, wellbeing, and more. What can I help you with today?`,
      },
    ]);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          message: input,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const {
        response,
        resourceLinks,
        escalated,
        escalationReason,
        followUpQuestion,
      } = await res.json();

      let assistantContent = response;
      if (escalated && escalationReason) {
        assistantContent += `\n\n**${escalationReason}**`;
      }
      if (escalated) {
        assistantContent +=
          "\n\nA team member will get back to you shortly. If you're in crisis, please call the Samaritans on 116 123 (24/7) or 999 for immediate danger.";
      }

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: assistantContent,
        resourceLinks,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content:
            "Something went wrong. Please try again or contact support.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (phase === "collect") {
    return (
      <div style={{ maxWidth: 500, margin: "0 auto", padding: 20 }}>
        <h1>Welcome to Welfare Support</h1>
        <p>Let's get started. Please tell us a bit about yourself.</p>
        <form onSubmit={handleStartChat}>
          <div style={{ marginBottom: 15 }}>
            <label>
              Name:
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                required
                style={{
                  display: "block",
                  width: "100%",
                  padding: 8,
                  marginTop: 5,
                }}
              />
            </label>
          </div>
          <div style={{ marginBottom: 15 }}>
            <label>
              Email:
              <input
                type="email"
                value={studentEmail}
                onChange={(e) => setStudentEmail(e.target.value)}
                required
                style={{
                  display: "block",
                  width: "100%",
                  padding: 8,
                  marginTop: 5,
                }}
              />
            </label>
          </div>
          <button type="submit" style={{ padding: "10px 20px" }}>
            Start Chat
          </button>
        </form>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        maxWidth: 700,
        margin: "0 auto",
      }}
    >
      <div style={{ padding: 20, borderBottom: "1px solid #ccc" }}>
        <h1>Welfare Support Chat</h1>
        <p style={{ margin: 0, fontSize: 14, color: "#666" }}>
          Chatting as {studentName}
        </p>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 15,
        }}
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              textAlign: msg.role === "user" ? "right" : "left",
              display: "flex",
              justifyContent:
                msg.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            <div
              style={{
                maxWidth: "70%",
                padding: 12,
                borderRadius: 8,
                backgroundColor:
                  msg.role === "user" ? "#007bff" : "#f0f0f0",
                color: msg.role === "user" ? "white" : "black",
              }}
            >
              <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                {msg.content}
              </p>
              {msg.resourceLinks && msg.resourceLinks.length > 0 && (
                <div style={{ marginTop: 10, fontSize: 12 }}>
                  <strong>Resources:</strong>
                  {msg.resourceLinks.map((link) => (
                    <div key={link.id}>
                      <a href={link.url} target="_blank" rel="noopener">
                        {link.title}
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ textAlign: "center", color: "#999" }}>
            <p>Thinking...</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={handleSendMessage}
        style={{
          display: "flex",
          gap: 10,
          padding: 20,
          borderTop: "1px solid #ccc",
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          disabled={loading}
          style={{
            flex: 1,
            padding: 10,
            borderRadius: 4,
            border: "1px solid #ccc",
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "10px 20px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          Send
        </button>
      </form>
    </div>
  );
}
