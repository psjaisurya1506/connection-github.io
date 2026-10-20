import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import useFetch from "../hooks/useFetch";
import api, { errMsg } from "../api";
import { useToast } from "../context/ToastContext";
import { Avatar, Empty, ErrorBox, Field, Loading, Modal, Pagination, Status } from "../components/ui";
import Button from "../components/Button";

export default function PeerMentors() {
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState(null);
  const [form, setForm] = useState({ topic: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, loading, error, reload } = useFetch("/users/peers", { search: query, page, limit: 9 });

  const open = (mentor) => {
    setTarget(mentor);
    setForm({ topic: "", message: "" });
    setErr("");
  };

  const send = async (event) => {
    event.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await api.post("/requests/peer", { mentorId: target.id, ...form });
      toast(`Request sent to ${target.name}`);
      setTarget(null);
      reload();
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return <DashboardLayout role="alumni" title="Find a mentor" subtitle="Connect with verified alumni who are open to peer mentorship.">
    <div className="card card-pad filters">
      <input className="input" aria-label="Search alumni" placeholder="Search by name, company, or skill…" value={search} onChange={(event) => setSearch(event.target.value)} />
    </div>
    <ErrorBox onRetry={reload}>{error}</ErrorBox>
    {loading ? <Loading /> : (data?.mentors || []).length === 0 ? (
      <Empty icon="◎" title="No mentors match your search" text="Try a different search." />
    ) : (
      <div className="cards-grid">
        {data.mentors.map((mentor) => (
          <div className="card card-pad mentor-card" key={mentor.id}>
            <div className="mentor-top">
              <Avatar name={mentor.name} size={50} />
              <div>
                <strong>{mentor.name}</strong>
                <div className="muted" style={{ fontSize: 12 }}>{mentor.headline || "Alumnus"}{mentor.company ? ` · ${mentor.company}` : ""}</div>
                <div className="muted" style={{ fontSize: 11 }}>{mentor.department} {mentor.batch && `· ${mentor.batch}`}</div>
              </div>
            </div>
            {mentor.bio && <p className="muted clamp">{mentor.bio}</p>}
            <div className="chips">{(mentor.skills || []).slice(0, 5).map((skill) => <span className="chip" key={skill}>{skill}</span>)}</div>
            <div className="card-foot">
              <span className="muted" style={{ fontSize: 12 }}>{mentor.experience ? `${mentor.experience} yrs experience` : ""}</span>
              {mentor.requestStatus === "accepted" ? <Link to={`/alumni/messages?with=${mentor.id}`} className="btn btn-secondary">Message</Link>
                : mentor.requestStatus === "pending" ? <Status value="pending" label="Requested" />
                  : <Button onClick={() => open(mentor)}>Request mentorship</Button>}
            </div>
          </div>
        ))}
      </div>
    )}
    <Pagination page={data?.page} pages={data?.pages} onPage={setPage} />

    {target && (
      <Modal title={`Request mentorship from ${target.name}`} onClose={() => setTarget(null)}>
        <form onSubmit={send} className="stack">
          <ErrorBox>{err}</ErrorBox>
          <Field label="What would you like help with?">
            <input className="input" required maxLength={120} placeholder="e.g. Growing into a leadership role" value={form.topic} onChange={(event) => setForm({ ...form, topic: event.target.value })} />
          </Field>
          <Field label="Message (optional)">
            <textarea className="textarea" rows={4} maxLength={800} placeholder="Introduce yourself and what you'd like to learn…" value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} />
          </Field>
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setTarget(null)}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? "Sending…" : "Send request"}</Button>
          </div>
        </form>
      </Modal>
    )}
  </DashboardLayout>;
}
