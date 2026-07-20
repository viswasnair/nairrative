import { Component } from "react";
import G from "../constants/theme";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Tab render error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 48, textAlign: "center", color: G.muted }}>
          <div style={{ fontSize: 20, marginBottom: 12, color: G.text }}>Something went wrong</div>
          <div style={{ fontSize: 13 }}>Refresh the page to continue.</div>
          <button
            onClick={() => this.setState({ error: null })}
            style={{ marginTop: 20, background: "none", border: `1px solid ${G.border}`, borderRadius: 8, padding: "6px 16px", color: G.muted, cursor: "pointer", fontSize: 12 }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
