import { Link, useLocation } from "react-router-dom";
import { LOGO_URL } from "../lib/api";

export const Header = () => {
  const loc = useLocation();
  const onAdmin = loc.pathname.startsWith("/admin");
  return (
    <header
      data-testid="site-header"
      className="w-full bg-white/90 backdrop-blur border-b border-border sticky top-0 z-40"
    >
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
        <Link to="/" data-testid="brand-home-link" className="flex items-center gap-3">
          <img src={LOGO_URL} alt="East West" className="h-10 w-10 object-contain" />
          <div className="leading-tight">
            <div className="font-heading text-lg text-primary">East West</div>
            <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
              Feedback Portal · 1968
            </div>
          </div>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link
            to="/"
            data-testid="nav-home"
            className="text-primary/80 hover:text-primary transition-colors"
          >
            Home
          </Link>
          <Link
            to="/feedback"
            data-testid="nav-feedback"
            className="text-primary/80 hover:text-primary transition-colors"
          >
            Give Feedback
          </Link>
          {onAdmin ? null : (
            <Link
              to="/admin/login"
              data-testid="nav-admin"
              className="text-secondary hover:text-secondary/80 font-semibold transition-colors"
            >
              Admin
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
