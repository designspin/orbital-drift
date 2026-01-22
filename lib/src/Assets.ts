export type AssetTypeProgress = {
  loaded: number;
  total: number;
  percent: number;
};

export type AssetProgress = {
  loaded: number;
  total: number;
  percent: number;
  byType?: Record<string, AssetTypeProgress>;
};

type ImageQueueItem = { key: string; src: string };
type TaskQueueItem = { kind: string; run: () => Promise<void> };

export class AssetManager {
  private imageQueue: ImageQueueItem[] = [];
  private images = new Map<string, HTMLImageElement>();
  private taskQueue: TaskQueueItem[] = [];
  private sounds = new Map<string, AudioBuffer>();
  private fonts = new Map<string, FontFace>();

  queueImage(key: string, src: string): void {
    this.imageQueue.push({ key, src });
  }

  queueSound(key: string, src: string, ctx: AudioContext): void {
    this.queueTask('sound', () => this.loadSound(ctx, key, src));
  }

  queueFont(family: string, src: string, descriptors: FontFaceDescriptors = {}): void {
    this.queueTask('font', () => this.loadFont(family, src, descriptors));
  }

  queueTask(kind: string, run: () => Promise<void>): void {
    this.taskQueue.push({ kind, run });
  }

  async loadAll(onProgress?: (progress: AssetProgress) => void): Promise<void> {
    const total = this.imageQueue.length + this.taskQueue.length;
    let loaded = 0;

    const typeProgress = new Map<string, { loaded: number; total: number }>();
    const bumpTotal = (kind: string, amount: number) => {
      const entry = typeProgress.get(kind) ?? { loaded: 0, total: 0 };
      entry.total += amount;
      typeProgress.set(kind, entry);
    };
    const bumpLoaded = (kind: string) => {
      const entry = typeProgress.get(kind);
      if (!entry) return;
      entry.loaded += 1;
    };

    if (this.imageQueue.length > 0) {
      bumpTotal('image', this.imageQueue.length);
    }
    for (const task of this.taskQueue) {
      bumpTotal(task.kind, 1);
    }

    const report = () => {
      const percent = total === 0 ? 1 : loaded / total;
      const byType: Record<string, AssetTypeProgress> = {};
      for (const [kind, entry] of typeProgress.entries()) {
        byType[kind] = {
          loaded: entry.loaded,
          total: entry.total,
          percent: entry.total === 0 ? 1 : entry.loaded / entry.total,
        };
      }
      onProgress?.({ loaded, total, percent, byType });
    };

    report();

    const imageTasks = this.imageQueue.map(({ key, src }) =>
      this.loadImage(src).then((img) => {
        this.images.set(key, img);
        loaded += 1;
        bumpLoaded('image');
        report();
      })
    );

    const extraTasks = this.taskQueue.map(({ kind, run }) =>
      run().then(() => {
        loaded += 1;
        bumpLoaded(kind);
        report();
      })
    );

    const tasks = [...imageTasks, ...extraTasks];

    await Promise.all(tasks);
    this.imageQueue = [];
    this.taskQueue = [];
  }

  getImage(key: string): HTMLImageElement {
    const img = this.images.get(key);
    if (!img) {
      throw new Error(`Image not loaded: ${key}`);
    }
    return img;
  }

  getSound(key: string): AudioBuffer {
    const sound = this.sounds.get(key);
    if (!sound) {
      throw new Error(`Sound not loaded: ${key}`);
    }
    return sound;
  }

  getFont(family: string): FontFace {
    const font = this.fonts.get(family);
    if (!font) {
      throw new Error(`Font not loaded: ${family}`);
    }
    return font;
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
      img.src = src;
    });
  }

  private async loadSound(ctx: AudioContext, key: string, src: string): Promise<void> {
    const res = await fetch(src);
    const arrayBuffer = await res.arrayBuffer();
    const buffer = await ctx.decodeAudioData(arrayBuffer);
    this.sounds.set(key, buffer);
  }

  private async loadFont(
    family: string,
    src: string,
    descriptors: FontFaceDescriptors
  ): Promise<void> {
    const face = new FontFace(family, `url(${src})`, descriptors);
    const loaded = await face.load();
    document.fonts.add(loaded);
    this.fonts.set(family, loaded);
  }
}