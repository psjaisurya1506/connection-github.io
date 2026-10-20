export function StatGrid({ items, loading }) {
  const list = items || [["…", ""], ["…", ""], ["…", ""], ["…", ""]];
  return (
    <div className="stats-grid">
      {list.map(([label, value], i) => (
        <div className="card stat-card" key={i}>
          <div className="stat-label">{loading ? "Loading" : label}</div>
          <div className="stat-value">{loading ? "–" : value}</div>
        </div>
      ))}
    </div>
  );
}
