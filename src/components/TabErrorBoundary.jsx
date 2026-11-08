import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export class TabErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('TabErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          backgroundColor: '#211F38',
          borderRadius: '24px',
          padding: '40px 24px',
          color: '#F8FAFC',
          textAlign: 'center',
          boxShadow: '0 16px 40px rgba(33, 31, 56, 0.22)',
          margin: '16px 0'
        }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '50%',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            color: '#EF4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <AlertCircle size={28} />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px', color: '#FFFFFF' }}>
            Não foi possível carregar este módulo
          </h3>
          <p style={{ fontSize: '13px', color: '#94A3B8', maxWidth: '420px', margin: '0 auto 20px', lineHeight: 1.5 }}>
            Ocorreu uma instabilidade pontual ao processar os dados deste módulo. Você pode tentar recarregar ou navegar para outra aba.
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            style={{
              padding: '10px 20px',
              borderRadius: '12px',
              backgroundColor: '#4F46E5',
              color: '#FFFFFF',
              border: 'none',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <RefreshCw size={15} />
            <span>Tentar Novamente</span>
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

