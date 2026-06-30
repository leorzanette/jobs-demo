import { useState } from "react";
import type { JobApplication } from "../types/application";
import { StatusBadge } from "./StatusBadge";
import { PlatformBadge } from "./PlatformBadge";
import { StageProgressBadge } from "./StageProgressBadge";
import { formatDate, isUpcoming } from "../utils/stats";

interface ListViewProps {
  applications: JobApplication[];
  onSelect: (app: JobApplication) => void;
}

type SortKey = "company" | "role" | "status" | "appliedDate";

export function ListView({ applications, onSelect }: ListViewProps) {
  const [sortKey, setSortKey] = useState<SortKey>("appliedDate");
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = [...applications].sort((a, b) => {
    const av = a[sortKey] ?? "";
    const bv = b[sortKey] ?? "";
    const cmp = String(av).localeCompare(String(bv));
    return sortAsc ? cmp : -cmp;
  });

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc((v) => !v);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  function headerClass(key: SortKey) {
    return `cursor-pointer select-none hover:text-slate-900 ${sortKey === key ? "text-slate-900" : "text-slate-500"}`;
  }

  if (applications.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 py-16 text-center text-slate-500">
        Nenhuma candidatura ainda. Clique em &quot;Add Application&quot; para começar.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left">
            <th className={`px-4 py-3 font-medium ${headerClass("company")}`} onClick={() => toggleSort("company")}>Empresa</th>
            <th className={`px-4 py-3 font-medium ${headerClass("role")}`} onClick={() => toggleSort("role")}>Cargo</th>
            <th className="px-4 py-3 font-medium text-slate-500">Plataforma</th>
            <th className="px-4 py-3 font-medium text-slate-500">Etapas</th>
            <th className={`px-4 py-3 font-medium ${headerClass("status")}`} onClick={() => toggleSort("status")}>Status</th>
            <th className={`px-4 py-3 font-medium ${headerClass("appliedDate")}`} onClick={() => toggleSort("appliedDate")}>Candidatura</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((app) => (
            <tr
              key={app.id}
              onClick={() => onSelect(app)}
              className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
            >
              <td className="px-4 py-3 font-medium text-slate-900">{app.company}</td>
              <td className="px-4 py-3 text-slate-600">{app.role}</td>
              <td className="px-4 py-3">
                {app.platform ? <PlatformBadge platform={app.platform} /> : "—"}
              </td>
              <td className="px-4 py-3">
                {app.stageCurrent ? (
                  <StageProgressBadge stageCurrent={app.stageCurrent} stageTotal={app.stageTotal} />
                ) : (
                  "—"
                )}
              </td>
              <td className="px-4 py-3"><StatusBadge status={app.status} /></td>
              <td className={`px-4 py-3 ${isUpcoming(app.followUpDate) ? "font-medium text-amber-700" : "text-slate-600"}`}>
                {formatDate(app.appliedDate)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
