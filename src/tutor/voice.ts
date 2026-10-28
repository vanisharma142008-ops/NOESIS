// Browser voice building blocks, transport-neutral: push-to-talk recording, playback of approved
// speech, and on-device read-aloud. Each reports its real state, which drives the tutor character
// (listening only while a microphone track is live; speaking only while audio is actually playing).
import { TUTOR_LIMITS } from "./contract";

export type MicError = "unsupported" | "denied" | "no-device" | "blocked" | "failed";

/** Push-to-talk recorder. The microphone is opened on start and released on stop, cancel or close. */
export class PushToTalk {
  private stream: MediaStream | null = null;
  private rec: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private done: ((b: Blob | null) => void) | null = null;
  constructor(private readonly onState: (s: "idle" | "recording") => void) {}

  static supported() {
    return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";
  }

  /** Opens the microphone (the browser asks for permission the first time) and starts recording. */
  async start(): Promise<{ ok: true } | { ok: false; error: MicError }> {
    if (!PushToTalk.supported()) return { ok: false, error: "unsupported" };
    if (this.rec) return { ok: true };
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch (e) {
      const n = (e as DOMException).name;
      return { ok: false, error: n === "NotAllowedError" || n === "SecurityError" ? (n === "SecurityError" ? "blocked" : "denied") : n === "NotFoundError" ? "no-device" : "failed" };
    }
    const type = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"].find((t) => MediaRecorder.isTypeSupported?.(t));
    this.chunks = [];
    this.rec = new MediaRecorder(this.stream, type ? { mimeType: type, audioBitsPerSecond: 32000 } : undefined);
    this.rec.ondataavailable = (e) => { if (e.data.size) this.chunks.push(e.data); };
    this.rec.onstop = () => {
      const blob = this.chunks.length ? new Blob(this.chunks, { type: this.rec?.mimeType || "audio/webm" }) : null;
      this.release();
      this.done?.(blob && blob.size <= TUTOR_LIMITS.audioBytes ? blob : null);
      this.done = null;
    };
    this.rec.start(250);
    this.onState("recording");
    // never record longer than the limit
    this.timer = setTimeout(() => { void this.stop(); }, TUTOR_LIMITS.audioSeconds * 1000);
    return { ok: true };
  }

  /** Stops recording, releases the microphone and returns the recording (null if empty or too big). */
  stop(): Promise<Blob | null> {
    if (!this.rec || this.rec.state === "inactive") { this.release(); return Promise.resolve(null); }
    return new Promise((resolve) => { this.done = resolve; this.rec!.stop(); });
  }

  /** Discards the recording and releases the microphone immediately. */
  cancel() {
    this.done = null;
    if (this.rec && this.rec.state !== "inactive") { this.rec.onstop = null; try { this.rec.stop(); } catch { /* already stopped */ } }
    this.release();
  }

  get recording() { return this.rec?.state === "recording"; }

  private release() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.rec = null;
    this.chunks = [];
    this.onState("idle");
  }
}

/** Plays approved speech with Web Audio (no media URLs, so the page's CSP is unchanged). */
export class SpeechPlayer {
  private ctx: AudioContext | null = null;
  private gain: GainNode | null = null;
  private src: AudioBufferSourceNode | null = null;
  private buffer: AudioBuffer | null = null;
  private muted = false;
  constructor(private readonly onState: (s: "idle" | "playing" | "error") => void) {}

  async play(audio: ArrayBuffer): Promise<boolean> {
    this.stop();
    try {
      this.ctx ??= new AudioContext();
      if (this.ctx.state === "suspended") await this.ctx.resume();
      this.buffer = await this.ctx.decodeAudioData(audio.slice(0));
      return this.replay();
    } catch {
      this.onState("error");
      return false;
    }
  }

  replay(): boolean {
    if (!this.ctx || !this.buffer) return false;
    this.stop();
    this.gain ??= this.ctx.createGain();
    this.gain.gain.value = this.muted ? 0 : 1;
    this.gain.connect(this.ctx.destination);
    const src = this.ctx.createBufferSource();
    src.buffer = this.buffer;
    src.connect(this.gain);
    src.onended = () => { if (this.src === src) { this.src = null; this.onState("idle"); } };
    this.src = src;
    src.start();
    this.onState("playing");
    return true;
  }

  stop() {
    const s = this.src;
    this.src = null;
    if (s) { s.onended = null; try { s.stop(); } catch { /* not started */ } this.onState("idle"); }
  }

  setMuted(m: boolean) { this.muted = m; if (this.gain) this.gain.gain.value = m ? 0 : 1; }
  get hasAudio() { return !!this.buffer; }
  close() { this.stop(); void this.ctx?.close().catch(() => undefined); this.ctx = null; this.gain = null; this.buffer = null; }
}

/** Free read-aloud with the browser's own speech synthesis. The most natural English voice on offer is
 *  preferred (Edge's "Natural" voices, Chrome's Google voices), falling back to a voice on the device. */
export const deviceSpeech = {
  voice(): SpeechSynthesisVoice | null {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
    const voices = window.speechSynthesis.getVoices().filter((v) => /^en(-|_|$)/i.test(v.lang));
    const accent = (v: SpeechSynthesisVoice) => { const i = ["IN", "GB", "US"].findIndex((r) => new RegExp(`en[-_]${r}`, "i").test(v.lang)); return i < 0 ? 3 : i; };
    const rank = (v: SpeechSynthesisVoice) => (/natural|neural/i.test(v.name) ? 0 : /google/i.test(v.name) ? 1 : 2) * 4 + accent(v);
    return [...voices].sort((a, b) => rank(a) - rank(b))[0] ?? null;
  },
  available() { return !!deviceSpeech.voice(); },
  speak(text: string, on: (s: "playing" | "idle" | "error") => void): boolean {
    const v = deviceSpeech.voice();
    if (!v) return false;
    window.speechSynthesis.cancel();
    // one utterance per sentence: some online voices stop after about 15 seconds of continuous speech
    const parts = text.match(/[^.!?]+[.!?]*\s*/g)?.map((p) => p.trim()).filter(Boolean) ?? [text];
    parts.forEach((part, i) => {
      const u = new SpeechSynthesisUtterance(part);
      u.voice = v;
      u.lang = v.lang;
      u.rate = 1;
      if (i === 0) u.onstart = () => on("playing");
      if (i === parts.length - 1) u.onend = () => on("idle");
      u.onerror = (e) => on(e.error === "interrupted" || e.error === "canceled" ? "idle" : "error");
      window.speechSynthesis.speak(u);
    });
    return true;
  },
  stop() { if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel(); },
};

interface Recognition {
  lang: string; interimResults: boolean; continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void; stop(): void; abort(): void;
}
const recognitionCtor = (): (new () => Recognition) | null => {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

/** Free speech-to-text with the browser's Web Speech API (Chrome, Edge, Safari); no server route or key.
 *  Reports the running transcript while the student speaks, then ends (with an error, if any). */
export class Dictation {
  private rec: Recognition | null = null;
  static supported() { return !!recognitionCtor(); }

  start(on: { text(t: string): void; end(error?: MicError): void }) {
    this.cancel();
    const C = recognitionCtor();
    if (!C) { on.end("unsupported"); return; }
    const rec = new C();
    rec.lang = "en-IN";
    rec.interimResults = true;
    rec.continuous = true;
    let error: MicError | undefined;
    rec.onresult = (e) => { let t = ""; for (let i = 0; i < e.results.length; i++) t += e.results[i]![0]!.transcript; on.text(t.trim()); };
    rec.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      error = e.error === "not-allowed" || e.error === "service-not-allowed" ? "denied" : e.error === "audio-capture" ? "no-device" : "failed";
    };
    rec.onend = () => { if (this.rec === rec) this.rec = null; on.end(error); };
    this.rec = rec;
    try { rec.start(); } catch { this.rec = null; on.end("failed"); }
  }

  get active() { return !!this.rec; }
  /** stops listening; the last transcript has already been reported */
  stop() { this.rec?.stop(); }
  /** stops listening at once, without waiting for the browser */
  cancel() { const r = this.rec; this.rec = null; if (r) { r.onend = null; try { r.abort(); } catch { /* not started */ } } }
}
