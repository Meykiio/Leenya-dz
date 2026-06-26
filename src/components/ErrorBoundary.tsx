import React from "react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (import.meta.env.DEV) console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)]">
          <div className="text-center space-y-4 max-w-md px-4">
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              Une erreur est survenue
            </h1>
            <p className="text-[var(--text-secondary)]">
              Quelque chose s'est mal passé. Veuillez réessayer.
            </p>
            {import.meta.env.DEV && this.state.error && (
              <pre className="text-sm text-red-500 bg-red-50 p-3 rounded-lg text-left overflow-auto max-h-32">
                {this.state.error.message}
              </pre>
            )}
            <Button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = "/";
              }}
            >
              Retour à l'accueil
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
