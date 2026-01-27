export type AudioOptions = {
  volume?: number;
};

export class AudioManager {
  private ctx: AudioContext;
  private buffers = new Map<string, AudioBuffer>();
  private musicSource?: AudioBufferSourceNode;
  private musicGain?: GainNode;
  private loopSources = new Map<string, { source: AudioBufferSourceNode; gain: GainNode; volume: number }>();
  private musicVolume: number = 0.6;
  private sfxVolume: number = 1;

  constructor() {
    this.ctx = new AudioContext();
  }

  getContext(): AudioContext {
    return this.ctx;
  }

  registerSound(key: string, buffer: AudioBuffer): void {
    this.buffers.set(key, buffer);
  }

  async loadSound(key: string, src: string): Promise<void> {
    const res = await fetch(src);
    const arrayBuffer = await res.arrayBuffer();
    const buffer = await this.ctx.decodeAudioData(arrayBuffer);
    this.buffers.set(key, buffer);
  }

  async loadAll(items: Array<{ key: string; src: string }>): Promise<void> {
    await Promise.all(items.map((item) => this.loadSound(item.key, item.src)));
  }

  async resume(): Promise<void> {
    if (this.ctx.state === "suspended") {
      await this.ctx.resume();
    }
  }

  playSound(key: string, volume: number = 1): void {
    const buffer = this.buffers.get(key);
    if (!buffer) return;
    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    source.buffer = buffer;
    gain.gain.value = volume * this.sfxVolume;
    source.connect(gain).connect(this.ctx.destination);
    source.start(0);
  }

  playMusic(key: string, volume?: number): void {
    const buffer = this.buffers.get(key);
    if (!buffer) return;
    this.stopMusic();

    const resolvedVolume = volume ?? this.musicVolume;

    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    source.buffer = buffer;
    source.loop = true;
    this.musicVolume = resolvedVolume;
    gain.gain.value = resolvedVolume;
    source.connect(gain).connect(this.ctx.destination);
    source.start(0);

    this.musicSource = source;
    this.musicGain = gain;
  }

  stopMusic(): void {
    if (this.musicSource) {
      this.musicSource.stop();
      this.musicSource.disconnect();
      this.musicSource = undefined;
      this.musicGain = undefined;
    }
  }

  setMusicVolume(volume: number): void {
    this.musicVolume = volume;
    if (this.musicGain) {
      this.musicGain.gain.value = volume;
    }
  }

  setSfxVolume(volume: number): void {
    this.sfxVolume = volume;
    for (const entry of this.loopSources.values()) {
      entry.gain.gain.value = entry.volume * this.sfxVolume;
    }
  }

  playLoop(key: string, volume: number = 0.5): void {
    if (this.loopSources.has(key)) return;
    const buffer = this.buffers.get(key);
    if (!buffer) return;
    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    source.buffer = buffer;
    source.loop = true;
    gain.gain.value = volume * this.sfxVolume;
    source.connect(gain).connect(this.ctx.destination);
    source.start(0);
    this.loopSources.set(key, { source, gain, volume });
  }

  stopLoop(key: string): void {
    const entry = this.loopSources.get(key);
    if (!entry) return;
    entry.source.stop();
    entry.source.disconnect();
    entry.gain.disconnect();
    this.loopSources.delete(key);
  }
}