import { useEffect } from "react";

export const initials = (name = "") => name.split(" ").filter(Boolean).slice(0, 2).map((s) => s[0]).join("").toUpperCase() || "?";

export function Avatar({ name, size = 42 }) {
  return <div className="avatar" style={{ width: size, height: size, flexBasis: size, fontSize: size * 0.36 }}>{initials(name)}</div>;
}

export function Loading({ full }) {
  return <div className={full ? "loading-full" : "loading-inline"}><span className="spinner" /> Loading…</div>;
}

export function ErrorBox({ children, onRetry }) {
  if (!children) return null;
  return <div className="error">{children}{onRetry && <button className="link-btn" onClick={onRetry}>Retry</button>}</div>;
}

export function Empty({ icon = "◌", title, text, children }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <strong>{title}</strong>
      {text && <p className="muted">{text}</p>}
      {children}
    </div>
  );
}

const STATUS_STYLE = {
  pending: "amber", accepted: "green", confirmed: "green", completed: "blue", rejected: "red", cancelled: "gray",
  verified: "green", unverified: "amber", inactive: "gray", active: "green",
};
export function Status({ value, label }) {
  return <span className={`status status-${STATUS_STYLE[value] || "blue"}`}>{label || value}</span>;
}

export function Modal({ title, onClose, children, footer }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal card" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head"><h3>{title}</h3><button className="icon-btn" onClick={onClose} aria-label="Close">✕</button></div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, children, hint }) {
  return <div className="field"><label className="label">{label}</label>{children}{hint && <div className="muted hint">{hint}</div>}</div>;
}

export function Pagination({ page, pages, onPage }) {
  if (!pages || pages <= 1) return null;
  return (
    <div className="pagination">
      <button className="btn btn-secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>← Prev</button>
      <span className="muted">Page {page} of {pages}</span>
      <button className="btn btn-secondary" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next →</button>
    </div>
  );
}

export const fmtDate = (d) => new Date(d).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
export const fmtDay = (d) => new Date(d).toLocaleDateString([], { dateStyle: "medium" });
export const timeAgo = (d) => {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};
