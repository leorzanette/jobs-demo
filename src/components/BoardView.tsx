import { useRef, useState } from "react";
import type { ApplicationStatus, JobApplication } from "../types/application";
import { STATUSES, STATUS_LABELS } from "../types/application";
import { ApplicationCard } from "./ApplicationCard";

interface BoardViewProps {
  applications: JobApplication[];
  onSelect: (app: JobApplication) => void;
  onStatusChange: (id: string, status: ApplicationStatus) => void;
}

function BoardColumn({
  status,
  items,
  onSelect,
  draggingId,
  isDropTarget,
  onDragStartCard,
  onDragEndCard,
  onDropOnColumn,
  onDragOverColumn,
  onDragLeaveColumn,
}: {
  status: ApplicationStatus;
  items: JobApplication[];
  onSelect: (app: JobApplication) => void;
  draggingId: string | null;
  isDropTarget: boolean;
  onDragStartCard: (id: string) => void;
  onDragEndCard: () => void;
  onDropOnColumn: (status: ApplicationStatus) => void;
  onDragOverColumn: (status: ApplicationStatus) => void;
  onDragLeaveColumn: (status: ApplicationStatus) => void;
}) {
  return (
    <div className="flex min-w-[260px] flex-1 flex-col">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">
          {STATUS_LABELS[status]}
        </h3>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
          {items.length}
        </span>
      </div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          onDragOverColumn(status);
        }}
        onDragLeave={(e) => {
          // Ignore leave events when moving between child cards in the same column
          const related = e.relatedTarget as Node | null;
          if (related && e.currentTarget.contains(related)) return;
          onDragLeaveColumn(status);
        }}
        onDrop={(e) => {
          e.preventDefault();
          onDropOnColumn(status);
        }}
        className={`min-h-[160px] flex-1 space-y-2 rounded-lg p-1 transition ${
          isDropTarget ? "bg-blue-50 ring-2 ring-blue-200 ring-inset" : ""
        }`}
      >
        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
            Drop here
          </p>
        ) : (
          items.map((app) => (
            <ApplicationCard
              key={app.id}
              application={app}
              onClick={onSelect}
              draggable
              isDragging={draggingId === app.id}
              onDragStart={() => onDragStartCard(app.id)}
              onDragEnd={onDragEndCard}
            />
          ))
        )}
      </div>
    </div>
  );
}

export function BoardView({
  applications,
  onSelect,
  onStatusChange,
}: BoardViewProps) {
  const columns = STATUSES.filter(
    (s) => s !== "withdrawn" && s !== "wishlist",
  );
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overStatus, setOverStatus] = useState<ApplicationStatus | null>(null);
  const dragIdRef = useRef<string | null>(null);

  function handleDragStartCard(id: string) {
    dragIdRef.current = id;
    setDraggingId(id);
  }

  function handleDragEndCard() {
    dragIdRef.current = null;
    setDraggingId(null);
    setOverStatus(null);
  }

  function handleDropOnColumn(status: ApplicationStatus) {
    const id = dragIdRef.current;
    setOverStatus(null);
    setDraggingId(null);
    dragIdRef.current = null;
    if (!id) return;

    const app = applications.find((a) => a.id === id);
    if (!app || app.status === status) return;
    onStatusChange(id, status);
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((status) => {
        const items = applications.filter((a) => a.status === status);
        return (
          <BoardColumn
            key={status}
            status={status}
            items={items}
            onSelect={onSelect}
            draggingId={draggingId}
            isDropTarget={overStatus === status}
            onDragStartCard={handleDragStartCard}
            onDragEndCard={handleDragEndCard}
            onDropOnColumn={handleDropOnColumn}
            onDragOverColumn={setOverStatus}
            onDragLeaveColumn={(left) => {
              setOverStatus((current) => (current === left ? null : current));
            }}
          />
        );
      })}
    </div>
  );
}
