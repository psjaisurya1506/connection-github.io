import { Link } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import useFetch from "../hooks/useFetch";
import { useAuth } from "../context/AuthContext";
import { Avatar, Empty, ErrorBox, Loading, Status, fmtDate } from "../components/ui";
import { StatGrid } from "../components/StatGrid";

export default function StudentDashboard() {
  const { user } = useAuth();
  const stats = useFetch("/dashboard/stats");
  const mentors = useFetch("/users/mentors", { limit: 4 });
  const sessions = useFetch("/sessions");
  const upcoming = (sessions.data?.sessions || []).filter((s) => ["pending", "confirmed"].includes(s.status) && new Date(s.scheduledAt) > new Date()).slice(0, 4);
  const s = stats.data?.stats;

  return <DashboardLayout role="student" title={`Hello, ${user.name.split(" ")[0]}`} subtitle="Here's a quick view of your mentorship and career workspace.">
    {!user.isVerified && <div className="notice">Your account is <strong>awaiting admin verification</strong>. An admin will check your college register number against current or former college records.</div>}
    <ErrorBox onRetry={stats.reload}>{stats.error}</ErrorBox>
    <StatGrid loading={stats.loading} items={s && [["Mentors available", s.mentors], ["Requests sent", s.sent], ["Upcoming sessions", s.sessions], ["Saved opportunities", s.saved]]} />
    <div className="dashboard-grid">
      <section className="card card-pad">
        <div className="section-title row-between">Recommended mentors <Link to="/student/mentors" className="link-btn">See all →</Link></div>
        {mentors.loading ? <Loading /> : (mentors.data?.mentors || []).length === 0 ? <Empty title="No mentors yet" text="Verified alumni will appear here." /> :
          mentors.data.mentors.map((m) => <div className="list-item" key={m.id}><Avatar name={m.name} /><div><strong style={{ fontSize: 13 }}>{m.name} · {m.headline || "Alumnus"}</strong><div className="muted" style={{ fontSize: 11 }}>{[m.company, (m.skills || []).slice(0, 3).join(" · ")].filter(Boolean).join(" · ")}</div></div>
            {m.requestStatus ? <Status value={m.requestStatus} /> : <Link to="/student/mentors" className="status status-blue">View</Link>}</div>)}
      </section>
      <section className="card card-pad">
        <div className="section-title row-between">Upcoming sessions <Link to="/student/sessions" className="link-btn">All →</Link></div>
        {sessions.loading ? <Loading /> : upcoming.length === 0 ? <Empty title="Nothing scheduled" text="Once a mentor accepts, schedule a session." /> :
          upcoming.map((x) => <div className="list-item" key={x._id}><div><strong style={{ fontSize: 13 }}>{x.title}</strong><div className="muted" style={{ fontSize: 11 }}>{fmtDate(x.scheduledAt)} · {x.mentor?.name}</div></div><Status value={x.status} /></div>)}
      </section>
    </div>
  </DashboardLayout>;
}
