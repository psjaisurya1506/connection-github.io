import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import useFetch from "../hooks/useFetch";
import api, { errMsg } from "../api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Empty, ErrorBox, Field, Loading, Modal, Status, fmtDate } from "../components/ui";
import Button from "../components/Button";

const BLANK = { requestId: "", title: "", scheduledAt: "", durationMins: 30, meetingLink: "", notes: "" };

export default function Sessions() {
  const { user } = useAuth();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const isMentor = user.role === "alumni";
  const sessions = useFetch("/sessions");
  const accepted = useFetch("/requests", { status: "accepted" });
  // Deep link from the Requests page: /…/sessions?request=<id>
  const [open, setOpen] = useState(() => !!params.get("request"));
  const [form, setForm] = useState(() => ({ ...BLANK, requestId: params.get("request") || "" }));
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const close = () => { setOpen(false); if (params.get("request")) setParams({}, { replace: true }); };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      await api.post("/sessions", { ...form, scheduledAt: new Date(form.scheduledAt).toISOString() });
      toast("Session proposed. The other person will be asked to confirm.");
      close(); setForm(BLANK); sessions.reload();
    } catch (x) { setErr(errMsg(x)); } finally { setBusy(false); }
  };
  const setStatus = async (id, status) => {
    try { await api.patch(`/sessions/${id}/status`, { status }); toast(`Session ${status}`); sessions.reload(); }
    catch (x) { toast(errMsg(x), "error"); }
  };

  const list = sessions.data?.sessions || [];
  const now = new Date();
  const upcoming = list.filter((s) => ["pending", "confirmed"].includes(s.status) && new Date(s.scheduledAt) >= now);
  const past = list.filter((s) => !upcoming.includes(s)).reverse();

  const Row = ({ s }) => {
    const other = isMentor ? s.student : s.mentor;
    const proposedByMe = String(s.proposedBy?._id) === String(user.id);
    return (
      <div className="card card-pad session-card">
        <div className="date-box"><b>{new Date(s.scheduledAt).getDate()}</b><span>{new Date(s.scheduledAt).toLocaleString([], { month: "short" })}</span></div>
        <div className="grow">
          <div className="row-between"><strong>{s.title}</strong><Status value={s.status} /></div>
          <div className="muted" style={{ fontSize: 12 }}>{fmtDate(s.scheduledAt)} · {s.durationMins} min · with {other?.name}</div>
          {s.notes && <p className="muted" style={{ fontSize: 13, margin: "6px 0 0" }}>{s.notes}</p>}
          <div className="btn-row">
            {s.meetingLink && s.status !== "cancelled" && <a className="btn btn-secondary" href={s.meetingLink} target="_blank" rel="noopener noreferrer">Join meeting</a>}
            {s.status === "pending" && !proposedByMe && <Button onClick={() => setStatus(s._id, "confirmed")}>Confirm</Button>}
            {s.status === "pending" && proposedByMe && <span className="muted" style={{ fontSize: 12, alignSelf: "center" }}>Waiting for {other?.name} to confirm</span>}
            {s.status === "confirmed" && isMentor && <Button variant="secondary" onClick={() => setStatus(s._id, "completed")}>Mark completed</Button>}
            {["pending", "confirmed"].includes(s.status) && <Button variant="ghost" onClick={() => window.confirm("Cancel this session?") && setStatus(s._id, "cancelled")}>Cancel</Button>}
          </div>
        </div>
      </div>
    );
  };

  return <DashboardLayout role={user.role} title="Sessions" subtitle="Schedule and manage your mentoring calls."
    actions={<Button onClick={() => { setForm(BLANK); setErr(""); setOpen(true); }}>+ Schedule session</Button>}>
    <ErrorBox onRetry={sessions.reload}>{sessions.error}</ErrorBox>
    {sessions.loading ? <Loading /> : list.length === 0 ? <Empty icon="◷" title="No sessions yet" text="Schedule a session with a mentor whose request has been accepted." /> : <>
      <div className="section-title">Upcoming</div>
      <div className="stack">{upcoming.length ? upcoming.map((s) => <Row key={s._id} s={s} />) : <p className="muted">Nothing upcoming.</p>}</div>
      {past.length > 0 && <><div className="section-title" style={{ marginTop: 28 }}>Past & cancelled</div><div className="stack">{past.map((s) => <Row key={s._id} s={s} />)}</div></>}
    </>}

    {open && (
      <Modal title="Schedule a session" onClose={close}>
        <form onSubmit={submit} className="stack">
          <ErrorBox>{err}</ErrorBox>
          <Field label={isMentor ? "Mentee" : "Mentor"}>
            <select className="select" required value={form.requestId} onChange={set("requestId")}>
              <option value="">Select…</option>
              {(accepted.data?.requests || []).map((r) => <option key={r._id} value={r._id}>{(isMentor ? r.student : r.alumni)?.name} — {r.topic}</option>)}
            </select>
          </Field>
          <Field label="Session title"><input className="input" required value={form.title} onChange={set("title")} placeholder="Resume review" /></Field>
          <div className="form-grid">
            <Field label="Date & time"><input className="input" type="datetime-local" required value={form.scheduledAt} onChange={set("scheduledAt")} /></Field>
            <Field label="Duration (minutes)"><input className="input" type="number" min="10" max="240" step="5" value={form.durationMins} onChange={set("durationMins")} /></Field>
          </div>
          <Field label="Meeting link (optional)"><input className="input" type="url" placeholder="https://meet.google.com/…" value={form.meetingLink} onChange={set("meetingLink")} /></Field>
          <Field label="Notes (optional)"><textarea className="textarea" rows={3} value={form.notes} onChange={set("notes")} /></Field>
          <div className="modal-actions"><Button variant="secondary" onClick={close}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? "Sending…" : "Propose session"}</Button></div>
        </form>
      </Modal>
    )}
  </DashboardLayout>;
}
