import { useState, useEffect } from "react";
import G from "../constants/theme";
import { supabase } from "../lib/supabase";

export default function NewReleasesTab({ books, session }) {
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);

  useEffect(() => {
    fetchReleases();
  }, []);

  const fetchReleases = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("new_releases")
      .select("*")
      .gte("published_date", `${new Date().getFullYear() - 2}-01-01`)
      .order("published_date", { ascending: false })
      .limit(20);
    setReleases(data || []);
    setLoading(false);
  };

  const refresh = async () => {
    setRefreshing(true);
    try {
      await supabase.functions.invoke("check-releases");
      await fetchReleases();
      setLastChecked(new Date());
    } catch (e) {
      console.error("check-releases error:", e);
    } finally {
      setRefreshing(false);
    }
  };


  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ color: G.muted, fontSize: 13 }}>New books from authors in your library — checked weekly, or refresh manually.</div>
          {lastChecked && <div style={{ color: G.dimmed, fontSize: 11, marginTop: 3 }}>Last checked {lastChecked.toLocaleTimeString()}</div>}
        </div>
        {session && (
          <button
            onClick={refresh}
            disabled={refreshing}
            className="btn-gold"
            style={{ opacity: refreshing ? 0.6 : 1, cursor: refreshing ? "not-allowed" : "pointer" }}>
            {refreshing ? "Checking…" : "↺ Refresh"}
          </button>
        )}
      </div>

      {loading && (
        <div className="new-releases-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, padding: "16px 18px" }}>
              <div className="pulse" style={{ height: 12, width: "80%", background: G.border, borderRadius: 4, marginBottom: 8 }} />
              <div className="pulse" style={{ height: 10, width: "50%", background: G.dimmed, borderRadius: 4, marginBottom: 8 }} />
              <div className="pulse" style={{ height: 10, width: "90%", background: G.dimmed, borderRadius: 4 }} />
            </div>
          ))}
        </div>
      )}

      {!loading && releases.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 0", color: G.muted }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>⊛</div>
          <div style={{ fontSize: 13 }}>No new releases found yet.</div>
          <div style={{ fontSize: 12, color: G.dimmed, marginTop: 6 }}>Hit refresh to check for new books from your authors.</div>
        </div>
      )}

      {!loading && releases.length > 0 && (() => {
        const readTitles = new Set(books.map(b => b.title?.toLowerCase().trim()));
        const unread = releases.filter(r => !readTitles.has(r.title?.toLowerCase().trim()));
        if (unread.length === 0) return (
          <div style={{ textAlign: "center", padding: "60px 0", color: G.muted }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>⊛</div>
            <div style={{ fontSize: 13 }}>You've already read all the new releases!</div>
            <div style={{ fontSize: 12, color: G.dimmed, marginTop: 6 }}>Check back after your next book drops.</div>
          </div>
        );
        return (
        <div className="new-releases-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {unread.map(r => (
            <div key={r.id} style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: G.text, lineHeight: 1.4 }}>{r.title}</div>
              <div style={{ fontSize: 11, color: G.gold }}>{r.author}</div>
              {r.series && <div style={{ fontSize: 10, color: G.muted }}>Series: {r.series}</div>}
              {r.published_date && <div style={{ fontSize: 10, color: G.dimmed }}>{r.published_date}</div>}
              {r.description && (
                <div style={{ fontSize: 11, color: G.muted, lineHeight: 1.6, marginTop: 6 }}>
                  {r.description.length > 160 ? r.description.slice(0, 160) + "…" : r.description}
                </div>
              )}
            </div>
          ))}
        </div>
        );
      })()}
    </div>
  );
}
