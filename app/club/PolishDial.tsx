"use client";

export function PolishDial({
  points,
  nextRewardAt,
}: {
  points: number;
  nextRewardAt: number;
}) {
  const size = 220;
  const stroke = 14;
  const radius = (size - stroke) / 2;
  // Automotive gauge sweep: 270° (like a tachometer face), not a full circle —
  // this is the brief's "black/white/grey + brand green" translated into the
  // one signature element the customer screen is built around.
  const sweepDeg = 270;
  const circumference = (sweepDeg / 360) * 2 * Math.PI * radius;
  const progress = Math.min(points / nextRewardAt, 1);
  const offset = circumference * (1 - progress);

  return (
    <div className="relative flex flex-col items-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-[135deg]"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#2A2D2E"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${2 * Math.PI * radius}`}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#2FBF71"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${2 * Math.PI * radius}`}
          strokeDashoffset={offset}
          className="dial-arc"
          style={
            {
              "--dial-full": circumference,
              "--dial-offset": offset,
            } as React.CSSProperties
          }
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-display font-bold tabular-nums">{points}</span>
        <span className="text-fog text-xs tracking-wide uppercase mt-1">points</span>
        <span className="text-polish text-xs mt-3">{nextRewardAt - points} to next reward</span>
      </div>
    </div>
  );
}
