import React from 'react';

interface State { hasError: boolean; message: string }

/**
 * Catches React rendering errors anywhere below it, shows a friendly message
 * instead of a frozen/white screen, and logs the error (which the main process
 * captures into the log file via console forwarding).
 */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message || 'Unknown error' };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // This console.error is forwarded to the main-process log file
    console.error('[ErrorBoundary] ' + (error?.stack || error?.message) + ' | ' + info?.componentStack);
  }

  reset = () => this.setState({ hasError: false, message: '' });

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-xl mx-auto">
          <div className="card p-6 border-danger/30">
            <h2 className="text-lg font-semibold text-danger mb-2">Something went wrong on this screen</h2>
            <p className="text-[13px] text-text-secondary dark:text-text-secondary-dark mb-3">
              The app caught an error and stopped this screen from freezing. Your saved data is safe. You can go back and try again. If this keeps happening, open Settings and use "Open logs folder" to find the details, and share them so it can be fixed.
            </p>
            <p className="text-[11px] font-mono text-text-tertiary mb-4 break-words">{this.state.message}</p>
            <button onClick={this.reset} className="btn-primary">Try again</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
