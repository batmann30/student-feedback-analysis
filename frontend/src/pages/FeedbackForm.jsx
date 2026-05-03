import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import Header from "../components/Header";
import StepIndicator from "../components/StepIndicator";
import StarRating from "../components/StarRating";
import { api, formatApiError } from "../lib/api";

const GEN_KEYS = [
  { key: "campus", label: "Campus Infrastructure" },
  { key: "staff", label: "Support Staff" },
  { key: "management", label: "Management & Administration" },
  { key: "facilities", label: "Facilities (Library / Labs / Sports)" },
  { key: "placements", label: "Placement Support" },
];

const FeedbackForm = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [courseData, setCourseData] = useState({});
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState({
    course: "",
    year: "",
    semester: "",
    roll_no: "",
    student_name: "",
    comments: "",
  });
  const [subjects, setSubjects] = useState([]);
  const [subjectRatings, setSubjectRatings] = useState({});
  const [generalRatings, setGeneralRatings] = useState({
    campus: 0, staff: 0, management: 0, facilities: 0, placements: 0,
  });

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/courses");
        const cData = data?.courses || {};
        setCourseData(cData);
        setCourses(Object.keys(cData));
      } catch (e) {
        toast.error(formatApiError(e));
      }
    })();
  }, []);

  const years = useMemo(
    () => (form.course && courseData[form.course] ? Object.keys(courseData[form.course]) : []),
    [form.course, courseData]
  );
  const sems = useMemo(
    () =>
      form.course && form.year && courseData[form.course]?.[form.year]
        ? courseData[form.course][form.year]
        : [],
    [form.course, form.year, courseData]
  );

  const loadSubjects = async () => {
    if (!form.course || !form.year || !form.semester) return;
    setLoading(true);
    try {
      const { data } = await api.get("/subjects", {
        params: { course: form.course, year: form.year, semester: form.semester },
      });
      setSubjects(data.subjects || []);
      const init = {};
      (data.subjects || []).forEach((s) => {
        init[s] = subjectRatings[s] || { teaching: 0, clarity: 0, materials: 0 };
      });
      setSubjectRatings(init);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  const canNext = () => {
    if (step === 1) return form.course && form.year && form.semester;
    if (step === 2)
      return (
        subjects.length > 0 &&
        subjects.every((s) => {
          const r = subjectRatings[s];
          return r && r.teaching > 0 && r.clarity > 0 && r.materials > 0;
        })
      );
    if (step === 3) return GEN_KEYS.every((g) => generalRatings[g.key] > 0);
    return true;
  };

  const next = async () => {
    if (!canNext()) {
      toast.error("Please complete all required ratings before continuing.");
      return;
    }
    if (step === 1 && subjects.length === 0) {
      await loadSubjects();
    }
    setStep((s) => Math.min(4, s + 1));
  };
  const back = () => setStep((s) => Math.max(1, s - 1));

  const submit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        course: form.course,
        year: form.year,
        semester: form.semester,
        roll_no: form.roll_no || null,
        student_name: form.student_name || null,
        comments: form.comments || null,
        subject_ratings: subjects.map((s) => ({ subject: s, ...subjectRatings[s] })),
        general_ratings: generalRatings,
      };
      await api.post("/feedback", payload);
      setSubmitted(true);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-2xl mx-auto px-6 py-24 text-center" data-testid="feedback-success">
          <div className="w-16 h-16 rounded-full bg-secondary/15 text-secondary mx-auto flex items-center justify-center mb-6">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <h1 className="font-heading text-4xl text-primary mb-3">Thank you!</h1>
          <p className="text-muted-foreground leading-relaxed mb-8">
            Your feedback has been recorded. Honest responses like yours help East West keep raising the bar each
            semester.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button
              data-testid="success-home-btn"
              onClick={() => navigate("/")}
              className="bg-primary text-white rounded-full px-6"
            >
              Back to home
            </Button>
            <Button
              data-testid="success-another-btn"
              variant="outline"
              onClick={() => {
                setSubmitted(false);
                setStep(1);
                setSubjects([]);
                setSubjectRatings({});
                setGeneralRatings({ campus: 0, staff: 0, management: 0, facilities: 0, placements: 0 });
                setForm({ course: "", year: "", semester: "", roll_no: "", student_name: "", comments: "" });
              }}
              className="rounded-full px-6"
            >
              Submit another response
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-3xl mx-auto px-6 py-12" data-testid="feedback-wizard">
        <div className="mb-6">
          <div className="text-xs uppercase tracking-[0.25em] text-secondary mb-2">Student Feedback</div>
          <h1 className="font-heading text-3xl md:text-4xl text-primary">Share your honest experience</h1>
        </div>

        <StepIndicator current={step} />

        <Card className="border-border shadow-[0_4px_24px_rgba(15,37,87,0.06)]">
          <CardContent className="p-6 md:p-10 animate-fade-in-up">
            {/* Step 1 */}
            {step === 1 && (
              <div className="space-y-6" data-testid="step-1">
                <h2 className="font-heading text-2xl text-primary mb-2">Your programme</h2>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-primary/70">Course</Label>
                    <Select
                      value={form.course}
                      onValueChange={(v) => setForm({ ...form, course: v, year: "", semester: "" })}
                    >
                      <SelectTrigger data-testid="select-course" className="mt-2">
                        <SelectValue placeholder="Select course" />
                      </SelectTrigger>
                      <SelectContent>
                        {courses?.map((c) => (
                          <SelectItem key={c} value={c} data-testid={`course-opt-${c}`}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-primary/70">Year</Label>
                    <Select
                      value={form.year}
                      onValueChange={(v) => setForm({ ...form, year: v, semester: "" })}
                      disabled={!form.course}
                    >
                      <SelectTrigger data-testid="select-year" className="mt-2">
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        {years.map((y) => (
                          <SelectItem key={y} value={y} data-testid={`year-opt-${y}`}>
                            {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-primary/70">Semester</Label>
                    <Select
                      value={form.semester}
                      onValueChange={(v) => setForm({ ...form, semester: v })}
                      disabled={!form.year}
                    >
                      <SelectTrigger data-testid="select-semester" className="mt-2">
                        <SelectValue placeholder="Select semester" />
                      </SelectTrigger>
                      <SelectContent>
                        {sems.map((s) => (
                          <SelectItem key={s} value={s} data-testid={`sem-opt-${s}`}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 pt-2">
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-primary/70">
                      Roll no. (optional)
                    </Label>
                    <Input
                      data-testid="input-roll-no"
                      placeholder="e.g. EW21BCA045"
                      value={form.roll_no}
                      onChange={(e) => setForm({ ...form, roll_no: e.target.value })}
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Leave blank to submit anonymously.
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-primary/70">
                      Name (optional)
                    </Label>
                    <Input
                      data-testid="input-student-name"
                      placeholder="Your name"
                      value={form.student_name}
                      onChange={(e) => setForm({ ...form, student_name: e.target.value })}
                      className="mt-2"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <div className="space-y-8" data-testid="step-2">
                <div>
                  <h2 className="font-heading text-2xl text-primary">Rate your subjects</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Rate teaching, clarity of delivery, and study materials · 1 = Poor, 5 = Excellent.
                  </p>
                </div>
                {loading ? (
                  <div className="py-10 text-center text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading subjects…
                  </div>
                ) : (
                  <div className="space-y-6">
                    {subjects.map((s) => (
                      <div
                        key={s}
                        className="rounded-xl border border-border bg-white/60 p-5"
                        data-testid={`subject-block-${s}`}
                      >
                        <div className="font-heading text-lg text-primary mb-4">{s}</div>
                        <div className="grid md:grid-cols-3 gap-5">
                          {["teaching", "clarity", "materials"].map((k) => (
                            <div key={k}>
                              <div className="text-xs uppercase tracking-wider text-primary/70 mb-2">{k}</div>
                              <StarRating
                                testid={`rating-${s}-${k}`}
                                value={subjectRatings[s]?.[k] || 0}
                                onChange={(n) =>
                                  setSubjectRatings({
                                    ...subjectRatings,
                                    [s]: { ...(subjectRatings[s] || {}), [k]: n },
                                  })
                                }
                                size={26}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 3 */}
            {step === 3 && (
              <div className="space-y-8" data-testid="step-3">
                <div>
                  <h2 className="font-heading text-2xl text-primary">Rate your campus experience</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    How are the overall facilities and services?
                  </p>
                </div>
                <div className="space-y-5">
                  {GEN_KEYS.map((g) => (
                    <div
                      key={g.key}
                      className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4 rounded-xl border border-border bg-white/60"
                    >
                      <div className="font-body text-primary font-medium">{g.label}</div>
                      <StarRating
                        testid={`gen-${g.key}`}
                        value={generalRatings[g.key]}
                        onChange={(n) => setGeneralRatings({ ...generalRatings, [g.key]: n })}
                        size={28}
                      />
                    </div>
                  ))}
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-primary/70">
                    Additional comments (optional)
                  </Label>
                  <Textarea
                    data-testid="input-comments"
                    placeholder="Anything else you'd like to share?"
                    value={form.comments}
                    onChange={(e) => setForm({ ...form, comments: e.target.value })}
                    className="mt-2 min-h-[100px]"
                  />
                </div>
              </div>
            )}

            {/* Step 4 */}
            {step === 4 && (
              <div className="space-y-6" data-testid="step-4">
                <h2 className="font-heading text-2xl text-primary">Review & submit</h2>
                <div className="rounded-xl border border-border bg-white/60 p-5">
                  <div className="text-xs uppercase tracking-wider text-primary/70 mb-2">Programme</div>
                  <div className="font-heading text-lg text-primary">
                    {form.course} · {form.year} · {form.semester}
                  </div>
                  {form.roll_no && (
                    <div className="text-sm text-muted-foreground mt-1">Roll no: {form.roll_no}</div>
                  )}
                </div>

                <div className="rounded-xl border border-border bg-white/60 p-5">
                  <div className="text-xs uppercase tracking-wider text-primary/70 mb-3">Subject ratings</div>
                  <div className="space-y-2 text-sm">
                    {subjects.map((s) => {
                      const r = subjectRatings[s] || {};
                      return (
                        <div key={s} className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-primary font-medium">{s}</span>
                          <span className="text-muted-foreground">
                            Teaching {r.teaching}/5 · Clarity {r.clarity}/5 · Materials {r.materials}/5
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-white/60 p-5">
                  <div className="text-xs uppercase tracking-wider text-primary/70 mb-3">Campus</div>
                  <div className="grid sm:grid-cols-2 gap-2 text-sm">
                    {GEN_KEYS.map((g) => (
                      <div key={g.key} className="flex justify-between">
                        <span className="text-primary">{g.label}</span>
                        <span className="text-secondary font-semibold">
                          {generalRatings[g.key]}/5
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Nav buttons */}
            <div className="flex items-center justify-between gap-3 pt-10 mt-8 border-t border-border">
              <Button
                variant="outline"
                onClick={back}
                disabled={step === 1 || submitting}
                data-testid="btn-back"
                className="rounded-full"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              {step < 4 ? (
                <Button
                  onClick={next}
                  disabled={loading}
                  data-testid="btn-next"
                  className="bg-primary text-white rounded-full px-6 hover:bg-primary/90"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={submit}
                  disabled={submitting}
                  data-testid="btn-submit"
                  className="bg-secondary text-white rounded-full px-8 hover:bg-secondary/90"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Submit feedback
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FeedbackForm;
