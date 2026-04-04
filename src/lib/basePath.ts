/**
 * Returns the basePath configured in next.config.mjs.
 * In GitHub Pages: '/calabouco-da-morte'
 * In local/ngrok: '' (empty)
 */
export const basePath = process.env.__NEXT_ROUTER_BASEPATH || '';

/** Prefix a public asset path with basePath */
export function asset(path: string): string {
  if (!basePath) return path;
  if (path.startsWith(basePath)) return path;
  return `${basePath}${path}`;
}
