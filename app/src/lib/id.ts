export function uid(prefix = ''): string {
  const r = () => Math.random().toString(36).slice(2, 10);
  return `${prefix}${Date.now().toString(36)}-${r()}${r()}`;
}
