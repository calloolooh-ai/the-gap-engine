import React from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches render-time exceptions anywhere in the tree and shows a recoverable
 * fallback instead of unmounting the whole app to a blank white page.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Surface in the console for debugging; the UI shows the friendly fallback.
    console.error("Render error caught by ErrorBoundary:", error, info);
  }

  handleReset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <div style={styles.container}>
          <div style={styles.icon}>✗</div>
          <h2 style={styles.title}>Something went wrong</h2>
          <p style={styles.message}>{this.state.error.message}</p>
          <button style={styles.button} onClick={this.handleReset}>
            Dismiss and continue
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: "fixed",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    background: "#0f0f0f",
    color: "#e5e7eb",
    padding: 32,
    textAlign: "center",
    zIndex: 9999,
  },
  icon: { fontSize: 48, color: "#ef4444" },
  title: { fontSize: 20, fontWeight: 700, margin: 0, color: "#ef4444" },
  message: { fontSize: 14, color: "#9ca3af", maxWidth: 480, lineHeight: 1.6 },
  button: {
    marginTop: 8,
    padding: "9px 20px",
    background: "#f59e0b",
    color: "#0f0f0f",
    fontSize: 14,
    fontWeight: 700,
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
  },
};
