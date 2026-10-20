import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import useFetch from "../hooks/useFetch";
import api, { errMsg } from "../api";
import { useToast } from "../context/ToastContext";
import { Avatar, Empty, ErrorBox, Field, Loading, Modal, Pagination, Status } from "../components/ui";
import Button from "../components/Button";

export default function Mentors() {
  const toast = useToast();
  const [q, setQ] = useState({ search: "", department: "", skill: "", batch: "" });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState(null);
  const [form, setForm] = useState({ topic: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // debounce the search box
  useEffect(() => { const t = setTimeout(() => { setQ((o) => ({ ...o, search })); setPage(1); }, 350); return () => clearTimeout(t); }, [search]);

  const filters = useFetch("/users/filters");
  const { data, loading, error, reload } = useFetch("/users/mentors", { ...q, page, limit: 9 });

  const setFilter = (k) => (e) => { setQ({ ...q, [k]: e.target.value }); setPage(1); };
  const open = (m) => { setTarget(m); setForm({ topic: "", message: "" }); setErr(""); };

  const send = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await api.post("/requests", { alumniId: target.id, ...form });
      toast(`Request sent to ${target.name}`);
      setTarget(null);
      reload();
    } catch (x) { setErr(errMsg(x)); } finally { setBusy(false); }
  };

  return <DashboardLayout role="student" title="Find a mentor" subtitle="Verified EEC alumni who are open to mentoring students.">
    <div className="card card-pad filters">
      <input className="input" placeholder="Search by name, company, skill…" value={search} onChange={(e) => setSearch(e.target.value)} />
      <select className="select" value={q.department} onChange={setFilter("department")}><option value="">All departments</option>{(filters.data?.departments || []).map((d) => <option key={d}>{d}</option>)}</select>
      <select className="select" value={q.skill} onChange={setFilter("skill")}><option value="">All skills</option>{(filters.data?.skills || []).map((d) => <option key={d}>{d}</option>)}</select>
      <select className="select" value={q.batch} onChange={setFilter("batch")}><option value="">All batches</option>{(filters.data?.batches || []).map((d) => <option key={d}>{d}</option>)}</select>
    </div>
    <ErrorBox onRetry={reload}>{error}</ErrorBox>
    {loading ? <Loading /> : (data?.mentors || []).length === 0 ? <Empty icon="◎" title="No mentors match your search" text="Try clearing a filter." /> : (
      <div className="cards-grid">
        {data.mentors.map((m) => (
          <div className="card card-pad mentor-card" key={m.id}>
            <div className="mentor-top"><Avatar name={m.name} size={50} /><div><strong>{m.name}</strong><div className="muted" style={{ fontSize: 12 }}>{m.headline || "Alumnus"}{m.company ? ` · ${m.company}` : ""}</div><div className="muted" style={{ fontSize: 11 }}>{m.department} {m.batch && `· ${m.batch}`}</div></div></div>
            {m.bio && <p className="muted clamp">{m.bio}</p>}
            <div className="chips">{(m.skills || []).slice(0, 5).map((s) => <span className="chip" key={s}>{s}</span>)}</div>
            <div className="card-foot">
              <span className="muted" style={{ fontSize: 12 }}>{m.experience ? `${m.experience} yrs experience` : ""}</span>
              {m.requestStatus === "accepted" ? <Link to="/student/messages" className="btn btn-secondary">Message</Link>
                : m.requestStatus === "pending" ? <Status value="pending" label="Requested" />
                : <Button onClick={() => open(m)}>Request mentorship</Button>}
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
          <Field label="What do you want help with?"><input className="input" required maxLength={120} placeholder="e.g. Preparing for a software internship" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} /></Field>
          <Field label="Message (optional)"><textarea className="textarea" rows={4} maxLength={800} placeholder="Introduce yourself and what you'd like to learn…" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></Field>
          <div className="modal-actions"><Button variant="secondary" onClick={() => setTarget(null)}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? "Sending…" : "Send request"}</Button></div>
        </form>
      </Modal>
    )}
  </DashboardLayout>;
}
