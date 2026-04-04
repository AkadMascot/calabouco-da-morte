export function registerServiceWorker() {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;
  
  window.addEventListener('load', () => {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
    navigator.serviceWorker.register(`${basePath}/sw.js`).catch(() => {
      // SW registration failed — app works fine without it
    });
  });
}
