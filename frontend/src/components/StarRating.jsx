import { useState } from "react";
import { Star } from "lucide-react";

export const StarRating = ({ value = 0, onChange, size = 32, testid = "star-rating" }) => {
  const [hover, setHover] = useState(0);
  const active = hover || value;
  return (
    <div className="flex items-center gap-1.5" data-testid={testid}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= active;
        return (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange?.(n)}
            data-testid={`${testid}-${n}`}
            className="p-1 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-secondary rounded"
            aria-label={`Rate ${n} of 5`}
          >
            <Star
              width={size}
              height={size}
              className={filled ? "text-secondary" : "text-border"}
              fill={filled ? "currentColor" : "transparent"}
              strokeWidth={1.5}
            />
          </button>
        );
      })}
      <span className="ml-3 font-heading text-primary text-lg w-6" data-testid={`${testid}-value`}>
        {value || "–"}
      </span>
    </div>
  );
};

export default StarRating;
