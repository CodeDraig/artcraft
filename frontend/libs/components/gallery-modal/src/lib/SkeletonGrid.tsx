import { twMerge } from "tailwind-merge";
// ─── Skeleton loader component ────────────────────────────────────────────────
const SKELETON_COUNT = 15;

export const SkeletonGrid = ({ columns }: { columns: number }) => {
  const gapClass = columns <= 4 ? "gap-2" : columns <= 7 ? "gap-2" : "gap-0.5";
  return (
    <div className="space-y-6 p-4 animate-in fade-in duration-200">
      {/* Fake date heading */}
      <div>
        <div className="h-4 w-24 bg-white/[0.06] mb-3" />
        <div
          className={twMerge("grid", gapClass)}
          style={{
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          }}
        >
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <div key={i} className="aspect-square overflow-hidden">
              <div
                className="h-full w-full bg-white/[0.06]"
                style={{
                  animation: `pulse 1.8s ease-in-out ${i * 0.07}s infinite`,
                }}
              />
            </div>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
};
