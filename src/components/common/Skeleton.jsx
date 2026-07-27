import "./skeleton.css";

export function Skeleton({ className = "", width, height, rounded = false }) {
  const style = {
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
  };

  return (
    <span
      className={`skeleton-block ${rounded ? "is-rounded" : ""} ${className}`.trim()}
      style={style}
      aria-hidden="true"
    />
  );
}

export function TableSkeleton({ rows = 5, columns = 6 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr className="skeleton-row" key={`skeleton-${rowIndex}`}>
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <td key={`${rowIndex}-${columnIndex}`}>
              <Skeleton
                width={columnIndex === 0 ? "78%" : `${52 + ((columnIndex + rowIndex) % 4) * 10}%`}
                height={columnIndex === 0 ? 22 : 18}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function MetricSkeleton({ count = 3 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <article className="metric-card skeleton-metric" key={`metric-skeleton-${index}`}>
          <Skeleton width={42} height={42} />
          <Skeleton width="52%" height={32} />
          <Skeleton width="70%" height={16} />
        </article>
      ))}
    </>
  );
}
