import "./tooltip.css";

export default function Tooltip({ label, children, className = "" }) {
  if (!label) return children;

  return (
    <span className={`tooltip-wrap ${className}`.trim()} data-tooltip={label}>
      {children}
    </span>
  );
}
