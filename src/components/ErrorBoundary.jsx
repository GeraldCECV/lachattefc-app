import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary a intercepté une erreur:', error, info)
  }

  handleReload = () => {
    this.setState({ hasError: false })
    if (this.props.onReset) this.props.onReset()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          height: '100%', minHeight: 300, padding: 32, textAlign: 'center', gap: 12,
        }}>
          <div style={{ fontSize: 40 }}>😿</div>
          <div style={{ fontFamily: 'var(--D)', fontSize: 18, color: 'var(--tx)', letterSpacing: '.02em' }}>
            Oups, un problème est survenu
          </div>
          <div style={{ fontSize: 13, color: 'var(--tx3)', maxWidth: 320, lineHeight: 1.5 }}>
            Cette page a rencontré une erreur inattendue. Réessaie, ou change d'onglet.
          </div>
          <button className="btn btn-primary" onClick={this.handleReload} style={{ marginTop: 8 }}>
            🔄 Réessayer
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
