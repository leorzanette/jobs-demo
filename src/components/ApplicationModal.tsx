import { useRef, useState } from "react";
import type { ApplicationStatus, JobApplication, JobPlatform } from "../types/application";
import {
  GUPY_DEFAULT_STAGE_TOTAL,
  GUPY_STAGE_HINTS,
  PLATFORMS,
  PLATFORM_LABELS,
  STATUSES,
  STATUS_LABELS,
} from "../types/application";
import { detectPlatformFromUrl } from "../utils/platform";

interface ApplicationModalProps {
  application: JobApplication | null;
  isOpen: boolean;
  saving?: boolean;
  error?: string | null;
  onClose: () => void;
  onSave: (
    data: Omit<JobApplication, "id" | "createdAt" | "updatedAt">,
  ) => void | Promise<void>;
  onDelete?: (id: string) => void | Promise<void>;
}

function todayLocalDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildInitial(application: JobApplication | null) {
  if (application) {
    return {
      company: application.company,
      role: application.role,
      status: application.status,
      platform: application.platform ?? ("" as const),
      stageCurrent: application.stageCurrent?.toString() ?? "",
      stageTotal: application.stageTotal?.toString() ?? "",
      appliedDate: application.appliedDate ?? "",
      followUpDate: application.followUpDate ?? "",
      interviewDate: application.interviewDate ?? "",
      jobUrl: application.jobUrl ?? "",
      notes: application.notes ?? "",
    };
  }
  return {
    company: "",
    role: "",
    status: "applied" as ApplicationStatus,
    platform: "" as JobPlatform | "",
    stageCurrent: "",
    stageTotal: "",
    appliedDate: todayLocalDate(),
    followUpDate: "",
    interviewDate: "",
    jobUrl: "",
    notes: "",
  };
}

export function ApplicationModal({
  application,
  isOpen,
  saving = false,
  error,
  onClose,
  onSave,
  onDelete,
}: ApplicationModalProps) {
  const platformRef = useRef<HTMLSelectElement>(null);
  const stageTotalRef = useRef<HTMLInputElement>(null);

  const initial = buildInitial(application);
  const [platform, setPlatform] = useState<JobPlatform | "">(initial.platform);
  const [stageTotal, setStageTotal] = useState(initial.stageTotal);
  const [appliedDate, setAppliedDate] = useState(initial.appliedDate);

  if (!isOpen) return null;

  function handleUrlBlur(url: string) {
    const detected = detectPlatformFromUrl(url);
    if (detected) {
      setPlatform(detected);
      if (platformRef.current) platformRef.current.value = detected;
      if (detected === "gupy" && !stageTotalRef.current?.value) {
        setStageTotal(String(GUPY_DEFAULT_STAGE_TOTAL));
        if (stageTotalRef.current) {
          stageTotalRef.current.value = String(GUPY_DEFAULT_STAGE_TOTAL);
        }
      }
    }
  }

  function applyGupyPreset() {
    setPlatform("gupy");
    if (platformRef.current) platformRef.current.value = "gupy";
    setStageTotal(String(GUPY_DEFAULT_STAGE_TOTAL));
    if (stageTotalRef.current) {
      stageTotalRef.current.value = String(GUPY_DEFAULT_STAGE_TOTAL);
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const company = (fd.get("company") as string).trim();
    const role = (fd.get("role") as string).trim();
    if (!company || !role) return;

    const platformValue = (fd.get("platform") as string) || undefined;
    const stageCurrentRaw = (fd.get("stageCurrent") as string).trim();
    const stageTotalRaw = (fd.get("stageTotal") as string).trim();

    void onSave({
      company,
      role,
      status: fd.get("status") as ApplicationStatus,
      platform: platformValue as JobPlatform | undefined,
      stageCurrent: stageCurrentRaw ? Number(stageCurrentRaw) : undefined,
      stageTotal: stageTotalRaw ? Number(stageTotalRaw) : undefined,
      appliedDate: appliedDate || undefined,
      followUpDate: (fd.get("followUpDate") as string) || undefined,
      interviewDate: (fd.get("interviewDate") as string) || undefined,
      jobUrl: (fd.get("jobUrl") as string) || undefined,
      notes: (fd.get("notes") as string) || undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          {application ? "Editar candidatura" : "Nova candidatura"}
        </h2>
        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Empresa *</label>
            <input name="company" defaultValue={initial.company} required disabled={saving} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Cargo *</label>
            <input name="role" defaultValue={initial.role} required disabled={saving} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
            <select name="status" defaultValue={initial.status} disabled={saving} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100">
              {STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">URL da vaga</label>
            <input
              name="jobUrl"
              type="url"
              defaultValue={initial.jobUrl}
              placeholder="https://..."
              disabled={saving}
              onBlur={(e) => handleUrlBlur(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100"
            />
            <p className="mt-1 text-xs text-slate-400">A plataforma é detectada automaticamente pela URL</p>
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">Plataforma</label>
              <button
                type="button"
                onClick={applyGupyPreset}
                disabled={saving}
                className="text-xs text-teal-700 hover:text-teal-800 disabled:opacity-50"
              >
                Preset Gupy (6 etapas)
              </button>
            </div>
            <select
              ref={platformRef}
              name="platform"
              value={platform}
              onChange={(e) => setPlatform(e.target.value as JobPlatform | "")}
              disabled={saving}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100"
            >
              <option value="">Não informada</option>
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Progresso no processo</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-slate-500">Etapa atual</label>
                <input
                  name="stageCurrent"
                  type="number"
                  min={1}
                  defaultValue={initial.stageCurrent}
                  placeholder="ex: 2"
                  disabled={saving}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">Total de etapas</label>
                <input
                  ref={stageTotalRef}
                  name="stageTotal"
                  type="number"
                  min={1}
                  value={stageTotal}
                  onChange={(e) => setStageTotal(e.target.value)}
                  placeholder="ex: 6"
                  disabled={saving}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100"
                />
              </div>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Exibe no card como 2/6. Gupy: {GUPY_STAGE_HINTS.join(" → ")}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Candidatura</label>
              <input
                name="appliedDate"
                type="date"
                value={appliedDate}
                onChange={(e) => setAppliedDate(e.target.value)}
                disabled={saving}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Follow-up</label>
              <input name="followUpDate" type="date" defaultValue={initial.followUpDate} disabled={saving} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Entrevista</label>
              <input name="interviewDate" type="date" defaultValue={initial.interviewDate} disabled={saving} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Notas</label>
            <textarea name="notes" rows={3} defaultValue={initial.notes} disabled={saving} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100" />
          </div>
          <div className="flex items-center justify-between pt-2">
            <div>
              {application && onDelete && (
                <button type="button" disabled={saving} onClick={() => void onDelete(application.id)} className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50">Excluir</button>
              )}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} disabled={saving} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancelar</button>
              <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">{saving ? "Salvando..." : "Salvar"}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
