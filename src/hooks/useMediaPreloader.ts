import { asset } from '@/lib/basePath';
import { useEffect } from 'react';
import cinematicsData from '@/data/cinematics.json';

type SectionCinematic = { composed: string; narration?: string };

export function useMediaPreloader(nextSectionIds: number[], enabled: boolean = true) {
  const key = nextSectionIds.join(',');

  useEffect(() => {
    if (!enabled || nextSectionIds.length === 0) return;

    const links: HTMLLinkElement[] = [];

    nextSectionIds.forEach(id => {
      const sectionKey = String(id);
      const cinematic = (cinematicsData.sections as Record<string, SectionCinematic>)[sectionKey];
      if (!cinematic) return;

      // Preload video
      if (cinematic.composed) {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'video';
        link.href = asset(cinematic.composed);
        link.type = 'video/mp4';
        document.head.appendChild(link);
        links.push(link);
      }

      // Preload narration
      if (cinematic.narration) {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'audio';
        link.href = asset(cinematic.narration);
        link.type = 'audio/mpeg';
        document.head.appendChild(link);
        links.push(link);
      }

      // Preload poster
      const posterLink = document.createElement('link');
      posterLink.rel = 'preload';
      posterLink.as = 'image';
      posterLink.href = asset(`/cinematics/section-${String(id).padStart(3, '0')}-poster.webp`);
      document.head.appendChild(posterLink);
      links.push(posterLink);
    });

    return () => {
      links.forEach(link => {
        if (link.parentNode) link.parentNode.removeChild(link);
      });
    };
  }, [key, enabled]);
}
