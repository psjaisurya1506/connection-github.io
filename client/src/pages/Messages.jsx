import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import api, { errMsg } from "../api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Avatar, Empty, Loading, timeAgo } from "../components/ui";

export default function Messages() {
  const { user, socket } = useAuth();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [convos, setConvos] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [thread, setThread] = useState({ id: null, msgs: [] });
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const [online, setOnline] = useState(new Set());
  const active = params.get("with");
  const bottom = useRef();
  const activeRef = useRef(active);
  useEffect(() => { activeRef.current = active; }, [active]);
  const msgs = useMemo(() => (thread.id === active ? thread.msgs : []), [thread, active]);
  const setMsgs = useCallback((fn) => setThread((t) => ({ ...t, msgs: typeof fn === "function" ? fn(t.msgs) : fn })), []);

  const loadLists = useCallback(() =>
    Promise.all([api.get("/messages/conversations"), api.get("/messages/contacts")])
      .then(([c, k]) => { setConvos(c.data.conversations); setContacts(k.data.contacts); })
      .catch((e) => toast(errMsg(e), "error"))
      .finally(() => setLoading(false)), [toast]);
  useEffect(() => { loadLists(); }, [loadLists]);

  // Everyone I can talk to, with last message + unread if any
  const people = useMemo(() => {
    const map = new Map(contacts.map((c) => [String(c._id), { user: { ...c, id: c._id }, lastMessage: null, unread: 0 }]));
    convos.forEach((c) => map.set(String(c.userId), c));
    return [...map.values()].sort((a, b) => new Date(b.lastMessage?.createdAt || 0) - new Date(a.lastMessage?.createdAt || 0));
  }, [contacts, convos]);
  const current = people.find((p) => String(p.user.id) === active)?.user;

  // Load thread when a conversation is opened
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    api.get(`/messages/${active}`).then((r) => {
      if (cancelled) return;
      setThread({ id: active, msgs: r.data.messages });
      setConvos((l) => l.map((c) => (String(c.userId) === active ? { ...c, unread: 0 } : c)));
    }).catch((e) => toast(errMsg(e), "error"));
    return () => { cancelled = true; };
  }, [active, toast]);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, typing]);

  // Live events
  useEffect(() => {
    if (!socket) return;
    const onMsg = (m) => {
      if (String(m.sender) === activeRef.current) {
        setMsgs((l) => (l.some((x) => x._id === m._id) ? l : [...l, m]));
        setTyping(false);
        // opening the thread marks it read on the server; refresh the list afterwards
        api.get(`/messages/${m.sender}`).catch(() => {}).finally(loadLists);
        return;
      }
      loadLists();
    };
    const onTyping = ({ from }) => {
      if (from === activeRef.current) { setTyping(true); clearTimeout(onTyping.t); onTyping.t = setTimeout(() => setTyping(false), 1800); }
    };
    const onPresence = ({ userId, online: on }) => setOnline((s) => { const n = new Set(s); on ? n.add(userId) : n.delete(userId); return n; });
    const onList = (ids) => setOnline(new Set(ids));
    socket.on("message", onMsg); socket.on("typing", onTyping); socket.on("presence", onPresence); socket.on("presence:list", onList);
    return () => { socket.off("message", onMsg); socket.off("typing", onTyping); socket.off("presence", onPresence); socket.off("presence:list", onList); };
  }, [socket, loadLists, setMsgs]);

  const send = async (e) => {
    e.preventDefault();
    const t = text.trim();
    if (!t || !active) return;
    setText("");
    try {
      const { data } = await api.post(`/messages/${active}`, { text: t });
      setMsgs((l) => [...l, data.message]);
      loadLists();
    } catch (x) { setText(t); toast(errMsg(x), "error"); }
  };

  const onType = (e) => { setText(e.target.value); socket?.emit("typing", { to: active }); };

  return <DashboardLayout role={user.role} title="Messages" subtitle="Chat in real time with the people you're connected to.">
    {loading ? <Loading /> : people.length === 0 ? (
      <Empty icon="◌" title="No conversations yet" text={user.role === "student" ? "Once a mentor accepts your request, you can chat here." : "Once you accept a student or peer mentorship request, you can chat here."} />
    ) : (
      <div className="chat card">
        <div className={`chat-list ${active ? "hide-mobile" : ""}`}>
          {people.map((p) => (
            <button key={p.user.id} className={`chat-person ${String(p.user.id) === active ? "active" : ""}`} onClick={() => setParams({ with: p.user.id })}>
              <div className="avatar-wrap"><Avatar name={p.user.name} />{online.has(String(p.user.id)) && <i className="online-dot" />}</div>
              <div className="grow"><strong>{p.user.name}</strong><div className="muted ellipsis">{p.lastMessage ? p.lastMessage.text : "Start the conversation"}</div></div>
              {p.unread > 0 && <span className="bell-dot static">{p.unread}</span>}
            </button>
          ))}
        </div>
        <div className={`chat-pane ${!active ? "hide-mobile" : ""}`}>
          {!active || !current ? <Empty icon="◌" title="Select a conversation" /> : <>
            <div className="chat-head">
              <button className="icon-btn show-mobile" onClick={() => setParams({})} aria-label="Back">←</button>
              <Avatar name={current.name} size={38} />
              <div><strong>{current.name}</strong><div className="muted" style={{ fontSize: 11 }}>{typing ? "typing…" : online.has(String(current.id)) ? "● Online" : current.headline || current.role}</div></div>
            </div>
            <div className="chat-body">
              {msgs.length === 0 && <div className="muted text-center" style={{ marginTop: 30, fontSize: 13 }}>Say hello 👋</div>}
              {msgs.map((m) => {
                const mine = String(m.sender) === String(user.id);
                return <div key={m._id} className={`bubble ${mine ? "mine" : ""}`}>{m.text}<small>{timeAgo(m.createdAt)}</small></div>;
              })}
              <div ref={bottom} />
            </div>
            <form className="chat-input" onSubmit={send}>
              <input className="input" placeholder="Type a message…" value={text} onChange={onType} maxLength={2000} />
              <button className="btn btn-primary" type="submit" disabled={!text.trim()}>Send</button>
            </form>
          </>}
        </div>
      </div>
    )}
  </DashboardLayout>;
}
