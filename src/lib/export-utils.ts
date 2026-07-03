export async function exportReport(options: {
  title?: string;
  sections?: string[];
  format?: string;
}) {
  const res = await fetch('/api/orbitgate/export-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });
  if (!res.ok) throw new Error('Export failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const ext = options.format === 'txt' ? 'txt' : 'html';
  a.download = `orbitgate-report-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.${ext}`;
  a.click();
  URL.revokeObjectURL(url);
}
