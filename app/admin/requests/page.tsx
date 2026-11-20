import { updateRequest } from "@/app/actions";
import { ActionDialog } from "@/app/ui/ActionDialog";
import { getRequests } from "@/lib/data";
import { when } from "@/lib/format";
import { REQUEST_STATUSES, type RequestStatus } from "@/lib/types";

const TONE: Record<RequestStatus, string> = {
  new: "var(--accent)",
  seen: "var(--muted)",
  ordered: "var(--warn)",
  done: "var(--success)",
  rejected: "var(--danger)",
};

export default async function RequestsPage() {
  const requests = await getRequests();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Requests</h1>
      <div className="card overflow-x-auto p-0">
        <table className="table table-stack">
          <thead>
            <tr><th>When</th><th>Branch / Sec</th><th>Mentor</th><th>Message</th><th>File</th><th>Status</th><th>Note</th><th /></tr>
          </thead>
          <tbody>
            {requests.map((r) => {
              const file = r.file_name && (
                <a href={`/admin/requests/${r.id}/file`} className="underline">{r.file_name}</a>
              );
              return (
                <tr key={r.id}>
                  <td data-label="When" className="whitespace-nowrap">{when(r.created_at)}</td>
                  <td data-label="Branch / Sec">{r.branch} · {r.section}</td>
                  <td data-label="Mentor">{r.mentor}</td>
                  <td data-label="Message" className="stack-full max-w-xs truncate max-md:max-w-none" title={r.message}>{r.message}</td>
                  <td data-label="File" className="break-all">{file ?? "—"}</td>
                  <td data-label="Status"><span className="chip capitalize" style={{ "--c": TONE[r.status] } as React.CSSProperties}>{r.status}</span></td>
                  <td data-label="Note" className="max-w-[12rem] truncate text-muted max-md:max-w-none">{r.admin_note}</td>
                  <td className="max-md:self-end">
                    <ActionDialog label="Open" title={`Request · ${r.branch} ${r.section}`} action={updateRequest}>
                      <input type="hidden" name="id" value={r.id} />
                      <p className="text-sm text-muted">Mentor: {r.mentor} · {when(r.created_at)}</p>
                      <p className="max-h-60 overflow-y-auto rounded-lg bg-surface-2 p-3 text-sm whitespace-pre-wrap">{r.message || "(no message)"}</p>
                      {file && <p className="text-sm">Attachment: {file}</p>}
                      <div>
                        <label className="label" htmlFor={`status-${r.id}`}>Status</label>
                        <select id={`status-${r.id}`} name="status" defaultValue={r.status} className="input capitalize">
                          {REQUEST_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="label" htmlFor={`note-${r.id}`}>Admin note</label>
                        <textarea id={`note-${r.id}`} name="admin_note" defaultValue={r.admin_note} rows={3} className="input" />
                      </div>
                    </ActionDialog>
                  </td>
                </tr>
              );
            })}
            {requests.length === 0 && (
              <tr><td colSpan={8} className="stack-full py-6 text-center text-muted">No requests yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
