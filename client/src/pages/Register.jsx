import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import Button from "../components/Button";
import api, { errMsg } from "../api";
import { roleHome, useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export default function Register() {
  const { user, signIn } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "", role: "student", registerNumber: "", department: "", batch: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={roleHome(user.role)} replace />;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password.length < 6) return setError("Password must be at least 6 characters");
    if (form.password !== form.confirm) return setError("Passwords do not match");
    setBusy(true);
    try {
      const { confirm, ...payload } = form; // eslint-disable-line no-unused-vars
      const { data } = await api.post("/auth/register", payload);
      signIn(data);
      toast("Account created. An admin will verify your college register number before approving your account.");
      nav(roleHome(data.user.role), { replace: true });
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return <div className="auth-shell">
    <div className="auth-brand">
      <Link to="/" className="brand" style={{ color: "#fff" }}><span className="brand-mark">EA</span><span>EEC Alumni Connect</span></Link>
      <h1>Build your EEC network.</h1>
      <p>Create a verified community profile and start discovering mentors, opportunities, and connections.</p>
      <div className="auth-points"><Point text="Students and alumni of Easwari Engineering College" /><Point text="Skill-based mentor discovery" /><Point text="Every account is checked by an admin against college records" /></div>
    </div>
    <div className="auth-form-wrap"><form className="card auth-card" onSubmit={submit}>
      <span className="badge">Create account</span><h2 style={{ marginTop: 14 }}>Join EEC Alumni Connect</h2><p className="muted" style={{ fontSize: 13, marginBottom: 22 }}>It takes less than a minute.</p>
      {error && <div className="error" role="alert">{error}</div>}
      <div className="form-grid">
        <Field label="Full name" placeholder="Jaisurya P S" value={form.name} onChange={set("name")} required />
        <Field label="Email address" placeholder="you@example.com" type="email" value={form.email} onChange={set("email")} required />
        <Field label="Password" placeholder="At least 6 characters" type="password" value={form.password} onChange={set("password")} required />
        <Field label="Confirm password" placeholder="Repeat password" type="password" value={form.confirm} onChange={set("confirm")} required />
        <div><label className="label" htmlFor="register-number">College register number</label><input id="register-number" className="input" type="text" inputMode="numeric" autoComplete="off" placeholder="31062_______" pattern="31062[0-9]{7}" maxLength={12} title="Enter 31062 followed by 7 digits" value={form.registerNumber} onChange={set("registerNumber")} required /><div className="muted hint">Enter the 7 digits after 31062. An admin will check it against college records.</div></div>
        <div><label className="label">Role</label><select className="select" value={form.role} onChange={set("role")}><option value="student">Student</option><option value="alumni">Alumni</option></select></div>
        <Field label="Department" placeholder="Computer Science & Design" value={form.department} onChange={set("department")} />
        <Field label={form.role === "alumni" ? "Graduation year" : "Batch"} placeholder={form.role === "alumni" ? "2020" : "2024–2028"} value={form.batch} onChange={set("batch")} />
      </div>
      <div style={{ marginTop: 20 }}><Button type="submit" disabled={busy} style={{ width: "100%" }}>{busy ? "Creating account…" : "Create account"}</Button></div>
      <p className="muted text-center" style={{ fontSize: 13, marginTop: 18 }}>Already registered? <Link to="/login" style={{ color: "#2563eb", fontWeight: 800 }}>Sign in</Link></p>
    </form></div>
  </div>;
}
function Field({ label, ...props }) { return <div><label className="label">{label}</label><input className="input" {...props} /></div>; }
function Point({ text }) { return <div className="auth-point"><span className="check">✓</span>{text}</div>; }
