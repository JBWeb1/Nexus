export async function downloadFile(path: string, filename: string) {
  const res = await fetch(`/api${path}`, { credentials: "same-origin" });
  if (!res.ok) { let msg = "Download failed"; try { msg = (await res.json()).error || msg; } catch {} throw new Error(msg); }
  const url = URL.createObjectURL(await res.blob()); const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
}
