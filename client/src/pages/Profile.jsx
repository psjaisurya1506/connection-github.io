import { useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import api, { errMsg } from "../api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Avatar, ErrorBox, Field, Status } from "../components/ui";
import Button from "../components/Button";

export default function Profile() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const isAlumni = user.role === "alumni";
  const [form, setForm] = useState({
    name: user.name, department: user.department || "", batch: user.batch || "", bio: user.bio || "", skills: (user.skills || []).join(", "),
    headline: user.headline || "", company: user.company || "", linkedin: user.linkedin || "", experience: user.experience || 0, openToMentor: user.openToMentor !== false,
  });
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const { data } = await api.put("/users/me", form);
      setUser(data.user);
      toast("Profile saved");
    } catch (x) { setErr(errMsg(x)); } finally { setBusy(false); }
  };
  const changePw = async (e) => {
    e.preventDefault();
    try { await api.put("/auth/password", pw); toast("Password updated"); setPw({ currentPassword: "", newPassword: "" }); }
    catch (x) { toast(errMsg(x), "error"); }
  };

  return <DashboardLayout role={user.role} title="Your profile" subtitle="This is what mentors, students and admins see about you.">
    <div className="dashboard-grid" style={{ marginTop: 0 }}>
      <form className="card card-pad stack" onSubmit={save}>
        <div className="mentor-top"><Avatar name={user.name} size={56} /><div><strong>{user.name}</strong><div className="muted" style={{ fontSize: 12 }}>{user.email}</div>
          <div style={{ marginTop: 6 }}><Status value={user.isVerified ? "verified" : "unverified"} label={user.isVerified ? "Verified" : "Awaiting verification"} /></div></div></div>
        <ErrorBox>{err}</ErrorBox>
        <div className="form-grid">
          <Field label="Full name"><input className="input" required value={form.name} onChange={set("name")} /></Field>
          <Field label="Department"><input className="input" value={form.department} onChange={set("department")} /></Field>
          <Field label={isAlumni ? "Graduation year" : "Batch"}><input className="input" value={form.batch} onChange={set("batch")} /></Field>
          <Field label="Skills" hint="Comma separated"><input className="input" value={form.skills} onChange={set("skills")} placeholder="React, Python, SQL" /></Field>
          {isAlumni && <>
            <Field label="Current role"><input className="input" value={form.headline} onChange={set("headline")} placeholder="Software Engineer" /></Field>
            <Field label="Company"><input className="input" value={form.company} onChange={set("company")} /></Field>
            <Field label="Years of experience"><input className="input" type="number" min="0" value={form.experience} onChange={set("experience")} /></Field>
            <Field label="LinkedIn"><input className="input" value={form.linkedin} onChange={set("linkedin")} /></Field>
          </>}
          <div className="form-full"><Field label="About you"><textarea className="textarea" rows={4} maxLength={600} value={form.bio} onChange={set("bio")} /></Field></div>
        </div>
        {isAlumni && <label className="check-row"><input type="checkbox" checked={form.openToMentor} onChange={(e) => setForm({ ...form, openToMentor: e.target.checked })} /> I'm open to mentoring students</label>}
        <div><Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save changes"}</Button></div>
      </form>
      <form className="card card-pad stack" onSubmit={changePw} style={{ alignSelf: "start" }}>
        <div className="section-title" style={{ marginBottom: 0 }}>Change password</div>
        <Field label="Current password"><input className="input" type="password" required value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} autoComplete="current-password" /></Field>
        <Field label="New password"><input className="input" type="password" required minLength={6} value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} autoComplete="new-password" /></Field>
        <div><Button type="submit" variant="secondary">Update password</Button></div>
      </form>
    </div>
  </DashboardLayout>;
}
