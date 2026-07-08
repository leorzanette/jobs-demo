import { useMemo, useState } from "react";
import type { ApplicationStatus, JobApplication } from "./types/application";
import { useApplications } from "./hooks/useApplications";
import { useGmail } from "./hooks/useGmail";
import { computeStats } from "./utils/stats";
import { SearchFilter } from "./components/SearchFilter";
import { StatsBar } from "./components/StatsBar";
import { BoardView } from "./components/BoardView";
import { ListView } from "./components/ListView";
import { ApplicationModal } from "./components/ApplicationModal";
import { SuggestionQueue } from "./components/SuggestionQueue";
import { GmailRulesSettings } from "./components/GmailRulesSettings";
import { DemoBanner } from "./components/DemoBanner";
import { isDemoMode } from "./demo/isDemoMode";

function filterApplications(
  applications: JobApplication[],
  search: string,
  statusFilter: ApplicationStatus | "all",
): JobApplication[] {
  const q = search.trim().toLowerCase();
  return applications.filter((app) => {
    if (statusFilter !== "all" && app.status !== statusFilter) return false;
    if (!q) return true;
    return (
      app.company.toLowerCase().includes(q) ||
      app.role.toLowerCase().includes(q) ||
      (app.notes?.toLowerCase().includes(q) ?? false)
    );
  });
}

export default function App() {
  const {
    applications,
    loading,
    error,
    add,
    update,
    updateStatus,
    remove,
    patchLocal,
    retry,
  } = useApplications();
  const gmail = useGmail(patchLocal);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "all">("all");
  const [view, setView] = useState<"board" | "list">("board");
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<JobApplication | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);

  const filtered = useMemo(
    () => filterApplications(applications, search, statusFilter),
    [applications, search, statusFilter],
  );

  const stats = useMemo(() => computeStats(applications), [applications]);

  function openAdd() {
    setSelected(null);
    setActionError(null);
    setModalOpen(true);
  }

  function openEdit(app: JobApplication) {
    setSelected(app);
    setActionError(null);
    setModalOpen(true);
  }

  async function handleSave(
    data: Omit<JobApplication, "id" | "createdAt" | "updatedAt">,
  ) {
    setSaving(true);
    setActionError(null);
    try {
      if (selected) {
        await update(selected.id, data);
      } else {
        await add(data);
      }
      setModalOpen(false);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setSaving(true);
    setActionError(null);
    try {
      await remove(id);
      setModalOpen(false);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(id: string, status: ApplicationStatus) {
    setActionError(null);
    try {
      await updateStatus(id, status);
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : "Failed to update status",
      );
    }
  }

  async function handleGmailConnect() {
    setActionError(null);
    try {
      await gmail.connect();
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : "Gmail connection failed",
      );
    }
  }

  async function handleGmailSync() {
    setActionError(null);
    try {
      await gmail.sync();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Gmail sync failed");
    }
  }

  async function handleGmailDisconnect() {
    setActionError(null);
    try {
      await gmail.disconnect();
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : "Failed to disconnect Gmail",
      );
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-600">Loading applications...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-4">
        <p className="text-center text-red-600">{error}</p>
        <button
          type="button"
          onClick={() => void retry()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const bannerError = actionError ?? gmail.error;

  return (
    <div className="min-h-screen bg-slate-50">
      {isDemoMode && <DemoBanner />}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <SearchFilter
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          view={view}
          onViewChange={setView}
          onAdd={openAdd}
          gmailStatus={gmail.status}
          gmailSyncing={gmail.syncing}
          onGmailConnect={() => void handleGmailConnect()}
          onGmailSync={() => void handleGmailSync()}
          onGmailDisconnect={() => void handleGmailDisconnect()}
          onOpenSuggestions={() => {
            gmail.openQueue("pending");
          }}
          onOpenSettings={() => setRulesOpen(true)}
        />
        <StatsBar stats={stats} />
        {bannerError && !modalOpen && !gmail.queueOpen && !rulesOpen && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {bannerError}
          </div>
        )}
        {view === "board" ? (
          <BoardView
            applications={filtered}
            onSelect={openEdit}
            onStatusChange={handleStatusChange}
          />
        ) : (
          <ListView applications={filtered} onSelect={openEdit} />
        )}
      </div>
      {modalOpen && (
        <ApplicationModal
          key={selected?.id ?? "new"}
          application={selected}
          isOpen={modalOpen}
          saving={saving}
          error={actionError}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
          onDelete={selected ? handleDelete : undefined}
        />
      )}
      <SuggestionQueue
        open={gmail.queueOpen}
        view={gmail.view}
        suggestions={gmail.suggestions}
        history={gmail.history}
        historyLoading={gmail.historyLoading}
        actingId={gmail.actingId}
        error={gmail.error}
        onClose={() => gmail.setQueueOpen(false)}
        onShowHistory={() => gmail.showHistory()}
        onShowPending={() => gmail.showPending()}
        onClearAll={() => void gmail.clearAll()}
        onAccept={(id) => void gmail.accept(id)}
        onDismiss={(id) => void gmail.dismiss(id)}
        onUpdateHistory={(id, payload) => void gmail.updateHistoryItem(id, payload)}
      />
      <GmailRulesSettings
        open={rulesOpen}
        onClose={() => setRulesOpen(false)}
      />
    </div>
  );
}
