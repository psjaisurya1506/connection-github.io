import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { timeAgo } from "./ui";

export default function NotificationBell() {
  const { socket } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef();

  const load = useCallback(() => api.get("/notifications").then((r) => { setItems(r.data.notifications); setUnread(r.data.unread); }).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!socket) return;
    const onNotif = (n) => { setItems((l) => [n, ...l].slice(0, 30)); setUnread((u) => u + 1); toast(n.text, "info"); };
    socket.on("notification", onNotif);
    return () => socket.off("notification", onNotif);
  }, [socket, toast]);

  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && unread) {
      await api.patch("/notifications/read-all").catch(() => {});
      setUnread(0);
    }
  };

  return (
    <div className="bell-wrap" ref={ref}>
      <button className="icon-btn bell" onClick={toggle} aria-label="Notifications">🔔{unread > 0 && <span className="bell-dot">{unread > 9 ? "9+" : unread}</span>}</button>
      {open && (
        <div className="bell-menu card">
          <div className="bell-title">Notifications</div>
          {items.length === 0 && <div className="muted" style={{ padding: 16, fontSize: 13 }}>You're all caught up.</div>}
          {items.map((n) => (
            <button key={n._id} className={`bell-item ${n.read ? "" : "unread"}`} onClick={() => { setOpen(false); if (n.link) nav(n.link); }}>
              <span>{n.text}</span><small className="muted">{timeAgo(n.createdAt)}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
