/**
 * Global music player singleton.
 * Lives outside React — survives page transitions, re-renders, etc.
 * 
 * Usage from any component:
 *   import { musicPlayer } from '@/lib/musicPlayer';
 *   musicPlayer.play('game');  // plays /audio/music/game.mp3
 *   musicPlayer.stop();
 * 
 * To add a new track: drop an mp3 in public/audio/music/
 * and call musicPlayer.play('filename-without-extension')
 */

import { asset } from '@/lib/basePath';

// Volume per track (default: 0.12)
const VOLUMES: Record<string, number> = {
  menu: 0.15,
  intro: 0.10,
  create: 0.15,
  game: 0.12,
};

class MusicPlayer {
  private audio: HTMLAudioElement | null = null;
  private currentTrack: string | null = null;
  private targetVolume = 0.12;
  private fadeFrame: number | null = null;
  private unlocked = false;
  private pending: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.setupUnlock();
    }
  }

  private setupUnlock() {
    const handler = () => {
      this.unlocked = true;
      console.log('[Music] User interaction detected — audio unlocked');
      if (this.pending) {
        this.doPlay(this.pending);
        this.pending = null;
      }
      window.removeEventListener('click', handler);
      window.removeEventListener('touchstart', handler);
      window.removeEventListener('keydown', handler);
    };
    window.addEventListener('click', handler);
    window.addEventListener('touchstart', handler);
    window.addEventListener('keydown', handler);
  }

  private getAudio(): HTMLAudioElement {
    if (!this.audio) {
      this.audio = document.createElement('audio');
      this.audio.id = 'bg-music';
      this.audio.loop = true;
      this.audio.volume = 0;
      this.audio.setAttribute('data-bgmusic', 'true');
      // Add to DOM so it's findable and stable
      document.body.appendChild(this.audio);
      console.log('[Music] Audio element created and appended to DOM');
    }
    return this.audio;
  }

  play(track: string) {
    if (this.currentTrack === track) {
      // Same track — ensure it's playing
      const audio = this.audio;
      if (audio && audio.paused && this.unlocked) {
        audio.play().catch(() => {});
      }
      return;
    }

    console.log(`[Music] Requested track: ${track}`);
    
    if (!this.unlocked) {
      this.pending = track;
      this.currentTrack = track;
      console.log('[Music] Waiting for user interaction...');
      return;
    }

    this.doPlay(track);
  }

  private doPlay(track: string) {
    const audio = this.getAudio();
    const src = asset(`/audio/music/${track}.mp3`);
    const vol = VOLUMES[track] ?? 0.12;
    this.targetVolume = vol;

    const currentSrc = audio.src;
    const newSrc = new URL(src, window.location.href).href;

    if (currentSrc === newSrc && !audio.paused) {
      // Same file, just adjust volume
      console.log(`[Music] Same file, adjusting volume to ${vol}`);
      this.fadeTo(vol);
      this.currentTrack = track;
      return;
    }

    // Different file — fade out, switch, fade in
    if (!audio.paused && audio.volume > 0.01) {
      console.log(`[Music] Crossfading to ${track}`);
      this.fadeOut(() => {
        audio.src = src;
        audio.loop = true;
        audio.volume = 0;
        audio.play().then(() => {
          console.log(`[Music] Now playing: ${track}`);
          this.fadeIn(vol);
        }).catch(err => {
          console.warn(`[Music] Play failed for ${track}:`, err);
        });
      });
    } else {
      // Not playing — start fresh
      console.log(`[Music] Starting fresh: ${track} (src: ${src})`);
      audio.src = src;
      audio.loop = true;
      audio.volume = 0;
      audio.play().then(() => {
        console.log(`[Music] Now playing: ${track}`);
        this.fadeIn(vol);
      }).catch(err => {
        console.warn(`[Music] Play failed for ${track}:`, err);
      });
    }

    this.currentTrack = track;
  }

  stop() {
    if (this.fadeFrame) cancelAnimationFrame(this.fadeFrame);
    this.fadeOut(() => {
      if (this.audio) this.audio.pause();
    });
    this.currentTrack = null;
  }

  setVolume(vol: number) {
    this.targetVolume = vol;
    if (this.audio && !this.audio.paused) {
      this.fadeTo(vol);
    }
  }

  private fadeIn(target: number) {
    if (this.fadeFrame) cancelAnimationFrame(this.fadeFrame);
    const audio = this.getAudio();
    const step = () => {
      const next = Math.min(audio.volume + 0.005, target);
      audio.volume = Math.max(0, Math.min(1, next));
      if (audio.volume < target - 0.001) {
        this.fadeFrame = requestAnimationFrame(step);
      } else {
        this.fadeFrame = null;
      }
    };
    this.fadeFrame = requestAnimationFrame(step);
  }

  private fadeOut(then?: () => void) {
    if (this.fadeFrame) cancelAnimationFrame(this.fadeFrame);
    const audio = this.audio;
    if (!audio) { then?.(); return; }
    
    const step = () => {
      audio.volume = Math.max(0, audio.volume - 0.01);
      if (audio.volume > 0.01) {
        this.fadeFrame = requestAnimationFrame(step);
      } else {
        audio.volume = 0;
        this.fadeFrame = null;
        then?.();
      }
    };
    this.fadeFrame = requestAnimationFrame(step);
  }

  private fadeTo(target: number) {
    if (this.fadeFrame) cancelAnimationFrame(this.fadeFrame);
    const audio = this.getAudio();
    const step = () => {
      const diff = target - audio.volume;
      if (Math.abs(diff) < 0.005) {
        audio.volume = Math.max(0, Math.min(1, target));
        this.fadeFrame = null;
        return;
      }
      audio.volume = Math.max(0, Math.min(1, audio.volume + diff * 0.05));
      this.fadeFrame = requestAnimationFrame(step);
    };
    this.fadeFrame = requestAnimationFrame(step);
  }

  get isPlaying(): boolean {
    return !!this.audio && !this.audio.paused;
  }

  get track(): string | null {
    return this.currentTrack;
  }
}

// Singleton — one instance for the entire app
export const musicPlayer = typeof window !== 'undefined' 
  ? new MusicPlayer() 
  : (null as unknown as MusicPlayer);
