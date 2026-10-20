import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Button from "../components/Button";

const mentors = [
  ["AR","Arjun Raj","Software Engineer · 2020","React · Node.js"],
  ["PM","Priya Menon","Product Designer · 2019","UI/UX · Product"],
  ["SK","Sanjay Kumar","Data Engineer · 2018","Python · Data"],
];

export default function Home() {
  return <>
    <Navbar />
    <main>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <span className="badge">Easwari Engineering College · Verified Community</span>
            <h1>Connect. Learn. <span>Grow.</span></h1>
            <p>A dedicated alumni-student platform for mentorship, career opportunities, meaningful conversations, and professional connections across the EEC community.</p>
            <div className="hero-actions">
              <Link to="/register"><Button>Join the community →</Button></Link>
              <Link to="/login"><Button variant="secondary">Explore your workspace</Button></Link>
            </div>
          </div>
          <div className="hero-panel">
            <div className="panel-head"><div className="panel-title">Recommended mentors</div><span className="live">● LIVE</span></div>
            {mentors.map(([initials,name,role,skills]) => <div className="mentor-row" key={name}>
              <div className="avatar">{initials}</div><div className="mentor-meta"><strong>{name}</strong><span>{role}</span></div><span className="badge">{skills}</span>
            </div>)}
          </div>
        </div>
      </section>

      <section id="features" className="section">
        <div className="container">
          <div className="text-center"><span className="badge">One platform</span><h2 style={{fontFamily:"Plus Jakarta Sans",fontSize:32,color:"var(--navy)",margin:"14px 0 8px"}}>Built around your career journey</h2><p className="muted">A focused foundation for the features in your project roadmap.</p></div>
          <div className="feature-grid">
            <Feature icon="◎" title="Find the right mentor" text="Discover alumni by department, skills, experience, batch, and career interests." />
            <Feature icon="▣" title="Jobs & internships" text="Keep opportunities from the alumni community in one searchable place." />
            <Feature icon="◌" title="Mentorship conversations" text="Request mentorship, message your connections, and schedule sessions." />
          </div>
        </div>
      </section>

      <section id="how-it-works" className="section" style={{paddingTop:0}}>
        <div className="container card card-pad">
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:20}}>
            <Step n="01" title="Create your profile" text="Choose your role and share the skills or experience you want the community to discover." />
            <Step n="02" title="Discover connections" text="Search mentors, opportunities, and conversations relevant to your goals." />
            <Step n="03" title="Grow together" text="Request mentorship, schedule sessions, exchange messages, and build your network." />
          </div>
        </div>
      </section>
    </main>
  </>;
}
function Feature({icon,title,text}) { return <div className="feature-card"><div className="feature-icon">{icon}</div><h3>{title}</h3><p>{text}</p></div>; }
function Step({n,title,text}) { return <div><div className="badge">{n}</div><h3 style={{margin:"13px 0 7px",color:"var(--navy)"}}>{title}</h3><p className="muted" style={{fontSize:13,lineHeight:1.65}}>{text}</p></div>; }
