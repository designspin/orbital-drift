export type AssetProgress = {
  loaded: number;
  total: number;
  percent: number;
};

type ImageQueueItem = { key: string; src: string };

export class AssetManager {
  private imageQueue: ImageQueueItem[] = [];
  private images = new Map<string, HTMLImageElement>();

  queueImage(key: string, src: string): void {
    this.imageQueue.push({ key, src });
  }

  async loadAll(onProgress?: (progress: AssetProgress) => void): Promise<void> {
    const total = this.imageQueue.length;
    let loaded = 0;

    const report = () => {
      const percent = total === 0 ? 1 : loaded / total;
      onProgress?.({ loaded, total, percent });
    };

    report();

    const tasks = this.imageQueue.map(({ key, src }) =>
      this.loadImage(src).then((img) => {
        this.images.set(key, img);
        loaded += 1;
        report();
      })
    );

    await Promise.all(tasks);
    this.imageQueue = [];
  }

  getImage(key: string): HTMLImageElement {
    const img = this.images.get(key);
    if (!img) {
      throw new Error(`Image not loaded: ${key}`);
    }
    return img;
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
      img.src = src;
    });
  }
}