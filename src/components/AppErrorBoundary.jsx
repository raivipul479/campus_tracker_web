import React from 'react';

export class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Admin app crashed:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <main className="app-crash">
          <section>
            <h1>Admin app crashed</h1>
            <p>{this.state.error.message || 'A browser runtime error stopped the page from rendering.'}</p>
            <button type="button" onClick={() => window.location.reload()}>Reload</button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
