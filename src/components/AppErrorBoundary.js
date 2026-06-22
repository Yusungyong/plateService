import React from "react";

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="app-error-boundary">
        <section className="app-error-boundary__card" role="alert">
          <span className="app-error-boundary__eyebrow">PLATE SERVICE</span>
          <h1>화면을 표시하는 중 문제가 발생했습니다.</h1>
          <p>입력하던 내용은 유지되지 않을 수 있습니다. 새로고침 후 다시 시도해 주세요.</p>
          <div className="app-error-boundary__actions">
            <button type="button" onClick={this.handleReload}>
              새로고침
            </button>
            <a href="/">처음으로</a>
          </div>
        </section>
      </main>
    );
  }
}

export default AppErrorBoundary;
