export class Timer {
    private gameTime: number = 0;
    private maxStep: number = 0.05;
    private lastTime: number = 0;
    private fps: number = 0;
    private isPaused: boolean = false;

    tick(): number {
        if (this.isPaused) {
            return 0;
        }

        const currentTime = performance.now();
        let deltaTime = (currentTime - this.lastTime) / 1000;
        this.fps = 1000 / (currentTime - this.lastTime);
        this.lastTime = currentTime;

        if (deltaTime > this.maxStep) {
            deltaTime = this.maxStep;
        }

        this.gameTime += deltaTime;
        return deltaTime;
    }

    pause(): void {
        this.isPaused = true;
    }

    resume(): void {
        this.isPaused = false;
        this.lastTime = performance.now();
    }

    getGameTime(): number {
        return this.gameTime;
    }

    getFPS(): number {
        return Math.round(this.fps);
    }
}