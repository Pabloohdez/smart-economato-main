import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

type Props = {
  children: ReactNode;
  resetKey?: string;
};

type State = {
  hasError: boolean;
  errorMessage: string;
};

export default class RouteErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    errorMessage: "",
  };

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      errorMessage: error instanceof Error ? error.message : "Se ha producido un error inesperado al cargar la página.",
    };
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    console.error("[RouteErrorBoundary] Error renderizando ruta", error, errorInfo);
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false, errorMessage: "" });
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, errorMessage: "" });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[320px] items-center justify-center px-4 py-10">
          <div className="w-full max-w-[640px] rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h2 className="m-0 text-[22px] font-bold text-gray-900">Error al cargar la página</h2>
            <p className="mt-3 text-sm leading-6 text-gray-600">
              Esta sección ha fallado durante el renderizado. Puedes reintentar la carga sin abandonar la aplicación.
            </p>
            {this.state.errorMessage ? (
              <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-left text-sm text-red-700">
                {this.state.errorMessage}
              </div>
            ) : null}
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                className="inline-flex min-h-[42px] items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
                onClick={this.handleRetry}
              >
                <RotateCcw className="h-4 w-4" />
                Reintentar carga
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}