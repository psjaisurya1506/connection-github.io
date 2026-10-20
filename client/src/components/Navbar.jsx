import { Link } from "react-router-dom";
import Button from "./Button";

export default function Navbar() {
  return (
    <header className="site-nav">
      <div className="nav-inner">
        <Link to="/" className="brand">
          <span className="brand-mark">EA</span>
          <span>EEC Alumni Connect</span>
        </Link>
        <nav className="nav-links">
          <a href="/#features">Features</a>
          <a href="/#how-it-works">How it works</a>
          <a href="/#community">Community</a>
        </nav>
        <div className="nav-actions">
          <Link to="/login"><Button variant="secondary">Log in</Button></Link>
          <Link to="/register"><Button>Get started</Button></Link>
        </div>
      </div>
    </header>
  );
}
