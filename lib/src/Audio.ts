export type AudioOptions = {
  volume?: number;
};

export class AudioManager {
  private ctx: AudioContext;
  private buffers = new Map<string, AudioBuffer>();
  private musicSource?: AudioBufferSourceNode;
  private musicGain?: GainNode;

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
    gain.gain.value = volume;
    source.connect(gain).connect(this.ctx.destination);
    source.start(0);
  }

  playMusic(key: string, volume: number = 0.6): void {
    const buffer = this.buffers.get(key);
    if (!buffer) return;
    this.stopMusic();

    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    source.buffer = buffer;
    source.loop = true;
    gain.gain.value = volume;
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
    if (this.musicGain) {
      this.musicGain.gain.value = volume;
    }
  }
}