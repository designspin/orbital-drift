import type { System, UILayer } from "@course/lib";
import { UILayer as UILayerClass, UIPanel as UIPanelClass, ScoreDisplay as ScoreDisplayClass, TextDisplay as TextDisplayClass } from "@course/lib";
import { ShipIndicators } from "../ShipIndicators";
import { RadarDisplay } from "../RadarDisplay";
import { BossHealthBar } from "../BossHealthBar";
import type { Asteroid } from "../Asteroid";
import type { Enemy } from "../Enemy";
import type { Vec2 } from "@course/lib";

export type HudSystemOptions = {
  getScore: () => number;
  getLives: () => number;
  getShield: () => number;
  getShieldActive: () => boolean;
  getBossHealth: () => number;
  getBossVisible: () => boolean;
  getBoss: () => { position: Vec2 } | undefined;
  getMissiles: () => { position: Vec2 }[];
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
    const safePad = 28;

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
      getBoss: () => this.options.getBoss(),
      getMissiles: () => this.options.getMissiles(),
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
      bossColor: '#a855f7',
      missileColor: '#ffd60a',
      playerColor: '#3da5ff',
      dotRadius: 1.5,
    });

    radarPanel.add(radarDisplay);
    this.hudLayer.add(radarPanel);

    const livesPanel = new UIPanelClass({
      anchor: 'top-right',
      offsetX: -150 - safePad,
      offsetY: 10 + safePad,
      width: 140,
      height: 40,
      backgroundColor: 'rgba(0,0,0,0.4)',
      borderWidth: 0,
    });

    const livesLabel = new TextDisplayClass({
      getText: () => 'LIVES',
      anchor: 'top-left',
      parent: livesPanel,
      offsetX: 8,
      offsetY: 6,
      color: 'rgba(255,255,255,0.8)',
      font: `11px ${this.options.fontFamily}`,
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

    livesPanel.add(livesLabel);
    livesPanel.add(livesDisplay);
    this.hudLayer.add(livesPanel);

    const shieldBar = new BossHealthBar({
      getValue: () => this.options.getShield(),
      getVisible: () => true,
      width: 120,
      height: 10,
      anchor: 'top-left',
      offsetX: 20 + safePad,
      offsetY: 20 + safePad,
      backgroundColor: 'rgba(0,0,0,0.65)',
      fillColor: '#5ac8fa',
      borderColor: 'rgba(255,255,255,0.4)',
      borderWidth: 1,
      label: 'SHIELD',
      labelColor: '#7fd1ff',
      font: `11px ${this.options.fontFamily}`,
    });

    this.hudLayer.add(shieldBar);

    const bossBar = new BossHealthBar({
      getValue: () => this.options.getBossHealth(),
      getVisible: () => this.options.getBossVisible(),
      width: 320,
      height: 12,
      anchor: 'top-left',
      offsetX: (width - 320) / 2,
      offsetY: 20 + safePad,
      backgroundColor: 'rgba(0,0,0,0.65)',
      fillColor: '#ff3b30',
      borderColor: 'rgba(255,255,255,0.4)',
      borderWidth: 1,
      label: 'BOSS',
      labelColor: '#ffffff',
      font: `12px ${this.options.fontFamily}`,
    });

    this.hudLayer.add(bossBar);

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
