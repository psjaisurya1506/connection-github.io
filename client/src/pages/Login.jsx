import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import Button from "../components/Button";
import api, { errMsg } from "../api";
import { roleHome, useAuth } from "../context/AuthContext";

export default function Login() {
  const { user, signIn } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={roleHome(user.role)} replace />;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const { data } = await api.post("/auth/login", form);
      signIn(data);
      const from = loc.state?.from;
      nav(from && from.startsWith(`/${data.user.role}/`) ? from : roleHome(data.user.role), { replace: true });
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return <div className="auth-shell">
    <div className="auth-brand">
      <Link to="/" className="brand" style={{ color: "#fff" }}><span className="brand-mark">EA</span><span>EEC Alumni Connect</span></Link>
      <h1>Welcome back to your community.</h1>
      <p>Sign in to continue your mentorship, career discovery, and alumni networking journey.</p>
      <div className="auth-points"><Point text="Verified alumni community" /><Point text="Mentor discovery by skills and experience" /><Point text="Jobs, internships, sessions and messaging" /></div>
    </div>
    <div className="auth-form-wrap"><form className="card auth-card" onSubmit={submit}>
      <span className="badge">Account access</span><h2 style={{ marginTop: 14 }}>Sign in</h2><p className="muted" style={{ fontSize: 13, marginBottom: 24 }}>Use the email and password you registered with.</p>
      {error && <div className="error" role="alert">{error}</div>}
      <div style={{ marginBottom: 15 }}><label className="label">Email address</label><input className="input" type="email" placeholder="you@example.com" value={form.email} onChange={set("email")} required autoComplete="email" /></div>
      <div style={{ marginBottom: 18 }}><label className="label">Password</label><input className="input" type="password" placeholder="••••••••" value={form.password} onChange={set("password")} required autoComplete="current-password" /></div>
      <Button type="submit" disabled={busy} style={{ width: "100%" }}>{busy ? "Signing in…" : "Sign in"}</Button>
      <p className="muted text-center" style={{ fontSize: 13, marginTop: 18 }}>New to the community? <Link to="/register" style={{ color: "#2563eb", fontWeight: 800 }}>Create an account</Link></p>
    </form></div>
  </div>;
}
function Point({ text }) { return <div className="auth-point"><span className="check">✓</span>{text}</div>; }
