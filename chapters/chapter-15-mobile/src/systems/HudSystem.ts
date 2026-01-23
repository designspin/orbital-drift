import type { System, UILayer } from "@course/lib";
import { UILayer as UILayerClass, UIPanel as UIPanelClass, ScoreDisplay as ScoreDisplayClass, TextDisplay as TextDisplayClass, ShieldBar as ShieldBarClass } from "@course/lib";
import { ShipIndicators } from "../ShipIndicators";
import { RadarDisplay } from "../RadarDisplay";
import type { Asteroid } from "../Asteroid";
import type { Enemy } from "../Enemy";
import type { Vec2 } from "@course/lib";

export type HudSystemOptions = {
  getScore: () => number;
  getLives: () => number;
  getShield: () => number;
  getShieldActive: () => boolean;
  getAsteroids: () => Asteroid[];
  getEnemies: () => Enemy[];
  getWorldSize: () => Vec2;
  getPlayer: () => Vec2 | undefined;
  getCanvasSize: () => { width: number; height: number };
  addLayer: (layer: UILayer) => void;
  fontFamily: string;
};

export class HudSystem implements System {
  private options: HudSystemOptions;
  private hudLayer: UILayer = new UILayerClass('HUD');
  private pauseLayer: UILayer = new UILayerClass('Pause');

  constructor(options: HudSystemOptions) {
    this.options = options;
  }

  init(): void {
    const { width } = this.options.getCanvasSize();

    const panel = new UIPanelClass({
      anchor: 'top-left',
      offsetX: (width - 160) / 2,
      offsetY: 10,
      width: 160,
      height: 40,
      backgroundColor: 'rgba(0,0,0,0.6)',
    });

    const scoreDisplay = new ScoreDisplayClass({
      getScore: () => this.options.getScore(),
      anchor: 'center',
      offsetX: 0,
      offsetY: 0,
      parent: panel,
      font: `16px ${this.options.fontFamily}`,
    });

    panel.add(scoreDisplay);
    this.hudLayer.add(panel);

    const radarPanel = new UIPanelClass({
      anchor: 'top-left',
      offsetX: (width - 160) / 2,
      offsetY: 56,
      width: 160,
      height: 90,
      backgroundColor: 'rgba(0,0,0,0.5)',
      borderColor: 'rgba(255,255,255,0.2)',
      borderWidth: 1,
      borderRadius: 8,
    });

    const radarDisplay = new RadarDisplay({
      getAsteroids: () => this.options.getAsteroids(),
      getEnemies: () => this.options.getEnemies(),
      getPlayer: () => this.options.getPlayer(),
      getWorldSize: () => this.options.getWorldSize(),
      width: 160,
      height: 90,
      anchor: 'top-left',
      parent: radarPanel,
      offsetX: 0,
      offsetY: 0,
      asteroidColor: '#ffffff',
      enemyColor: '#ff3b30',
      playerColor: '#3da5ff',
      dotRadius: 1.5,
    });

    radarPanel.add(radarDisplay);
    this.hudLayer.add(radarPanel);

    const livesPanel = new UIPanelClass({
      anchor: 'top-right',
      offsetX: -150,
      offsetY: 10,
      width: 140,
      height: 40,
      backgroundColor: 'rgba(0,0,0,0.4)',
      borderWidth: 0,
    });

    const livesDisplay = new ShipIndicators({
      getLives: () => this.options.getLives(),
      maxLives: 3,
      anchor: 'center',
      parent: livesPanel,
      color: '#00ff6a',
      size: 10,
      spacing: 10,
    });

    livesPanel.add(livesDisplay);
    this.hudLayer.add(livesPanel);

    const shieldBar = new ShieldBarClass({
      getValue: () => this.options.getShield(),
      width: 120,
      height: 10,
      anchor: 'top-left',
      offsetX: 20,
      offsetY: 20,
      backgroundColor: 'rgba(0,0,0,0.5)',
      fillColor: this.options.getShieldActive() ? '#5ac8fa' : '#5ac8fa',
      borderColor: 'rgba(255,255,255,0.25)',
      borderWidth: 1,
    });

    this.hudLayer.add(shieldBar);

    const pausePanel = new UIPanelClass({
      anchor: 'center',
      offsetX: -120,
      offsetY: -35,
      width: 240,
      height: 70,
      backgroundColor: 'rgba(28, 54, 92, 0.9)',
      borderColor: 'rgba(120, 196, 255, 0.9)',
      borderWidth: 3,
      borderRadius: 16,
    });

    const pauseText = new TextDisplayClass({
      getText: () => 'PAUSED',
      anchor: 'center',
      parent: pausePanel,
      offsetY: 0,
      color: 'rgba(120, 196, 255, 0.9)',
      font: `28px ${this.options.fontFamily}`,
    });

    pausePanel.add(pauseText);
    this.pauseLayer.add(pausePanel);
    this.pauseLayer.setVisible(false);

    this.options.addLayer(this.hudLayer);
    this.options.addLayer(this.pauseLayer);
  }

  setHudVisible(visible: boolean): void {
    this.hudLayer.setVisible(visible);
  }

  setPauseVisible(visible: boolean): void {
    this.pauseLayer.setVisible(visible);
  }

  update(): void {}
}
