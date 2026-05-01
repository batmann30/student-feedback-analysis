import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { ArrowRight, BarChart3, ShieldCheck, Sparkles } from "lucide-react";
import Header from "../components/Header";
import { LOGO_URL } from "../lib/api";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative ew-hero-bg" data-testid="landing-hero">
        <div className="absolute inset-0 bg-primary/85 backdrop-blur-[2px]" />
        <div className="relative max-w-6xl mx-auto px-6 py-24 md:py-32 text-white">
          <div className="max-w-3xl animate-fade-in-up">
            <img src={LOGO_URL} alt="East West" className="h-20 w-20 bg-white/90 rounded-full p-1 shadow-lg mb-6" />
            <div className="text-xs uppercase tracking-[0.3em] text-secondary mb-4" data-testid="hero-eyebrow">
              Est. 1968 · Student Voice Programme
            </div>
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-semibold leading-[1.05]">
              Your feedback shapes the <span className="text-secondary">East West</span> experience.
            </h1>
            <p className="mt-6 text-white/85 text-base md:text-lg max-w-2xl leading-relaxed">
              A short, confidential review of your subjects, teaching quality, campus and facilities — the insights
              we use to keep improving what we do every semester.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link to="/feedback">
                <Button
                  size="lg"
                  data-testid="start-feedback-btn"
                  className="bg-secondary hover:bg-secondary/90 text-white rounded-full px-8 py-6 font-semibold text-base shadow-lg"
                >
                  Start your feedback
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <Link to="/admin/login">
                <Button
                  size="lg"
                  variant="outline"
                  data-testid="admin-portal-btn"
                  className="rounded-full px-8 py-6 border-white/40 bg-transparent text-white hover:bg-white hover:text-primary"
                >
                  Admin portal
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Feature strip */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: <Sparkles className="w-6 h-6" />,
              title: "Four quick steps",
              text: "Choose your course and semester, rate your subjects and campus, review and submit — under 3 minutes.",
            },
            {
              icon: <ShieldCheck className="w-6 h-6" />,
              title: "Anonymous option",
              text: "Share feedback with your roll number or stay fully anonymous — your voice, your choice.",
            },
            {
              icon: <BarChart3 className="w-6 h-6" />,
              title: "Turned into action",
              text: "Faculty and management review aggregated results every term to drive real improvements.",
            },
          ].map((f, i) => (
            <Card
              key={f.title}
              data-testid={`feature-card-${i}`}
              className="border-border shadow-[0_4px_20px_rgba(15,37,87,0.05)] hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <CardContent className="p-7">
                <div className="w-11 h-11 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center mb-4">
                  {f.icon}
                </div>
                <h3 className="font-heading text-xl text-primary mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <div className="ew-divider max-w-6xl mx-auto" />

      <footer className="max-w-6xl mx-auto px-6 py-10 text-sm text-muted-foreground flex flex-wrap items-center justify-between gap-3">
        <div>© {new Date().getFullYear()} East West College · Feedback Portal</div>
        <div className="text-xs uppercase tracking-widest">Excellence in Education since 1968</div>
      </footer>
    </div>
  );
};

export default Landing;
