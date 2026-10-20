import { Link } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import useFetch from "../hooks/useFetch";
import { useAuth } from "../context/AuthContext";
import { Avatar, Empty, ErrorBox, Loading, Status } from "../components/ui";
import { StatGrid } from "../components/StatGrid";

export default function AlumniDashboard() {
  const { user } = useAuth();
  const stats = useFetch("/dashboard/stats");
  const reqs = useFetch("/requests", { status: "pending" });
  const s = stats.data?.stats;

  return <DashboardLayout role="alumni" title={`Welcome back, ${user.name.split(" ")[0]}`} subtitle="Manage your mentorship activity and professional opportunities.">
    {!user.isVerified && <div className="notice">Your account is <strong>awaiting admin verification</strong>. An admin will check your college register number against current or former college records. Mentoring and posting opportunities unlock after approval.</div>}
    <ErrorBox onRetry={stats.reload}>{stats.error}</ErrorBox>
    <StatGrid loading={stats.loading} items={s && [["Pending requests", s.pending], ["Current mentees", s.mentees], ["Active posts", s.posts], ["Upcoming sessions", s.sessions]]} />
    <div className="dashboard-grid">
      <section className="card card-pad">
        <div className="section-title row-between">Pending mentorship requests <Link to="/alumni/requests" className="link-btn">Manage →</Link></div>
        {reqs.loading ? <Loading /> : (reqs.data?.requests || []).length === 0 ? <Empty title="No pending requests" text="New student requests will show up here." /> :
          reqs.data.requests.slice(0, 5).map((r) => <div className="list-item" key={r._id}><Avatar name={r.student?.name} /><div><strong style={{ fontSize: 13 }}>{r.student?.name} · {r.student?.department}</strong><div className="muted" style={{ fontSize: 11 }}>{r.topic}</div></div><Status value="pending" /></div>)}
      </section>
      <section className="card card-pad"><div className="section-title">Quick actions</div>
        <div style={{ display: "grid", gap: 9 }}>
          <Link className="btn btn-primary" to="/alumni/jobs">Post a job</Link>
          <Link className="btn btn-secondary" to="/alumni/sessions">Schedule session</Link>
          <Link className="btn btn-secondary" to="/alumni/messages">View messages</Link>
          <Link className="btn btn-secondary" to="/alumni/profile">Edit profile</Link>
        </div>
      </section>
    </div>
  </DashboardLayout>;
}
