import { Component, type ErrorInfo, type ReactNode } from "react";

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  error: Error | null;
};

// The 3D stage (ProxyScene, running on react-three-fiber/Three.js) can throw
// during render for reasons unrelated to app logic - a texture failing to
// decode, a lost WebGL context, a Three.js internal error. React error
// boundaries only work as class components (there's no hook equivalent), and
// without one any such throw unmounts the entire studio to a blank screen,
// taking the rig data, timeline, and save button down with it. Scoping the
// boundary to just the stage keeps the rest of the studio usable when only
// the viewport fails.
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Puppet studio: the 3D stage crashed.", error, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div className="stage-error">
          <strong>3D preview failed to render</strong>
          <p>Your rig and timeline are safe. Retry the viewport, or switch to another desk while you sort this out.</p>
          <button className="coral-button" onClick={this.handleRetry}>Retry preview</button>
        </div>
      );
    }
    return this.props.children;
  }
}
