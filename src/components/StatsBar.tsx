import type { AppStats } from "../utils/stats";

interface StatsBarProps {
  stats: AppStats;
}

export function StatsBar({ stats }: StatsBarProps) {
  const cards = [
    { label: "Total", value: stats.total.toString() },
    { label: "Active", value: stats.active.toString(), hint: "Applied + Interview" },
    { label: "Interviews", value: stats.interviews.toString() },
    {
      label: "Response rate",
      value: stats.responseRate !== null ? `${stats.responseRate}%` : "—",
      hint: "Interview or Offer / Applied+",
    },
  ];

  return (
    <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">{card.label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{card.value}</p>
          {card.hint && <p className="mt-1 text-xs text-slate-400">{card.hint}</p>}
        </div>
      ))}
    </div>
  );
}
