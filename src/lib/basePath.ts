/**
 * Returns the basePath configured in next.config.mjs.
 * Use this for all public asset references (images, videos, audio).
 */
export const basePath = process.env.__NEXT_ROUTER_BASEPATH || '/calabouco-da-morte';

/** Prefix a public asset path with basePath */
export function asset(path: string): string {
  if (path.startsWith(basePath)) return path;
  return `${basePath}${path}`;
}
