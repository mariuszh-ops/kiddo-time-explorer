import { Component, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallbackLevel?: "page" | "section";
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const isPage = this.props.fallbackLevel !== "section";

    if (!isPage) {
      return (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <AlertTriangle className="w-8 h-8 text-destructive mb-3" />
          <p className="text-sm text-muted-foreground mb-4">
            Nie udało się załadować tej sekcji.
          </p>
          <Button variant="outline" size="sm" onClick={this.handleReset}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Spróbuj ponownie
          </Button>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-serif font-bold text-foreground">
            Coś poszło nie tak
          </h1>
          <p className="text-muted-foreground">
            Przepraszamy — wystąpił nieoczekiwany błąd. Spróbuj odświeżyć stronę lub wróć na stronę główną.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => window.location.reload()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Odśwież stronę
            </Button>
            <Button variant="outline" asChild>
              <Link to="/">
                <Home className="w-4 h-4 mr-2" />
                Strona główna
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
