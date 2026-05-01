import { Check } from "lucide-react";

const STEPS = ["Course", "Subjects", "General", "Review"];

export const StepIndicator = ({ current = 1 }) => {
  const pct = ((current - 1) / (STEPS.length - 1)) * 100;
  return (
    <div className="mb-10" data-testid="step-indicator">
      <div className="flex items-center justify-between relative">
        <div className="absolute top-5 left-0 w-full h-[2px] bg-border -z-10" />
        <div
          className="absolute top-5 left-0 h-[2px] bg-secondary -z-10 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
        {STEPS.map((label, i) => {
          const n = i + 1;
          const active = n === current;
          const done = n < current;
          return (
            <div key={label} className="flex flex-col items-center gap-2 bg-background px-2">
              <div
                data-testid={`step-circle-${n}`}
                className={[
                  "w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm border-2 transition-colors",
                  active && "border-secondary bg-secondary text-white shadow-md",
                  done && "border-secondary bg-white text-secondary",
                  !active && !done && "border-border bg-white text-primary/40",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {done ? <Check className="w-5 h-5" /> : n}
              </div>
              <span
                className={`text-xs uppercase tracking-wider ${
                  active ? "text-primary font-semibold" : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StepIndicator;
