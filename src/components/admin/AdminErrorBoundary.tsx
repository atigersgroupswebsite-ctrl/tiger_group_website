// ==============================================================================
// File: src/components/admin/AdminErrorBoundary.tsx
// Description: Robust Error Boundary for A TIGER GLOBAL Admin Panel
// Features:
//   - Traps unhandled component render errors to prevent white-screen crashes
//   - Preserves Admin Shell & Navigation layout
//   - Displays descriptive diagnostics without masking underlying issues
//   - Provides multiple recovery paths (Try Again, Reload, Navigate to Dashboard / Joining)
// ==============================================================================

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home, FileCheck2, ChevronDown, ChevronRight } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class AdminErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[AdminErrorBoundary] Caught unhandled rendering error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, showDetails } = this.state;
      const title = this.props.fallbackTitle || 'A Component Error Occurred';

      return (
        <div
          style={{
            maxWidth: '900px',
            margin: '2rem auto',
            padding: '2rem',
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1.5px solid #FECACA',
            boxShadow: '0 10px 25px -5px rgba(239, 68, 68, 0.1)',
            fontFamily: 'Inter, system-ui, sans-serif'
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.25rem' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '10px',
                backgroundColor: '#FEE2E2',
                border: '1px solid #FCA5A5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <AlertCircle size={26} style={{ color: '#DC2626' }} />
            </div>
            <div>
              <h2 style={{ margin: '0 0 0.35rem 0', fontSize: '1.25rem', fontWeight: 800, color: '#0F1B38' }}>
                {title}
              </h2>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#475569', lineHeight: 1.5 }}>
                An unexpected runtime error occurred within this section. The application layout has been preserved so you can recover safely without losing access to the Admin Panel.
              </p>
            </div>
          </div>

          {/* Error Message Box */}
          <div
            style={{
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1.5rem',
              color: '#991B1B',
              fontSize: '0.85rem'
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>
              Error Details:
            </div>
            <code style={{ fontFamily: 'monospace', wordBreak: 'break-all', display: 'block', color: '#B91C1C' }}>
              {error?.toString() || 'Unknown runtime error'}
            </code>
          </div>

          {/* Recovery Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            <button
              type="button"
              onClick={this.handleReset}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.6rem 1.15rem',
                backgroundColor: '#0F1B38',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={15} />
              <span>Try Again</span>
            </button>

            <button
              type="button"
              onClick={this.handleReload}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.6rem 1.15rem',
                backgroundColor: '#F1F5F9',
                color: '#334155',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <span>Reload Entire Page</span>
            </button>

            <a
              href="/admin/joining"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.6rem 1.15rem',
                backgroundColor: '#FFFFFF',
                color: '#0F1B38',
                border: '1px solid #0F1B38',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: 700,
                textDecoration: 'none'
              }}
            >
              <FileCheck2 size={15} />
              <span>Go to Joining Submissions</span>
            </a>

            <a
              href="/admin"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.6rem 1.15rem',
                backgroundColor: '#FFFFFF',
                color: '#64748B',
                border: '1px solid #E2E8F0',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: 600,
                textDecoration: 'none'
              }}
            >
              <Home size={15} />
              <span>Admin Dashboard</span>
            </a>
          </div>

          {/* Technical Diagnostics (Collapsible) */}
          <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '1rem' }}>
            <button
              type="button"
              onClick={() => this.setState({ showDetails: !showDetails })}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748B',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: 0
              }}
            >
              {showDetails ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <span>{showDetails ? 'Hide' : 'Show'} Technical Stack Trace</span>
            </button>

            {showDetails && (
              <div style={{ marginTop: '0.75rem' }}>
                <pre
                  style={{
                    backgroundColor: '#1E293B',
                    color: '#F8FAFC',
                    padding: '1rem',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    overflowX: 'auto',
                    maxHeight: '260px',
                    lineHeight: 1.45,
                    margin: 0
                  }}
                >
                  {error?.stack}
                  {errorInfo?.componentStack}
                </pre>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
