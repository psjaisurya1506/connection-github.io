import { useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import useFetch from "../hooks/useFetch";
import api, { errMsg } from "../api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Avatar, Empty, ErrorBox, Loading, Status, fmtDay } from "../components/ui";
import Button from "../components/Button";

const TABS = ["all", "pending", "accepted", "completed", "rejected", "cancelled"];

export default function Requests() {
  const { user } = useAuth();
  const toast = useToast();
  const isAlumni = user.role === "alumni";
  const [tab, setTab] = useState("all");
  const { data, loading, error, reload } = useFetch("/requests");
  const [busy, setBusy] = useState("");

  const isPeerRequest = (request) => request.kind === "mentor_to_mentor";
  const isOutgoingPeer = (request) => isPeerRequest(request) && String(request.mentorRequester?._id || request.mentorRequester) === String(user.id || user._id);
  const act = async (id, path, body, msg) => {
    setBusy(id);
    try { await api.patch(`/requests/${id}/${path}`, body); toast(msg); reload(); }
    catch (e) { toast(errMsg(e), "error"); } finally { setBusy(""); }
  };

  const list = (data?.requests || []).filter((r) => tab === "all" || r.status === tab);

  return <DashboardLayout role={user.role} title={isAlumni ? "Mentorship requests" : "My requests"} subtitle={isAlumni ? "Review student requests and manage your peer mentorships." : "Track the mentorship requests you've sent."}>
    <div className="tabs">{TABS.map((t) => <button key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>{t}</button>)}</div>
    <ErrorBox onRetry={reload}>{error}</ErrorBox>
    {loading ? <Loading /> : list.length === 0 ? (
      <Empty icon="⇄" title="Nothing here yet" text={isAlumni ? "Requests from students and other mentors will appear here." : "Find a mentor and send your first request."}>
        {isAlumni ? <Link className="btn btn-primary" to="/alumni/mentors">Find a mentor</Link> : <Link className="btn btn-primary" to="/student/mentors">Find mentors</Link>}
      </Empty>
    ) : (
      <div className="stack">
        {list.map((r) => {
          const outgoingPeer = isOutgoingPeer(r);
          const other = isPeerRequest(r)
            ? (outgoingPeer ? r.mentorRecipient : r.mentorRequester)
            : (isAlumni ? r.student : r.alumni);
          return (
            <div className="card card-pad request-card" key={r._id}>
              <Avatar name={other?.name} />
              <div className="grow">
                <div className="row-between"><strong>{other?.name}</strong><Status value={r.status} /></div>
                <div className="muted" style={{ fontSize: 12 }}>{isPeerRequest(r) || !isAlumni ? `${other?.headline || "Alumnus"}${other?.company ? " · " + other.company : ""}` : `${other?.department || ""}`} · {fmtDay(r.createdAt)}</div>
                <div style={{ marginTop: 8, fontSize: 14 }}><strong>{r.topic}</strong></div>
                {r.message && <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>{r.message}</p>}
                <div className="btn-row">
                  {isAlumni && !outgoingPeer && r.status === "pending" && <>
                    <Button disabled={busy === r._id} onClick={() => act(r._id, "respond", { status: "accepted" }, "Request accepted")}>Accept</Button>
                    <Button variant="secondary" disabled={busy === r._id} onClick={() => act(r._id, "respond", { status: "rejected" }, "Request declined")}>Decline</Button>
                  </>}
                  {isAlumni && !outgoingPeer && r.status === "accepted" && <Button variant="secondary" disabled={busy === r._id} onClick={() => act(r._id, "complete", {}, "Marked as completed")}>Mark completed</Button>}
                  {(!isAlumni || outgoingPeer) && r.status === "pending" && <Button variant="secondary" disabled={busy === r._id} onClick={() => act(r._id, "cancel", {}, "Request cancelled")}>Cancel request</Button>}
                  {r.status === "accepted" && <>
                    <Link className="btn btn-secondary" to={`/${user.role}/messages?with=${other?._id}`}>Message</Link>
                    {!isPeerRequest(r) && <Link className="btn btn-secondary" to={`/${user.role}/sessions?request=${r._id}`}>Schedule session</Link>}
                  </>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </DashboardLayout>;
}
