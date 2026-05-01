import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent } from "../components/ui/card";
import { Loader2, Lock } from "lucide-react";
import { api, formatApiError, LOGO_URL } from "../lib/api";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@eastwest.edu");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/admin/login", { email, password });
      localStorage.setItem("ew_admin_token", data.access_token);
      localStorage.setItem("ew_admin_email", data.email);
      toast.success("Welcome back, admin.");
      navigate("/admin");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative ew-admin-bg flex items-center justify-center px-6" data-testid="admin-login-page">
      <div className="absolute inset-0 bg-primary/90 backdrop-blur-md" />
      <div className="relative w-full max-w-md animate-fade-in-up">
        <Card className="border-border/50 shadow-2xl">
          <CardContent className="p-8">
            <div className="flex flex-col items-center mb-6">
              <img src={LOGO_URL} alt="East West" className="h-16 w-16 object-contain mb-3" />
              <div className="text-xs uppercase tracking-[0.3em] text-secondary">Admin Portal</div>
              <h1 className="font-heading text-2xl text-primary mt-1">East West Feedback</h1>
            </div>
            <form onSubmit={onSubmit} className="space-y-5">
              <div>
                <Label className="text-xs uppercase tracking-wider text-primary/70">Email</Label>
                <Input
                  type="email"
                  data-testid="admin-email-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-2"
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-primary/70">Password</Label>
                <Input
                  type="password"
                  data-testid="admin-password-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="mt-2"
                  placeholder="••••••••"
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                data-testid="admin-login-btn"
                className="w-full bg-primary text-white rounded-full py-6 hover:bg-primary/90 font-semibold"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
                Sign in
              </Button>
            </form>
          </CardContent>
        </Card>
        <p className="text-center text-white/70 text-xs mt-6 tracking-widest uppercase">
          Restricted · Authorised personnel only
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
