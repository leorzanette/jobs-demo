import { useMemo, useState } from "react";
import type { ApplicationStatus, JobApplication } from "./types/application";
import { useApplications } from "./hooks/useApplications";
import { computeStats } from "./utils/stats";
import { SearchFilter } from "./components/SearchFilter";
import { StatsBar } from "./components/StatsBar";
import { BoardView } from "./components/BoardView";
import { ListView } from "./components/ListView";
import { ApplicationModal } from "./components/ApplicationModal";

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
  const { applications, add, update, remove } = useApplications();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "all">("all");
  const [view, setView] = useState<"board" | "list">("board");
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<JobApplication | null>(null);

  const filtered = useMemo(
    () => filterApplications(applications, search, statusFilter),
    [applications, search, statusFilter],
  );

  const stats = useMemo(() => computeStats(applications), [applications]);

  function openAdd() {
    setSelected(null);
    setModalOpen(true);
  }

  function openEdit(app: JobApplication) {
    setSelected(app);
    setModalOpen(true);
  }

  function handleSave(data: Omit<JobApplication, "id" | "createdAt" | "updatedAt">) {
    if (selected) {
      update(selected.id, data);
    } else {
      add(data);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <SearchFilter
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          view={view}
          onViewChange={setView}
          onAdd={openAdd}
        />
        <StatsBar stats={stats} />
        {view === "board" ? (
          <BoardView applications={filtered} onSelect={openEdit} />
        ) : (
          <ListView applications={filtered} onSelect={openEdit} />
        )}
      </div>
      <ApplicationModal
        application={selected}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        onDelete={selected ? remove : undefined}
      />
    </div>
  );
}
