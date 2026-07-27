import "./loader.css";

const Loader = ({ mode = "screen", label = "Loading" }) => {
  return (
    <div className={`loader-overlay ${mode === "panel" ? "panel" : ""}`} aria-live="polite" aria-busy="true">
      <div className="loader-skeleton" aria-label={label} role="status">
        <span className="loader-kicker" />
        <span className="loader-title" />
        <span className="loader-line" />
        <span className="loader-line short" />
        <div className="loader-grid">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
};

export default Loader;
