import type { ApplicationStatus, JobApplication } from "../types/application";
import { STATUSES, STATUS_LABELS } from "../types/application";

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

const emptyForm = {
  company: "",
  role: "",
  status: "wishlist" as ApplicationStatus,
  appliedDate: "",
  followUpDate: "",
  interviewDate: "",
  jobUrl: "",
  notes: "",
};

export function ApplicationModal({
  application,
  isOpen,
  saving = false,
  error,
  onClose,
  onSave,
  onDelete,
}: ApplicationModalProps) {
  if (!isOpen) return null;

  const initial = application
    ? {
        company: application.company,
        role: application.role,
        status: application.status,
        appliedDate: application.appliedDate ?? "",
        followUpDate: application.followUpDate ?? "",
        interviewDate: application.interviewDate ?? "",
        jobUrl: application.jobUrl ?? "",
        notes: application.notes ?? "",
      }
    : emptyForm;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const company = (fd.get("company") as string).trim();
    const role = (fd.get("role") as string).trim();
    if (!company || !role) return;

    void onSave({
      company,
      role,
      status: fd.get("status") as ApplicationStatus,
      appliedDate: (fd.get("appliedDate") as string) || undefined,
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
          {application ? "Edit Application" : "Add Application"}
        </h2>
        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
        <form key={application?.id ?? "new"} onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Company *</label>
            <input name="company" defaultValue={initial.company} required disabled={saving} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Role *</label>
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Applied</label>
              <input name="appliedDate" type="date" defaultValue={initial.appliedDate} disabled={saving} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Follow-up</label>
              <input name="followUpDate" type="date" defaultValue={initial.followUpDate} disabled={saving} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Interview</label>
              <input name="interviewDate" type="date" defaultValue={initial.interviewDate} disabled={saving} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Job URL</label>
            <input name="jobUrl" type="url" defaultValue={initial.jobUrl} placeholder="https://..." disabled={saving} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
            <textarea name="notes" rows={3} defaultValue={initial.notes} disabled={saving} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100" />
          </div>
          <div className="flex items-center justify-between pt-2">
            <div>
              {application && onDelete && (
                <button type="button" disabled={saving} onClick={() => void onDelete(application.id)} className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50">Delete</button>
              )}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} disabled={saving} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
              <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}