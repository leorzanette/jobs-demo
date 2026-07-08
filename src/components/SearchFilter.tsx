import type { ApplicationStatus } from "../types/application";
import { STATUSES, STATUS_LABELS } from "../types/application";
import type { GmailStatus } from "../types/gmail";
import { gmailConnectUrl } from "../utils/api";

interface SearchFilterProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: ApplicationStatus | "all";
  onStatusFilterChange: (value: ApplicationStatus | "all") => void;
  view: "board" | "list";
  onViewChange: (view: "board" | "list") => void;
  onAdd: () => void;
  gmailStatus: GmailStatus | null;
  gmailSyncing: boolean;
  onGmailSync: () => void;
  onGmailDisconnect: () => void;
  onOpenSuggestions: () => void;
}

export function SearchFilter({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  view,
  onViewChange,
  onAdd,
  gmailStatus,
  gmailSyncing,
  onGmailSync,
  onGmailDisconnect,
  onOpenSuggestions,
}: SearchFilterProps) {
  const connected = gmailStatus?.connected ?? false;
  const pendingCount = gmailStatus?.pendingCount ?? 0;

  return (
    <header className="mb-6">
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Job Application Tracker</h1>
          <p className="text-sm text-slate-500">Track your pipeline from applied to offer</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!connected ? (
            <a
              href={gmailConnectUrl()}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Connect Gmail
            </a>
          ) : (
            <>
              <button
                type="button"
                onClick={onGmailSync}
                disabled={gmailSyncing}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {gmailSyncing ? "Syncing…" : "Sync Gmail"}
              </button>
              <button
                type="button"
                onClick={onOpenSuggestions}
                className="relative rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Suggestions
                {pendingCount > 0 && (
                  <span className="ml-1.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-blue-600 px-1.5 text-xs font-semibold text-white">
                    {pendingCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={onGmailDisconnect}
                className="rounded-lg px-2 py-2 text-sm text-slate-500 hover:text-slate-800"
                title="Disconnect Gmail"
              >
                Disconnect
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onAdd}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Add Application
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          placeholder="Search company, role, notes..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value as ApplicationStatus | "all")}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        <div className="flex rounded-lg border border-slate-300 p-0.5">
          <button
            type="button"
            onClick={() => onViewChange("board")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${view === "board" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}
          >
            Board
          </button>
          <button
            type="button"
            onClick={() => onViewChange("list")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${view === "list" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}
          >
            List
          </button>
        </div>
      </div>
    </header>
  );
}
