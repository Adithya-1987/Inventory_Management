import { requireAdmin } from "@/lib/auth";
import { getRequestFile } from "@/lib/data";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const file = await getRequestFile((await params).id);
  if (!file) return new Response("File not found", { status: 404 });
  return new Response(file.bytes, {
    headers: {
      // Always download, never render inline: uploads are untrusted (e.g. HTML disguised as an image).
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
