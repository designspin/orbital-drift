import type { Vec2 } from '@course/lib';
import { UIPanel } from '@course/lib';

export type MenuUIState = {
  viewport: Vec2;
  fontFamily: string;
  musicVolume: number;
  sfxVolume: number;
  touchHandedness: 'left' | 'right';
  touchFireSide: 'left' | 'right';
  isIOS: boolean;
  iapAvailable: boolean;
  iapOwned: boolean;
  iapCanPurchase: boolean;
  iapPriceLabel: string;
  iapTitle: string;
  iapIsProcessing?: boolean;
  iapLastError?: string;
  iapLastSuccess?: string;
  gameCenterAvailable: boolean;
  gameCenterAuthenticated: boolean;
  isTouchDevice: boolean;
  gearIcon?: HTMLImageElement;
  closeIcon?: HTMLImageElement;
  leaderboardIcon?: HTMLImageElement;
  cartIcon?: HTMLImageElement;
};

export type MenuUICallbacks = {
  onVolumeChange: (kind: 'music' | 'sfx', value: number) => void;
  onTouchOptionsChange: (handedness: 'left' | 'right', fireSide: 'left' | 'right') => void;
  onOpenLeaderboard: () => void;
  onPurchase: () => void;
  onRestore: () => void;
  onSuppressStart: () => void;
};

export class MenuUI {
  private settingsOpen = false;
  private purchaseOpen = false;
  private settingsDragging: 'music' | 'sfx' | null = null;
  private settingsPointerId: number | null = null;
  private settingsTouchId: number | null = null;
  private settingsPanel = new UIPanel({
    width: 480,
    height: 400,
    anchor: 'top-left',
    backgroundColor: 'rgba(10,10,10,0.85)',
    borderColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2,
    borderRadius: 16,
  });
  private purchasePanel = new UIPanel({
    width: 380,
    height: 240,
    anchor: 'top-left',
    backgroundColor: 'rgba(10,10,10,0.85)',
    borderColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2,
    borderRadius: 16,
  });
  private callbacks: MenuUICallbacks;

  constructor(callbacks: MenuUICallbacks) {
    this.callbacks = callbacks;
  }

  isBlocking(): boolean {
    return this.settingsOpen || this.purchaseOpen;
  }

  closeAll(): void {
    this.settingsOpen = false;
    this.purchaseOpen = false;
    this.settingsDragging = null;
    this.settingsPointerId = null;
    this.settingsTouchId = null;
  }

  render(ctx: CanvasRenderingContext2D, state: MenuUIState): void {
    this.renderSettingsIcon(ctx, state);
    this.renderLeaderboardButton(ctx, state);
    this.renderPurchaseButton(ctx, state);

    if (this.settingsOpen) {
      this.renderSettingsPanel(ctx, state);
    }

    if (this.purchaseOpen) {
      this.renderPurchasePanel(ctx, state);
    }
  }

  handlePointerDown(point: Vec2, pointerId: number, state: MenuUIState): boolean {
    if (this.handleMenuPointerDown(point, state)) return true;
    if (this.handlePurchasePointerDown(point, state)) return true;
    if (this.handleSettingsPointerDown(point, pointerId, state)) return true;
    return false;
  }

  handlePointerMove(point: Vec2, pointerId: number, state: MenuUIState): void {
    this.handleSettingsPointerMove(point, pointerId, state);
  }

  handlePointerUp(pointerId: number): boolean {
    if (!this.settingsOpen) return false;
    if (this.settingsPointerId === pointerId) {
      this.settingsPointerId = null;
      this.settingsDragging = null;
      this.callbacks.onSuppressStart();
      return true;
    }
    return false;
  }

  handleTouchStart(event: TouchEvent, mapPoint: (point: Vec2) => Vec2, state: MenuUIState): boolean {
    const touches = Array.from(event.changedTouches);
    for (const touch of touches) {
      const point = mapPoint({ x: touch.clientX, y: touch.clientY });
      if (this.handleMenuTouchStart(point, state)) return true;
      if (this.handlePurchaseTouchStart(point, state)) return true;
      if (this.handleSettingsTouchStart(point, touch.identifier, state)) return true;
    }
    return false;
  }

  handleTouchMove(event: TouchEvent, mapPoint: (point: Vec2) => Vec2, state: MenuUIState): void {
    this.handleSettingsTouchMove(event, mapPoint, state);
  }

  handleTouchEnd(event: TouchEvent): boolean {
    if (!this.settingsOpen) return false;
    if (this.settingsTouchId === null) return false;
    const ended = Array.from(event.changedTouches).some((t) => t.identifier === this.settingsTouchId);
    if (!ended) return false;
    this.settingsTouchId = null;
    this.settingsDragging = null;
    this.callbacks.onSuppressStart();
    return true;
  }

  private renderSettingsIcon(ctx: CanvasRenderingContext2D, state: MenuUIState): void {
    const layout = this.getSettingsLayout(state.viewport);
    const buttonX = layout.cog.x;
    const buttonY = layout.cog.y;
    const buttonSize = layout.cog.w;
    const iconX = layout.cogIcon.x;
    const iconY = layout.cogIcon.y;
    const size = layout.cogIcon.w;

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    this.drawRoundedRect(ctx, buttonX, buttonY, buttonSize, buttonSize, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    if (state.gearIcon) {
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.drawImage(state.gearIcon, iconX, iconY, size, size);
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(iconX + size / 2, iconY + size / 2, size / 2 - 4, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 6; i += 1) {
      const angle = (i / 6) * Math.PI * 2;
      const r1 = size / 2 - 2;
      const r2 = size / 2 + 4;
      const cx = iconX + size / 2;
      const cy = iconY + size / 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1);
      ctx.lineTo(cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2);
      ctx.stroke();
    }
    ctx.restore();
  }

  private renderLeaderboardButton(ctx: CanvasRenderingContext2D, state: MenuUIState): void {
    if (!state.gameCenterAvailable) return;
    const layout = this.getMenuLayout(state.viewport);
    const rect = layout.leaderboard;
    if (this.settingsOpen || this.purchaseOpen) return;

    ctx.save();
    const activeAlpha = state.gameCenterAuthenticated ? 0.45 : 0.25;
    ctx.fillStyle = `rgba(0,0,0,${activeAlpha})`;
    this.drawRoundedRect(ctx, rect.x, rect.y, rect.w, rect.h, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();

    const iconSize = Math.max(20, rect.w - 16);
    const iconX = rect.x + (rect.w - iconSize) / 2;
    const iconY = rect.y + (rect.h - iconSize) / 2;

    if (state.leaderboardIcon) {
      ctx.save();
      ctx.globalAlpha = state.gameCenterAuthenticated ? 0.9 : 0.5;
      ctx.drawImage(state.leaderboardIcon, iconX, iconY, iconSize, iconSize);
      ctx.restore();
    }
    ctx.restore();
  }

  private renderPurchaseButton(ctx: CanvasRenderingContext2D, state: MenuUIState): void {
    if (!state.isIOS || state.iapOwned) return;
    const layout = this.getMenuLayout(state.viewport);
    const rect = layout.purchase;
    if (this.settingsOpen || this.purchaseOpen) return;

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    this.drawRoundedRect(ctx, rect.x, rect.y, rect.w, rect.h, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();

    const iconSize = Math.max(20, rect.w - 16);
    const iconX = rect.x + (rect.w - iconSize) / 2;
    const iconY = rect.y + (rect.h - iconSize) / 2;

    if (state.cartIcon) {
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.drawImage(state.cartIcon, iconX, iconY, iconSize, iconSize);
      ctx.restore();
    }

    ctx.restore();
  }

  private handleMenuPointerDown(point: Vec2, state: MenuUIState): boolean {
    if (!state.gameCenterAvailable) return false;
    if (this.settingsOpen || this.purchaseOpen) return false;
    const { leaderboard } = this.getMenuLayout(state.viewport);
    if (this.isWithin(point, leaderboard)) {
      this.callbacks.onOpenLeaderboard();
      this.callbacks.onSuppressStart();
      return true;
    }
    return false;
  }

  private handleMenuTouchStart(point: Vec2, state: MenuUIState): boolean {
    if (!state.gameCenterAvailable) return false;
    if (this.settingsOpen || this.purchaseOpen) return false;
    const { leaderboard } = this.getMenuLayout(state.viewport);
    if (this.isWithin(point, leaderboard)) {
      this.callbacks.onOpenLeaderboard();
      this.callbacks.onSuppressStart();
      return true;
    }
    return false;
  }

  private handlePurchasePointerDown(point: Vec2, state: MenuUIState): boolean {
    if (!this.purchaseOpen) {
      if (!state.isIOS || state.iapOwned || this.settingsOpen) return false;
      const { purchase } = this.getMenuLayout(state.viewport);
      if (this.isWithin(point, purchase)) {
        this.purchaseOpen = true;
        this.callbacks.onSuppressStart();
        return true;
      }
      return false;
    }

    const { purchase } = this.getMenuLayout(state.viewport);
    if (this.isWithin(point, purchase)) {
      return true;
    }

    const layout = this.getPurchaseLayout(state.viewport);
    if (this.isWithin(point, layout.close)) {
      this.purchaseOpen = false;
      this.callbacks.onSuppressStart();
      return true;
    }

    if (state.iapAvailable && !state.iapOwned && state.iapCanPurchase && this.isWithin(point, layout.unlock)) {
      this.callbacks.onPurchase();
      this.callbacks.onSuppressStart();
      return true;
    }

    if (state.iapAvailable && !state.iapOwned && this.isWithin(point, layout.restore)) {
      this.callbacks.onRestore();
      this.callbacks.onSuppressStart();
      return true;
    }

    if (this.isWithin(point, layout.panel)) {
      return true;
    }

    this.purchaseOpen = false;
    this.callbacks.onSuppressStart();
    return true;
  }

  private handlePurchaseTouchStart(point: Vec2, state: MenuUIState): boolean {
    if (!this.purchaseOpen) {
      if (!state.isIOS || state.iapOwned || this.settingsOpen) return false;
      const { purchase } = this.getMenuLayout(state.viewport);
      if (this.isWithin(point, purchase)) {
        this.purchaseOpen = true;
        this.callbacks.onSuppressStart();
        return true;
      }
      return false;
    }

    const { purchase } = this.getMenuLayout(state.viewport);
    if (this.isWithin(point, purchase)) {
      return true;
    }

    const layout = this.getPurchaseLayout(state.viewport);
    if (this.isWithin(point, layout.close)) {
      this.purchaseOpen = false;
      this.callbacks.onSuppressStart();
      return true;
    }

    if (state.iapAvailable && !state.iapOwned && state.iapCanPurchase && this.isWithin(point, layout.unlock)) {
      this.callbacks.onPurchase();
      this.callbacks.onSuppressStart();
      return true;
    }

    if (state.iapAvailable && !state.iapOwned && this.isWithin(point, layout.restore)) {
      this.callbacks.onRestore();
      this.callbacks.onSuppressStart();
      return true;
    }

    if (this.isWithin(point, layout.panel)) {
      return true;
    }

    this.purchaseOpen = false;
    this.callbacks.onSuppressStart();
    return true;
  }

  private handleSettingsPointerDown(point: Vec2, pointerId: number, state: MenuUIState): boolean {
    const layout = this.getSettingsLayout(state.viewport);

    if (!this.settingsOpen) {
      if (this.isWithin(point, layout.cog)) {
        this.settingsOpen = true;
        this.callbacks.onSuppressStart();
        return true;
      }
      return false;
    }

    if (this.isWithin(point, layout.close)) {
      this.settingsOpen = false;
      this.settingsDragging = null;
      this.settingsPointerId = null;
      this.callbacks.onSuppressStart();
      return true;
    }

    if (this.isWithin(point, layout.musicHit)) {
      this.settingsDragging = 'music';
      this.settingsPointerId = pointerId;
      this.updateVolumeFromPoint(point, layout.music, 'music');
      this.callbacks.onSuppressStart();
      return true;
    }

    if (this.isWithin(point, layout.sfxHit)) {
      this.settingsDragging = 'sfx';
      this.settingsPointerId = pointerId;
      this.updateVolumeFromPoint(point, layout.sfx, 'sfx');
      this.callbacks.onSuppressStart();
      return true;
    }

    if (state.isTouchDevice && this.isWithin(point, layout.handLeft)) {
      this.callbacks.onTouchOptionsChange('left', state.touchFireSide);
      this.callbacks.onSuppressStart();
      return true;
    }

    if (state.isTouchDevice && this.isWithin(point, layout.handRight)) {
      this.callbacks.onTouchOptionsChange('right', state.touchFireSide);
      this.callbacks.onSuppressStart();
      return true;
    }

    if (state.isTouchDevice && this.isWithin(point, layout.fireLeft)) {
      this.callbacks.onTouchOptionsChange(state.touchHandedness, 'left');
      this.callbacks.onSuppressStart();
      return true;
    }

    if (state.isTouchDevice && this.isWithin(point, layout.fireRight)) {
      this.callbacks.onTouchOptionsChange(state.touchHandedness, 'right');
      this.callbacks.onSuppressStart();
      return true;
    }

    if (this.isWithin(point, layout.panel)) {
      return true;
    }

    return false;
  }

  private handleSettingsPointerMove(point: Vec2, pointerId: number, state: MenuUIState): void {
    if (!this.settingsOpen || !this.settingsDragging) return;
    if (this.settingsPointerId !== pointerId) return;
    const layout = this.getSettingsLayout(state.viewport);
    if (this.settingsDragging === 'music') {
      this.updateVolumeFromPoint(point, layout.music, 'music');
      return;
    }
    if (this.settingsDragging === 'sfx') {
      this.updateVolumeFromPoint(point, layout.sfx, 'sfx');
    }
  }

  private handleSettingsTouchStart(point: Vec2, identifier: number, state: MenuUIState): boolean {
    const layout = this.getSettingsLayout(state.viewport);

    if (!this.settingsOpen) {
      if (this.isWithin(point, layout.cog)) {
        this.settingsOpen = true;
        this.callbacks.onSuppressStart();
        return true;
      }
      return false;
    }

    if (this.isWithin(point, layout.close)) {
      this.settingsOpen = false;
      this.settingsDragging = null;
      this.settingsTouchId = null;
      this.callbacks.onSuppressStart();
      return true;
    }

    if (this.isWithin(point, layout.musicHit)) {
      this.settingsDragging = 'music';
      this.settingsTouchId = identifier;
      this.updateVolumeFromPoint(point, layout.music, 'music');
      this.callbacks.onSuppressStart();
      return true;
    }

    if (this.isWithin(point, layout.sfxHit)) {
      this.settingsDragging = 'sfx';
      this.settingsTouchId = identifier;
      this.updateVolumeFromPoint(point, layout.sfx, 'sfx');
      this.callbacks.onSuppressStart();
      return true;
    }

    if (state.isTouchDevice && this.isWithin(point, layout.handLeft)) {
      this.callbacks.onTouchOptionsChange('left', state.touchFireSide);
      this.callbacks.onSuppressStart();
      return true;
    }

    if (state.isTouchDevice && this.isWithin(point, layout.handRight)) {
      this.callbacks.onTouchOptionsChange('right', state.touchFireSide);
      this.callbacks.onSuppressStart();
      return true;
    }

    if (state.isTouchDevice && this.isWithin(point, layout.fireLeft)) {
      this.callbacks.onTouchOptionsChange(state.touchHandedness, 'left');
      this.callbacks.onSuppressStart();
      return true;
    }

    if (state.isTouchDevice && this.isWithin(point, layout.fireRight)) {
      this.callbacks.onTouchOptionsChange(state.touchHandedness, 'right');
      this.callbacks.onSuppressStart();
      return true;
    }

    if (this.isWithin(point, layout.panel)) {
      return true;
    }

    return false;
  }

  private handleSettingsTouchMove(event: TouchEvent, mapPoint: (point: Vec2) => Vec2, state: MenuUIState): void {
    if (!this.settingsOpen) return;
    const layout = this.getSettingsLayout(state.viewport);
    const touches = Array.from(event.changedTouches);

    if (!this.settingsDragging) {
      for (const touch of touches) {
        const point = mapPoint({ x: touch.clientX, y: touch.clientY });
        if (this.isWithin(point, layout.musicHit)) {
          this.settingsDragging = 'music';
          this.settingsTouchId = touch.identifier;
          this.updateVolumeFromPoint(point, layout.music, 'music');
          return;
        }
        if (this.isWithin(point, layout.sfxHit)) {
          this.settingsDragging = 'sfx';
          this.settingsTouchId = touch.identifier;
          this.updateVolumeFromPoint(point, layout.sfx, 'sfx');
          return;
        }
      }
      return;
    }

    const touch = touches.find((t) => t.identifier === this.settingsTouchId);
    if (!touch) return;
    const point = mapPoint({ x: touch.clientX, y: touch.clientY });
    if (this.settingsDragging === 'music') {
      this.updateVolumeFromPoint(point, layout.music, 'music');
      return;
    }
    if (this.settingsDragging === 'sfx') {
      this.updateVolumeFromPoint(point, layout.sfx, 'sfx');
    }
  }

  private renderSettingsPanel(ctx: CanvasRenderingContext2D, state: MenuUIState): void {
    const layout = this.getSettingsLayout(state.viewport);
    const { panel, music, sfx, close, closeIcon, handLeft, handRight, fireLeft, fireRight } = layout;

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, state.viewport.x, state.viewport.y);

    this.settingsPanel.width = panel.w;
    this.settingsPanel.height = panel.h;
    this.settingsPanel.offsetX = panel.x;
    this.settingsPanel.offsetY = panel.y;
    this.settingsPanel.render(ctx, state.viewport.x, state.viewport.y);

    ctx.fillStyle = '#ffffff';
    ctx.font = `22px ${state.fontFamily}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('Settings', panel.x + 20, panel.y + 28);

    ctx.font = `16px ${state.fontFamily}`;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillText('Music', music.x, music.y - 16);
    ctx.fillText('SFX', sfx.x, sfx.y - 16);

    this.renderSlider(ctx, music, state.musicVolume);
    this.renderSlider(ctx, sfx, state.sfxVolume);

    if (state.isTouchDevice) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = `15px ${state.fontFamily}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('Controls', panel.x + 20, handLeft.y + handLeft.h / 2);
      ctx.fillText('Tap Fire', panel.x + 20, fireLeft.y + fireLeft.h / 2);

      this.renderOptionButton(ctx, handLeft, 'Left', state.touchHandedness === 'left', state.fontFamily);
      this.renderOptionButton(ctx, handRight, 'Right', state.touchHandedness === 'right', state.fontFamily);
      this.renderOptionButton(ctx, fireLeft, 'Left', state.touchFireSide === 'left', state.fontFamily);
      this.renderOptionButton(ctx, fireRight, 'Right', state.touchFireSide === 'right', state.fontFamily);
    }

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    this.drawRoundedRect(ctx, close.x, close.y, close.w, close.h, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    if (state.closeIcon) {
      const iconSize = closeIcon.w;
      const iconX = closeIcon.x;
      const iconY = closeIcon.y;
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.drawImage(state.closeIcon, iconX, iconY, iconSize, iconSize);
      ctx.restore();
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.font = `14px ${state.fontFamily}`;
      ctx.textAlign = 'center';
      ctx.fillText('X', close.x + close.w / 2, close.y + close.h / 2 + 1);
    }

    ctx.restore();
  }

  private renderPurchasePanel(ctx: CanvasRenderingContext2D, state: MenuUIState): void {
    const layout = this.getPurchaseLayout(state.viewport);
    const { panel, close, closeIcon, unlock, restore } = layout;

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, state.viewport.x, state.viewport.y);

    this.purchasePanel.width = panel.w;
    this.purchasePanel.height = panel.h;
    this.purchasePanel.offsetX = panel.x;
    this.purchasePanel.offsetY = panel.y;
    this.purchasePanel.render(ctx, state.viewport.x, state.viewport.y);

    ctx.fillStyle = '#ffffff';
    ctx.font = `22px ${state.fontFamily}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('Store', panel.x + 20, panel.y + 28);

    if (!state.iapAvailable) {
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.font = `16px ${state.fontFamily}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('Store loading…', panel.x + 20, panel.y + 72);
      ctx.font = `14px ${state.fontFamily}`;
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillText('If this takes too long, try again later.', panel.x + 20, panel.y + 96);
    } else if (state.iapOwned) {
      // Product is owned - show success message
      ctx.fillStyle = 'rgba(100,255,100,0.9)';
      ctx.font = `18px ${state.fontFamily}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('✓ Full Game Unlocked!', panel.x + 20, panel.y + 72);

      ctx.font = `14px ${state.fontFamily}`;
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillText('Thank you for your purchase!', panel.x + 20, panel.y + 100);
    } else if (state.iapIsProcessing) {
      // Show processing state
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.font = `16px ${state.fontFamily}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('Processing...', panel.x + 20, panel.y + 72);
      ctx.font = `14px ${state.fontFamily}`;
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillText('Please wait...', panel.x + 20, panel.y + 96);
    } else if (!state.iapOwned) {
      const title = state.iapTitle || 'Full Game Unlock';
      const price = state.iapPriceLabel ? ` ${state.iapPriceLabel}` : '';
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = `16px ${state.fontFamily}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(title, panel.x + 20, panel.y + 72);
      if (price) {
        ctx.font = `14px ${state.fontFamily}`;
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fillText(`Price:${price}`, panel.x + 20, panel.y + 96);
      }
      if (!state.iapCanPurchase) {
        ctx.font = `14px ${state.fontFamily}`;
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillText('Store not ready yet', panel.x + 20, panel.y + 120);
      }
      this.renderOptionButton(ctx, unlock, 'Purchase', state.iapCanPurchase, state.fontFamily);
      this.renderOptionButton(ctx, restore, 'Restore', false, state.fontFamily);
    }

    // Show success or error messages
    if (state.iapLastSuccess) {
      ctx.fillStyle = 'rgba(100,255,100,0.9)';
      ctx.font = `14px ${state.fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(state.iapLastSuccess, panel.x + layout.panel.w / 2, panel.y + layout.panel.h - 40);
    } else if (state.iapLastError) {
      ctx.fillStyle = 'rgba(255,100,100,0.9)';
      ctx.font = `14px ${state.fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(state.iapLastError, panel.x + layout.panel.w / 2, panel.y + layout.panel.h - 40);
    }

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    this.drawRoundedRect(ctx, close.x, close.y, close.w, close.h, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    if (state.closeIcon) {
      const iconSize = closeIcon.w;
      const iconX = closeIcon.x;
      const iconY = closeIcon.y;
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.drawImage(state.closeIcon, iconX, iconY, iconSize, iconSize);
      ctx.restore();
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.font = `14px ${state.fontFamily}`;
      ctx.textAlign = 'center';
      ctx.fillText('X', close.x + close.w / 2, close.y + close.h / 2 + 1);
    }

    ctx.restore();
  }

  private renderSlider(ctx: CanvasRenderingContext2D, rect: { x: number; y: number; w: number; h: number }, value: number): void {
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.fillStyle = 'rgba(120,196,255,0.9)';
    ctx.fillRect(rect.x, rect.y, rect.w * value, rect.h);

    const knobX = rect.x + rect.w * value;
    const knobY = rect.y + rect.h / 2;
    ctx.beginPath();
    ctx.fillStyle = '#ffffff';
    ctx.arc(knobX, knobY, rect.h * 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private renderOptionButton(
    ctx: CanvasRenderingContext2D,
    rect: { x: number; y: number; w: number; h: number },
    label: string,
    active: boolean,
    fontFamily: string,
  ): void {
    ctx.save();
    ctx.fillStyle = active ? 'rgba(120,196,255,0.9)' : 'rgba(255,255,255,0.12)';
    this.drawRoundedRect(ctx, rect.x, rect.y, rect.w, rect.h, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = active ? '#0b0b0b' : 'rgba(255,255,255,0.85)';
    ctx.font = `16px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1);
    ctx.restore();
  }

  private getSettingsLayout(viewport: Vec2) {
    const { x: w, y: h } = viewport;
    const panelW = 480;
    const panelH = 400;
    const panelX = (w - panelW) / 2;
    const panelY = (h - panelH) / 2;
    const sliderW = 320;
    const sliderH = 14;
    const sliderHitH = 38;
    const sliderX = panelX + 80;
    const musicY = panelY + 120;
    const sfxY = panelY + 210;
    const optionButtonW = 150;
    const optionButtonH = 40;
    const optionGap = 16;
    const optionRight = panelX + panelW - 28;
    const optionLeft = optionRight - optionButtonW * 2 - optionGap;
    const handedY = panelY + 285 - optionButtonH / 2;
    const fireY = panelY + 345 - optionButtonH / 2;
    const closeIconSize = 28;
    const closeButtonPadding = 12;
    const closeIconX = panelX + panelW - closeIconSize - 18 - closeButtonPadding;
    const closeIconY = panelY + 18 + closeButtonPadding;
    const closeX = closeIconX - closeButtonPadding;
    const closeY = closeIconY - closeButtonPadding;
    const closeButtonSize = closeIconSize + closeButtonPadding * 2;
    const cogSize = 38;
    const cogPadX = 64;
    const cogPadY = 56;
    const cogButtonPadding = 10;
    const cogIconX = w - cogSize - cogPadX;
    const cogIconY = cogPadY;
    const cogX = cogIconX - cogButtonPadding;
    const cogY = cogIconY - cogButtonPadding;
    const cogButtonSize = cogSize + cogButtonPadding * 2;

    return {
      panel: { x: panelX, y: panelY, w: panelW, h: panelH },
      music: { x: sliderX, y: musicY, w: sliderW, h: sliderH },
      sfx: { x: sliderX, y: sfxY, w: sliderW, h: sliderH },
      musicHit: { x: sliderX, y: musicY - (sliderHitH - sliderH) / 2, w: sliderW, h: sliderHitH },
      sfxHit: { x: sliderX, y: sfxY - (sliderHitH - sliderH) / 2, w: sliderW, h: sliderHitH },
      close: { x: closeX, y: closeY, w: closeButtonSize, h: closeButtonSize },
      closeIcon: { x: closeIconX, y: closeIconY, w: closeIconSize, h: closeIconSize },
      handLeft: { x: optionLeft, y: handedY, w: optionButtonW, h: optionButtonH },
      handRight: { x: optionLeft + optionButtonW + optionGap, y: handedY, w: optionButtonW, h: optionButtonH },
      fireLeft: { x: optionLeft, y: fireY, w: optionButtonW, h: optionButtonH },
      fireRight: { x: optionLeft + optionButtonW + optionGap, y: fireY, w: optionButtonW, h: optionButtonH },
      cog: { x: cogX, y: cogY, w: cogButtonSize, h: cogButtonSize },
      cogIcon: { x: cogIconX, y: cogIconY, w: cogSize, h: cogSize },
    };
  }

  private getMenuLayout(viewport: Vec2) {
    const { cog } = this.getSettingsLayout(viewport);
    const size = cog.w;
    const gap = 10;
    const leaderboardX = cog.x - size - gap;
    const purchaseX = leaderboardX - size - gap;
    const y = cog.y;
    return {
      leaderboard: { x: leaderboardX, y, w: size, h: size },
      purchase: { x: purchaseX, y, w: size, h: size },
    };
  }

  private getPurchaseLayout(viewport: Vec2) {
    const { x: w, y: h } = viewport;
    const panelW = 380;
    const panelH = 240;
    const panelX = (w - panelW) / 2;
    const panelY = (h - panelH) / 2;
    const buttonW = 160;
    const buttonH = 48;
    const gap = 12;
    const buttonX = panelX + panelW - 20 - buttonW * 2 - gap;
    const unlockY = panelY + 150 - buttonH / 2;

    const closeIconSize = 22;
    const closeButtonPadding = 10;
    const closeIconX = panelX + panelW - closeIconSize - 16 - closeButtonPadding;
    const closeIconY = panelY + 12 + closeButtonPadding;
    const closeX = closeIconX - closeButtonPadding;
    const closeY = closeIconY - closeButtonPadding;
    const closeButtonSize = closeIconSize + closeButtonPadding * 2;

    return {
      panel: { x: panelX, y: panelY, w: panelW, h: panelH },
      close: { x: closeX, y: closeY, w: closeButtonSize, h: closeButtonSize },
      closeIcon: { x: closeIconX, y: closeIconY, w: closeIconSize, h: closeIconSize },
      unlock: { x: buttonX, y: unlockY, w: buttonW, h: buttonH },
      restore: { x: buttonX + buttonW + gap, y: unlockY, w: buttonW, h: buttonH },
    };
  }

  private updateVolumeFromPoint(point: Vec2, rect: { x: number; y: number; w: number; h: number }, kind: 'music' | 'sfx'): void {
    const t = Math.max(0, Math.min(1, (point.x - rect.x) / rect.w));
    this.callbacks.onVolumeChange(kind, t);
  }

  private isWithin(point: Vec2, rect: { x: number; y: number; w: number; h: number }): boolean {
    return point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h;
  }

  private drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
    const r = Math.max(0, Math.min(radius, Math.min(width, height) / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}
