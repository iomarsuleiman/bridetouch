import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode; resetKey?: unknown };
type State = { error: Error | null };

/** Catches render errors (including failed Convex queries) so a customer sees a
 *  friendly page with a way back instead of a blank screen. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled UI error", error, info.componentStack);
  }

  componentDidUpdate(prev: Props) {
    // Navigating elsewhere gives the new page a fresh chance to render.
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    const offline = typeof navigator !== "undefined" && navigator.onLine === false;
    return (
      <StatusPage
        code={offline ? "Offline" : "Oops"}
        title={offline ? "You're offline." : "Something went wrong."}
        message={
          offline
            ? "Check your connection and try again. Your bag is saved on this device."
            : "We couldn't load this page. Please try again. Your bag is safe."
        }
        actions={
          <>
            <button type="button" className="btn primary" onClick={() => location.reload()}>
              Try again
            </button>
            <a className="btn secondary" href="/">
              Back to the shop
            </a>
          </>
        }
      />
    );
  }
}

export function StatusPage({
  code,
  title,
  message,
  actions,
}: {
  code: string;
  title: string;
  message: string;
  actions?: ReactNode;
}) {
  return (
    <section className="status-page" role="alert" aria-live="polite">
      <div className="status-orb" aria-hidden="true">
        <span>{code}</span>
      </div>
      <h1>{title}</h1>
      <p>{message}</p>
      {actions ? <div className="status-actions">{actions}</div> : null}
    </section>
  );
}
