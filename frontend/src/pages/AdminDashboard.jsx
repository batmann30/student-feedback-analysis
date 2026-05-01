import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Download, LogOut, RefreshCw, Users, Star, TrendingUp, BookOpen } from "lucide-react";
import { api, formatApiError, LOGO_URL, API } from "../lib/api";

const CHART_COLORS = ["#0F2557", "#C9A227", "#4B6584", "#E0C367", "#8D99AE"];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState({ course: "all", semester: "all", date_from: "", date_to: "" });
  const [courses, setCourses] = useState({});

  const token = localStorage.getItem("ew_admin_token");

  useEffect(() => {
    if (!token) {
      navigate("/admin/login");
    }
  }, [token, navigate]);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.course !== "all") params.course = filters.course;
      if (filters.semester !== "all") params.semester = filters.semester;
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;
      const { data } = await api.get("/admin/analytics", { params });
      setData(data);
    } catch (e) {
      toast.error(formatApiError(e));
      if (e?.response?.status === 401) {
        localStorage.removeItem("ew_admin_token");
        navigate("/admin/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const loadCourses = async () => {
    try {
      const { data } = await api.get("/courses");
      setCourses(data.courses || {});
    } catch (e) {
      /* ignore */
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    if (token) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, token]);

  const logout = () => {
    localStorage.removeItem("ew_admin_token");
    navigate("/admin/login");
  };

  const exportCsv = () => {
    const params = new URLSearchParams();
    if (filters.course !== "all") params.append("course", filters.course);
    if (filters.semester !== "all") params.append("semester", filters.semester);
    const url = `${API}/admin/export?${params.toString()}`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => {
        if (!r.ok) throw new Error("Export failed");
        const blob = await r.blob();
        const href = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = href;
        a.download = `feedback_export.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(href);
        toast.success("CSV downloaded");
      })
      .catch((e) => toast.error(e.message));
  };

  const genBarData = useMemo(() => {
    if (!data) return [];
    const g = data.general_averages || {};
    return [
      { metric: "Campus", value: g.campus || 0 },
      { metric: "Staff", value: g.staff || 0 },
      { metric: "Management", value: g.management || 0 },
      { metric: "Facilities", value: g.facilities || 0 },
      { metric: "Placements", value: g.placements || 0 },
    ];
  }, [data]);

  const allSemesters = useMemo(() => {
    const set = new Set();
    Object.values(courses).forEach((years) =>
      Object.values(years).forEach((sems) => sems.forEach((s) => set.add(s)))
    );
    return Array.from(set).sort();
  }, [courses]);

  return (
    <div className="min-h-screen bg-background flex" data-testid="admin-dashboard">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 bg-primary text-white flex-col p-6 sticky top-0 h-screen">
        <div className="flex items-center gap-3 mb-8">
          <img src={LOGO_URL} alt="East West" className="h-10 w-10 rounded-full bg-white/90 p-0.5" />
          <div>
            <div className="font-heading text-lg">East West</div>
            <div className="text-[10px] tracking-widest uppercase text-secondary">Admin · 1968</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 text-sm">
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-secondary/20 text-secondary font-semibold">
            <TrendingUp className="w-4 h-4" /> Analytics
          </div>
        </nav>
        <div className="pt-4 border-t border-white/10">
          <div className="text-xs text-white/60 mb-3">
            {localStorage.getItem("ew_admin_email")}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={logout}
            data-testid="logout-btn"
            className="w-full rounded-full border-white/40 bg-transparent text-white hover:bg-white hover:text-primary"
          >
            <LogOut className="w-4 h-4 mr-2" /> Sign out
          </Button>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-10 max-w-[1400px]">
        {/* Top bar */}
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-secondary mb-1">Dashboard</div>
            <h1 className="font-heading text-3xl md:text-4xl text-primary">Feedback analytics</h1>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={load}
              data-testid="refresh-btn"
              className="rounded-full"
            >
              <RefreshCw className="w-4 h-4 mr-2" /> Refresh
            </Button>
            <Button
              onClick={exportCsv}
              data-testid="export-csv-btn"
              className="bg-secondary text-white rounded-full hover:bg-secondary/90"
            >
              <Download className="w-4 h-4 mr-2" /> Export CSV
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-8 border-border">
          <CardContent className="p-5 grid md:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs uppercase tracking-wider text-primary/70">Course</Label>
              <Select
                value={filters.course}
                onValueChange={(v) => setFilters({ ...filters, course: v })}
              >
                <SelectTrigger data-testid="filter-course" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All courses</SelectItem>
                  {Object.keys(courses).map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-primary/70">Semester</Label>
              <Select
                value={filters.semester}
                onValueChange={(v) => setFilters({ ...filters, semester: v })}
              >
                <SelectTrigger data-testid="filter-semester" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All semesters</SelectItem>
                  {allSemesters.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-primary/70">From</Label>
              <Input
                type="date"
                data-testid="filter-date-from"
                value={filters.date_from}
                onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
                className="mt-2"
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-primary/70">To</Label>
              <Input
                type="date"
                data-testid="filter-date-to"
                value={filters.date_to}
                onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
                className="mt-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <KPI
            icon={<Users className="w-5 h-5" />}
            label="Total responses"
            value={data?.total ?? "—"}
            testid="kpi-total"
          />
          <KPI
            icon={<Star className="w-5 h-5" />}
            label="Overall average"
            value={data ? `${data.overall_average}/5` : "—"}
            testid="kpi-overall"
          />
          <KPI
            icon={<BookOpen className="w-5 h-5" />}
            label="Subjects covered"
            value={data?.subject_averages?.length ?? "—"}
            testid="kpi-subjects"
          />
          <KPI
            icon={<TrendingUp className="w-5 h-5" />}
            label="Active courses"
            value={data?.course_distribution?.length ?? "—"}
            testid="kpi-courses"
          />
        </div>

        {/* Charts row */}
        <div className="grid lg:grid-cols-2 gap-5 mb-8">
          <Card className="border-border" data-testid="chart-pie">
            <CardContent className="p-6">
              <h3 className="font-heading text-lg text-primary mb-4">Course distribution</h3>
              <div className="h-72">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={data?.course_distribution || []}
                      dataKey="count"
                      nameKey="course"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label
                    >
                      {(data?.course_distribution || []).map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border" data-testid="chart-bar">
            <CardContent className="p-6">
              <h3 className="font-heading text-lg text-primary mb-4">
                Average ratings · campus
              </h3>
              <div className="h-72">
                <ResponsiveContainer>
                  <BarChart data={genBarData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e7e0cf" />
                    <XAxis dataKey="metric" stroke="#4B6584" />
                    <YAxis domain={[0, 5]} stroke="#4B6584" />
                    <Tooltip />
                    <Bar dataKey="value" fill="#C9A227" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border mb-8" data-testid="chart-line">
          <CardContent className="p-6">
            <h3 className="font-heading text-lg text-primary mb-4">Submission trend</h3>
            <div className="h-64">
              {(data?.trend || []).length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  No submissions yet — the trend chart will populate as responses arrive.
                </div>
              ) : (
                <ResponsiveContainer>
                  <LineChart data={data?.trend || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e7e0cf" />
                    <XAxis dataKey="date" stroke="#4B6584" />
                    <YAxis stroke="#4B6584" allowDecimals={false} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#0F2557"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: "#C9A227" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Subject table */}
        <Card className="border-border" data-testid="subject-table">
          <CardContent className="p-0">
            <div className="p-6 border-b border-border">
              <h3 className="font-heading text-lg text-primary">Subject-wise averages</h3>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead className="text-right">Teaching</TableHead>
                    <TableHead className="text-right">Clarity</TableHead>
                    <TableHead className="text-right">Materials</TableHead>
                    <TableHead className="text-right">Responses</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.subject_averages || []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                        No feedback yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.subject_averages.map((s, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium text-primary">{s.subject}</TableCell>
                        <TableCell className="text-right">{s.teaching}</TableCell>
                        <TableCell className="text-right">{s.clarity}</TableCell>
                        <TableCell className="text-right">{s.materials}</TableCell>
                        <TableCell className="text-right">
                          <span className="text-xs bg-secondary/15 text-secondary px-2 py-1 rounded-full font-semibold">
                            {s.responses}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {loading && (
          <div className="fixed bottom-6 right-6 bg-primary text-white px-4 py-2 rounded-full shadow-lg text-xs">
            Loading…
          </div>
        )}
      </main>
    </div>
  );
};

const KPI = ({ icon, label, value, testid }) => (
  <Card className="border-border hover:-translate-y-0.5 transition-transform" data-testid={testid}>
    <CardContent className="p-5">
      <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
        <div className="w-8 h-8 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center">
          {icon}
        </div>
        {label}
      </div>
      <div className="font-heading text-3xl text-primary mt-3">{value}</div>
    </CardContent>
  </Card>
);

export default AdminDashboard;
