import { ORDER_ALARM_BASE64 } from './orderSoundData';

// Sound manager using the user-provided exact ringtone audio
class SoundManager {
  private audio: HTMLAudioElement | null = null;
  private ctx: AudioContext | null = null;
  private isUnlocked = false;
  private stopTimer: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const unlock = () => {
        this.unlockAudio();
        if (this.isUnlocked) {
          window.removeEventListener('click', unlock);
          window.removeEventListener('keydown', unlock);
          window.removeEventListener('touchstart', unlock);
        }
      };
      window.addEventListener('click', unlock, { passive: true });
      window.addEventListener('keydown', unlock, { passive: true });
      window.addEventListener('touchstart', unlock, { passive: true });

      // Preload the user's provided audio
      this.initAudioElement();
    }
  }

  private initAudioElement() {
    try {
      if (!this.audio && typeof Audio !== 'undefined') {
        // Use embedded base64 data URI for 100% instant and offline-reliable playback
        this.audio = new Audio(ORDER_ALARM_BASE64);
        this.audio.preload = 'auto';
        this.audio.volume = 1.0;
      }
    } catch (e) {
      console.warn('Could not initialize HTMLAudioElement:', e);
    }
  }

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
  }

  unlockAudio() {
    try {
      this.initAudioElement();
      this.initContext();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      this.isUnlocked = true;
    } catch (e) {
      // ignore
    }
  }

  // Plays the exact provided sound for ~3 seconds
  play3SecondOrderAlarm() {
    try {
      this.initAudioElement();

      if (this.audio) {
        // Clear any previous scheduled stop
        if (this.stopTimer) {
          clearTimeout(this.stopTimer);
          this.stopTimer = null;
        }

        this.audio.pause();
        this.audio.currentTime = 0;
        this.audio.volume = 1.0;

        const playPromise = this.audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              // Enforce 3-second duration exactly per requirement
              this.stopTimer = setTimeout(() => {
                if (this.audio) {
                  this.audio.pause();
                  this.audio.currentTime = 0;
                }
              }, 3000);
            })
            .catch((err) => {
              console.warn('HTMLAudioElement play interrupted, trying fallback:', err);
              this.playWebAudioFallback();
            });
        }
      } else {
        this.playWebAudioFallback();
      }
    } catch (e) {
      console.warn('Audio alert error:', e);
      this.playWebAudioFallback();
    }
  }

  // Alias for backward compatibility & customer tracking notifications
  playOrderAlert() {
    this.play3SecondOrderAlarm();
  }

  // Dedicated clearly noticeable bell chime alert for customer bill requests
  playBillRequestAlert() {
    try {
      this.play3SecondOrderAlarm();
    } catch (e) {
      // fallback
    }

    // Simultaneously play distinct high-pitched bell chime sequence for guaranteed notification notice
    try {
      this.initContext();
      if (this.ctx) {
        if (this.ctx.state === 'suspended') {
          this.ctx.resume();
        }
        const now = this.ctx.currentTime;
        const notes = [
          { f: 880, start: 0, dur: 0.35 },    // A5
          { f: 1174.66, start: 0.22, dur: 0.4 }, // D6
          { f: 1760, start: 0.45, dur: 0.8 },   // A6
          { f: 880, start: 1.2, dur: 0.35 },
          { f: 1174.66, start: 1.42, dur: 0.4 },
          { f: 1760, start: 1.65, dur: 1.0 },
        ];
        notes.forEach(({ f, start, dur }) => {
          const osc = this.ctx!.createOscillator();
          const gain = this.ctx!.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now + start);
          gain.gain.setValueAtTime(0.45, now + start);
          gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);
          osc.connect(gain);
          gain.connect(this.ctx!.destination);
          osc.start(now + start);
          osc.stop(now + start + dur + 0.05);
        });
      }
    } catch (e) {
      // ignore
    }
  }

  // Subtle click sound
  playClick() {
    try {
      this.initContext();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(580, now);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    } catch (e) {
      // ignore
    }
  }

  private playWebAudioFallback() {
    try {
      this.initContext();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      const now = this.ctx.currentTime;
      const bursts = [0, 0.75, 1.5, 2.25];
      bursts.forEach((offset, idx) => {
        const burstStart = now + offset;
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(idx % 2 === 0 ? 1046.5 : 1318.5, burstStart);
        gain.gain.setValueAtTime(0.4, burstStart);
        gain.gain.exponentialRampToValueAtTime(0.001, burstStart + 0.6);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(burstStart);
        osc.stop(burstStart + 0.65);
      });
    } catch (e) {
      // ignore
    }
  }
}

export const sounds = new SoundManager();
