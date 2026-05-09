import G from "../constants/theme";

export default function BookCover({ url, title, color = G.muted, letterSize = 24 }) {
  if (url) return (
    <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      onError={e => { e.target.style.display = "none"; }} />
  );
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ fontSize: letterSize, fontFamily: "'Playfair Display', serif", color, opacity: 0.4 }}>
        {title?.[0] ?? "?"}
      </span>
    </div>
  );
}
