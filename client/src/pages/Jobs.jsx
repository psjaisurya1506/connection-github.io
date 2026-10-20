import { useEffect, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import useFetch from "../hooks/useFetch";
import api, { errMsg } from "../api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Avatar, Empty, ErrorBox, Field, Loading, Modal, Pagination, Status, fmtDay } from "../components/ui";
import Button from "../components/Button";

const BLANK = { title: "", company: "", location: "", type: "job", mode: "onsite", description: "", skills: "", salary: "", applyLink: "", deadline: "" };

export default function Jobs() {
  const { user } = useAuth();
  const toast = useToast();
  const canPost = user.role === "admin" || (user.role === "alumni" && user.isVerified);
  const [view, setView] = useState("all"); // all | saved | mine
  const [q, setQ] = useState({ type: "", mode: "" });
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null); // null | "new" | job
  const [form, setForm] = useState(BLANK);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { const t = setTimeout(() => { setDebounced(search); setPage(1); }, 350); return () => clearTimeout(t); }, [search]);

  const params = { ...q, search: debounced, page, limit: 8, ...(view === "saved" ? { saved: "true" } : {}), ...(view === "mine" ? { mine: "true" } : {}) };
  const { data, loading, error, reload, setData } = useFetch("/jobs", params);

  const openForm = (job) => {
    setErr("");
    setEditing(job || "new");
    setForm(job ? { ...BLANK, ...job, skills: (job.skills || []).join(", "), deadline: job.deadline ? job.deadline.slice(0, 10) : "" } : BLANK);
  };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      if (editing === "new") await api.post("/jobs", form);
      else await api.put(`/jobs/${editing.id}`, form);
      toast(editing === "new" ? "Opportunity posted" : "Opportunity updated");
      setEditing(null); reload();
    } catch (x) { setErr(errMsg(x)); } finally { setBusy(false); }
  };

  const remove = async (job) => {
    if (!window.confirm(`Delete "${job.title}"?`)) return;
    try { await api.delete(`/jobs/${job.id}`); toast("Opportunity deleted"); reload(); } catch (x) { toast(errMsg(x), "error"); }
  };

  const save = async (job) => {
    try {
      const { data: r } = await api.post(`/jobs/${job.id}/save`);
      setData((d) => ({ ...d, jobs: d.jobs.map((j) => (j.id === job.id ? { ...j, saved: r.saved } : j)) }));
      if (view === "saved" && !r.saved) reload();
    } catch (x) { toast(errMsg(x), "error"); }
  };

  const views = user.role === "student" ? [["all", "All"], ["saved", "Saved"]] : canPost && user.role === "alumni" ? [["all", "All"], ["mine", "My posts"]] : [["all", "All"]];

  return <DashboardLayout role={user.role} title="Jobs & internships" subtitle="Opportunities shared by the EEC alumni community."
    actions={canPost && <Button onClick={() => openForm()}>+ Post opportunity</Button>}>
    {user.role === "alumni" && !user.isVerified && <div className="notice">You can browse opportunities now. Posting unlocks after an admin verifies your account.</div>}
    <div className="card card-pad filters">
      <input className="input" placeholder="Search title, company, skill…" value={search} onChange={(e) => setSearch(e.target.value)} />
      <select className="select" value={q.type} onChange={(e) => { setQ({ ...q, type: e.target.value }); setPage(1); }}><option value="">Jobs & internships</option><option value="job">Jobs</option><option value="internship">Internships</option></select>
      <select className="select" value={q.mode} onChange={(e) => { setQ({ ...q, mode: e.target.value }); setPage(1); }}><option value="">Any mode</option><option value="onsite">On-site</option><option value="hybrid">Hybrid</option><option value="remote">Remote</option></select>
    </div>
    {views.length > 1 && <div className="tabs">{views.map(([k, l]) => <button key={k} className={`tab ${view === k ? "active" : ""}`} onClick={() => { setView(k); setPage(1); }}>{l}</button>)}</div>}
    <ErrorBox onRetry={reload}>{error}</ErrorBox>
    {loading ? <Loading /> : (data?.jobs || []).length === 0 ? <Empty icon="▣" title="No opportunities found" text={view === "saved" ? "Save opportunities to see them here." : "Try a different search or filter."} /> : (
      <div className="stack">
        {data.jobs.map((j) => {
          const mine = String(j.postedBy?._id) === String(user.id) || user.role === "admin";
          return (
            <div className="card card-pad job-card" key={j.id}>
              <Avatar name={j.company} size={46} />
              <div className="grow">
                <div className="row-between"><strong style={{ fontSize: 16 }}>{j.title}</strong>
                  <div className="chips"><span className="chip chip-blue">{j.type}</span><span className="chip">{j.mode}</span>{!j.isActive && <Status value="inactive" />}</div></div>
                <div className="muted" style={{ fontSize: 13 }}>{j.company}{j.location ? ` · ${j.location}` : ""}{j.salary ? ` · ${j.salary}` : ""}</div>
                <p className="clamp" style={{ fontSize: 13, margin: "8px 0", color: "#475569" }}>{j.description}</p>
                <div className="chips">{(j.skills || []).map((s) => <span className="chip" key={s}>{s}</span>)}</div>
                <div className="card-foot">
                  <span className="muted" style={{ fontSize: 12 }}>Posted by {j.postedBy?.name} · {fmtDay(j.createdAt)}{j.deadline ? ` · Apply by ${fmtDay(j.deadline)}` : ""}</span>
                  <div className="btn-row" style={{ margin: 0 }}>
                    {user.role === "student" && <Button variant="secondary" onClick={() => save(j)}>{j.saved ? "★ Saved" : "☆ Save"}</Button>}
                    {mine && canPost && <><Button variant="secondary" onClick={() => openForm(j)}>Edit</Button><Button variant="ghost" onClick={() => remove(j)}>Delete</Button></>}
                    {j.applyLink && <a className="btn btn-primary" target="_blank" rel="noopener noreferrer" href={j.applyLink.includes("@") && !j.applyLink.startsWith("http") ? `mailto:${j.applyLink}` : j.applyLink}>Apply →</a>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    )}
    <Pagination page={data?.page} pages={data?.pages} onPage={setPage} />

    {editing && (
      <Modal title={editing === "new" ? "Post an opportunity" : "Edit opportunity"} onClose={() => setEditing(null)}>
        <form onSubmit={submit} className="stack">
          <ErrorBox>{err}</ErrorBox>
          <div className="form-grid">
            <Field label="Title"><input className="input" required value={form.title} onChange={set("title")} /></Field>
            <Field label="Company"><input className="input" required value={form.company} onChange={set("company")} /></Field>
            <Field label="Type"><select className="select" value={form.type} onChange={set("type")}><option value="job">Job</option><option value="internship">Internship</option></select></Field>
            <Field label="Work mode"><select className="select" value={form.mode} onChange={set("mode")}><option value="onsite">On-site</option><option value="hybrid">Hybrid</option><option value="remote">Remote</option></select></Field>
            <Field label="Location"><input className="input" value={form.location} onChange={set("location")} /></Field>
            <Field label="Salary / stipend"><input className="input" value={form.salary} onChange={set("salary")} /></Field>
            <Field label="Apply link or email"><input className="input" value={form.applyLink} onChange={set("applyLink")} placeholder="https://… or hr@company.com" /></Field>
            <Field label="Deadline"><input className="input" type="date" value={form.deadline} onChange={set("deadline")} /></Field>
            <div className="form-full"><Field label="Skills (comma separated)"><input className="input" value={form.skills} onChange={set("skills")} placeholder="React, Node.js" /></Field></div>
            <div className="form-full"><Field label="Description"><textarea className="textarea" rows={5} required value={form.description} onChange={set("description")} /></Field></div>
          </div>
          <div className="modal-actions"><Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</Button></div>
        </form>
      </Modal>
    )}
  </DashboardLayout>;
}
