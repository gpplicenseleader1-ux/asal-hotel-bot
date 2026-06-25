import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: '#FAF6F0',
          textAlign: 'center',
          fontFamily: 'sans-serif',
        }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>⚠️</p>
          <p style={{ fontSize: 18, fontWeight: 600, color: '#2B2420', marginBottom: 8 }}>
            Что-то пошло не так
          </p>
          <p style={{ fontSize: 13, color: '#786450', marginBottom: 24, maxWidth: 320 }}>
            {this.state.error.message}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#C56B4A',
              color: '#fff',
              border: 'none',
              borderRadius: 14,
              padding: '12px 28px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Перезагрузить
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
