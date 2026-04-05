'use client';

import { MusicProvider } from '@/contexts/MusicContext';

export default function Providers({ children }: { children: React.ReactNode }) {
  return <MusicProvider>{children}</MusicProvider>;
}
