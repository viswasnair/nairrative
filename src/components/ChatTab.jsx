import G from "../constants/theme";

export default function ChatTab({ session, messages, chatLoading, chatInput, setChatInput, chatEndRef, sendChat }) {
  if (!session) return (
    <div style={{ textAlign: "center", padding: "60px 20px", color: G.muted }}>
      <div style={{ fontSize: 32, marginBottom: 16 }}>◈</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: G.text, marginBottom: 8 }}>Sign in to use AI Chat</div>
      <div style={{ fontSize: 13 }}>This feature is only available to the library owner.</div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 200px)" }}>
      <div style={{ color: G.muted, fontSize: 12, marginBottom: 16, textAlign: "center" }}>Ask anything — patterns, recommendations, deep dives, what you've forgotten you read…</div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14, paddingBottom: 12 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{
              maxWidth: "82%", padding: "12px 16px", borderRadius: m.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
              background: m.role === "user" ? `${G.gold}18` : G.card2,
              border: `1px solid ${m.role === "user" ? G.goldDim : G.border}`,
              color: G.text, fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap"
            }}>
              {m.role === "assistant" && <div style={{ color: G.gold, fontSize: 10, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 6 }}>◈ Reading AI</div>}
              {m.content}
            </div>
          </div>
        ))}
        {chatLoading && (
          <div style={{ display: "flex" }}>
            <div style={{ padding: "12px 16px", background: G.card2, border: `1px solid ${G.border}`, borderRadius: "12px 12px 12px 2px" }}>
              <div className="pulse" style={{ color: G.gold, fontSize: 13 }}>Thinking…</div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="chat-input-wrap" style={{ borderTop: `1px solid ${G.border}`, paddingTop: 14 }}>
        <input className="input-dark" placeholder="Ask about your reading history, patterns, recommendations…"
          value={chatInput} onChange={e => setChatInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendChat()} />
        <button className="btn-gold" onClick={sendChat} disabled={chatLoading} style={{ whiteSpace: "nowrap" }}>Send</button>
      </div>

      {/* Suggestion chips */}
      {messages.length === 1 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          {["What were my peak reading years?", "Which authors have I read the most?", "Analyze my genre evolution", "What's my fiction vs non-fiction ratio?", "What books did I read in 2021?", "Suggest what to read next"].map(s => (
            <button key={s} className="btn-ghost" style={{ fontSize: 11 }} onClick={() => { setChatInput(s); }}>
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
