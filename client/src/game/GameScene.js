import Phaser from "phaser";
import { axialToPixel, pixelToAxial, hexKey, getNeighbors } from "@hex-dominion/shared/hexMath.js";
import { BASE_CONFIG } from "../config.js";
import { useGameStore } from "../state/gameStore.js";
import { hexCorners } from "./HexRenderer.js";
import { EffectsManager } from "./EffectsManager.js";
import { CameraController } from "./CameraController.js";
import { PLAYER_COLOR_CSS, PLAYER_COLOR_HEX, colorForPlayer } from "./playerColors.js";
import { createTileTextures, tileKey, variantFor, tileMetrics, TEX_SCALE } from "./art/tileArt.js";
import { createBuildingTextures, buildingKey, buildingMetrics, FACTORY_SMOKE } from "./art/buildingArt.js";
import { renderBackdrop, renderPlinth } from "./art/backdropArt.js";

export const HEX_SIZE = 40;
const RADIUS = BASE_CONFIG.BOARD_RADIUS;
const MODE_STYLE = {
  claim: { color: 0xffd47a, icon: "claim" },
  build: { color: 0x4cc9b0, icon: "build" },
  attack: { color: 0xff5a5a, icon: "attack" },
  fortify: { color: 0x5aa9ff, icon: "fortify" },
};
const RESOURCE_BY_TERRAIN = { forest: "wood", mine: "metal", energy_field: "energy" };
const RESOURCE_COLOR = { wood: 0xd79a5a, metal: 0x9fb4cf, energy: 0xffd84d };

export default class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
    this.onHexClick = null;
    this.onHoverHex = null;
    this.cells = new Map(); // key -> latest cell data
    this.views = new Map(); // key -> display objects
    this.playersById = new Map();
    this.chains = [];
    this.highlightKeys = new Set();
    this.actionMode = null;
    this.seenEvents = new Set();
    this.firstState = true;
    this.hoverKey = null;
    this.lastHoverHex = null;
  }

  create() {
    this.tileM = createTileTextures(this, HEX_SIZE);
    this.bldM = createBuildingTextures(this, HEX_SIZE, PLAYER_COLOR_CSS);
    this.effects = new EffectsManager(this);
    this.corners = hexCorners(HEX_SIZE * 0.97).map((c) => new Phaser.Math.Vector2(c.x, c.y));

    this._buildBackdrop();
    this._buildPlinth();

    this.chainGfx = this.add.graphics().setDepth(7000);
    this.hoverGfx = this.add.graphics().setDepth(8000);
    this.highlightGfx = this.add.graphics().setDepth(7500);
    this.iconLayer = this.add.container(0, 0).setDepth(7600);
    this.selectionGfx = this.add.graphics().setDepth(7800);

    this.tweens.add({ targets: this.highlightGfx, alpha: { from: 0.55, to: 1 }, duration: 700, yoyo: true, repeat: -1, ease: "Sine.InOut" });
    this.tweens.add({ targets: this.iconLayer, y: -3, duration: 650, yoyo: true, repeat: -1, ease: "Sine.InOut" });

    this._buildDust();
    this._buildAtmosphere();

    this.cameraController = new CameraController(this);
    this.input.on("pointermove", (p) => this._onPointerMove(p));
    this.input.on("pointerup", (pointer) => {
      if (!this.cameraController.wasClick()) return;
      const hex = this._hexAt(pointer);
      if (hex && this.onHexClick) this.onHexClick(hex);
    });
    this.input.on("gameout", () => this._setHover(null));
    this.scale.on("resize", () => this._fitCamera());
    this.events.on("icon-ready", () => this._drawHighlights());
    this._fitCamera();

    if (import.meta.env?.DEV) {
      window.__scene = this;
      window.__hexToClient = (q, r) => {
        const cam = this.cameras.main;
        const { x, y } = axialToPixel(q, r, HEX_SIZE);
        const rect = this.game.canvas.getBoundingClientRect();
        const bounds = this.game.canvas.width / rect.width;
        return {
          x: rect.left + ((x - cam.midPoint.x) * cam.zoom + cam.width / 2) / bounds,
          y: rect.top + ((y - cam.midPoint.y) * cam.zoom + cam.height / 2) / bounds,
        };
      };
    }
  }

  // ------------------------------------------------------------------ scenery
  _buildBackdrop() {
    this.textures.addCanvas("backdrop", renderBackdrop(1600, 1000, 11));
    this.backdrop = this.add.image(0, 0, "backdrop").setScrollFactor(0).setDepth(-2000);
  }

  _buildPlinth() {
    const plinth = renderPlinth(HEX_SIZE, RADIUS);
    this.textures.addCanvas("plinth", plinth.canvas);
    this.plinthInfo = plinth;
    this.add
      .image(0, 0, "plinth")
      .setOrigin(plinth.cx / plinth.W, plinth.cy / plinth.H)
      .setScale(1 / plinth.scale)
      .setDepth(-1000);
  }

  _buildDust() {
    const R = this.plinthInfo.cx / this.plinthInfo.scale;
    this.add
      .particles(0, 0, "fx-dot", {
        emitZone: { type: "random", source: new Phaser.Geom.Rectangle(-R, -R * 0.8, R * 2, R * 1.6) },
        lifespan: 7000,
        speedX: { min: -4, max: 6 },
        speedY: { min: -9, max: -3 },
        scale: { start: 0.28, end: 0.05 },
        alpha: { start: 0, end: 0.6, ease: "Sine.InOut" },
        tint: [0xffd47a, 0xbcd0ff],
        frequency: 260,
        blendMode: "ADD",
      })
      .setDepth(6500);
  }

  // Ambient life: drifting cloud shadows, twinkling stars, and crackling arcs on energy fields.
  _buildAtmosphere() {
    if (!this.textures.exists("fx-cloud")) {
      const c = document.createElement("canvas");
      c.width = 512;
      c.height = 256;
      const x = c.getContext("2d");
      for (let i = 0; i < 9; i++) {
        const px = 90 + Math.random() * 330;
        const py = 70 + Math.random() * 120;
        const r = 50 + Math.random() * 70;
        const g = x.createRadialGradient(px, py, 0, px, py, r);
        g.addColorStop(0, "rgba(0,0,0,0.5)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        x.fillStyle = g;
        x.fillRect(px - r, py - r, r * 2, r * 2);
      }
      this.textures.addCanvas("fx-cloud", c);
    }
    const R = this.plinthInfo.cx / this.plinthInfo.scale;
    for (let i = 0; i < 3; i++) {
      const cloud = this.add.image(-R - 300 + i * 340, -R * 0.5 + i * R * 0.45, "fx-cloud").setDepth(6200).setAlpha(0.2).setScale(2.4 + i * 0.5);
      this.tweens.add({ targets: cloud, x: R + 400, duration: 70000 + i * 22000, repeat: -1, onRepeat: () => (cloud.x = -R - 500) });
    }

    this.add
      .particles(0, 0, "fx-dot", {
        emitZone: { type: "random", source: new Phaser.Geom.Rectangle(-1400, -900, 2800, 1800) },
        lifespan: 3200,
        scale: { min: 0.1, max: 0.32 },
        alpha: { values: [0, 0.85, 0] },
        tint: [0xffffff, 0xcfe0ff, 0xffe3a8],
        frequency: 90,
        blendMode: "ADD",
      })
      .setScrollFactor(0.04)
      .setDepth(-1500);

    this.arcGfx = this.add.graphics().setDepth(7050).setBlendMode(Phaser.BlendModes.ADD);
    this.time.addEvent({ delay: 260, loop: true, callback: () => this._drawEnergyArcs() });
  }

  _drawEnergyArcs() {
    const g = this.arcGfx;
    if (!g || !g.scene) return;
    g.clear();
    for (const [key, view] of this.views) {
      if (view.terrain !== "energy_field" || Math.random() < 0.45) continue;
      const a0 = Math.random() * Math.PI * 2;
      const pts = [];
      const ox = view.x;
      const oy = view.y - 5;
      for (let i = 0; i <= 5; i++) {
        const t = i / 5;
        const ang = a0 + (Math.random() - 0.5) * 0.5;
        const rad = 4 + t * HEX_SIZE * 0.62;
        pts.push({ x: ox + Math.cos(ang) * rad + (Math.random() - 0.5) * 4, y: oy + Math.sin(ang) * rad * 0.7 + (Math.random() - 0.5) * 4 });
      }
      for (const [w, a] of [[5, 0.12], [2.4, 0.5], [1, 1]]) {
        g.lineStyle(w, w > 2 ? 0x4aa8ff : 0xdff6ff, a);
        g.beginPath();
        g.moveTo(ox, oy);
        pts.forEach((p) => g.lineTo(p.x, p.y));
        g.strokePath();
      }
    }
  }

  _fitCamera() {
    const cam = this.cameras.main;
    const { fitW, fitH } = this.plinthInfo;
    const worldW = fitW;
    const worldH = fitH;
    const zoom = Math.min(cam.width / worldW, cam.height / worldH);
    cam.setZoom(zoom);
    cam.centerOn(0, 6);
    if (this.cameraController) {
      this.cameraController.minZoom = zoom * 0.7;
      this.cameraController.maxZoom = zoom * 2.8;
    }
  }

  update(time) {
    // keep the screen-space backdrop covering the viewport regardless of zoom
    const cam = this.cameras.main;
    if (this.backdrop) {
      const cover = Math.max(cam.width / 1600, cam.height / 1000) * 1.05;
      this.backdrop.setPosition(cam.width / 2 + cam.midPoint.x * 0.01, cam.height / 2 + cam.midPoint.y * 0.01).setScale(cover / cam.zoom);
    }
    this._drawChains(time);
  }

  // ------------------------------------------------------------------ geometry
  _pos(q, r) {
    return axialToPixel(q, r, HEX_SIZE);
  }

  _hexAt(pointer) {
    const w = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const { q, r } = pixelToAxial(w.x, w.y, HEX_SIZE);
    return this.cells.has(hexKey(q, r)) ? { q, r } : null;
  }

  _polyAt(x, y) {
    return this.corners.map((c) => new Phaser.Math.Vector2(x + c.x, y + c.y));
  }

  // ------------------------------------------------------------------ hover
  _onPointerMove(pointer) {
    if (!this.cameraController.dragging || this.cameraController.dragDistance < 6) {
      this._setHover(this._hexAt(pointer));
    }
  }

  _setHover(hex) {
    const key = hex ? hexKey(hex.q, hex.r) : null;
    this.lastHoverHex = hex;
    if (key === this.hoverKey) return;
    this.hoverKey = key;
    this.hoverGfx.clear();
    if (hex) {
      const { x, y } = this._pos(hex.q, hex.r);
      const poly = this._polyAt(x, y);
      const valid = this.highlightKeys.has(key);
      const color = valid ? (MODE_STYLE[this.actionMode]?.color ?? 0xffffff) : 0xffffff;
      this.hoverGfx.fillStyle(color, valid ? 0.22 : 0.1);
      this.hoverGfx.fillPoints(poly, true);
      this.hoverGfx.lineStyle(valid ? 3.5 : 2, color, valid ? 1 : 0.55);
      this.hoverGfx.strokePoints(poly, true);
      this.input.setDefaultCursor(valid ? "pointer" : "default");
    } else {
      this.input.setDefaultCursor("default");
    }
    if (this.onHoverHex) this.onHoverHex(hex);
  }

  // ------------------------------------------------------------------ state sync
  updateState(gameState, selectedHex, highlightKeys = [], actionMode = null) {
    this.playersById = new Map(gameState.players.map((p) => [p.id, p]));
    this.chains = gameState.activeSupplyChains || [];
    this.actionMode = actionMode;

    const incoming = new Map(gameState.board.map((c) => [hexKey(c.q, c.r), c]));
    if (this.views.size === 0) this._buildBoard(gameState.board);

    for (const [key, cell] of incoming) {
      const prev = this.cells.get(key);
      const view = this.views.get(key);
      if (!view) continue;
      const first = !view.initialized;
      const ownerChanged = first || prev.ownerId !== cell.ownerId || prev.fortificationLevel !== cell.fortificationLevel;
      const buildingChanged = first || prev.building !== cell.building || prev.ownerId !== cell.ownerId;
      const newBuilding = !first && prev.building !== cell.building;
      this.cells.set(key, cell);
      if (ownerChanged) this._drawOwner(view, cell);
      if (buildingChanged) this._syncBuilding(view, cell, newBuilding && !this.firstState);
      view.initialized = true;
    }

    this._processEvents(gameState);
    this._setHighlights(highlightKeys);
    this._drawSelection(selectedHex);
    this.firstState = false;
  }

  _buildBoard(board) {
    const sorted = [...board].sort((a, b) => a.r - b.r || a.q - b.q);
    const m = this.tileM || tileMetrics(HEX_SIZE);
    for (const cell of sorted) {
      const key = hexKey(cell.q, cell.r);
      const { x, y } = this._pos(cell.q, cell.r);
      const tile = this.add
        .image(x, y, tileKey(cell.terrain, variantFor(cell.q, cell.r)))
        .setOrigin(0.5, m.cy / m.H)
        .setScale(1 / TEX_SCALE)
        .setDepth(y);
      const ownerGfx = this.add.graphics().setDepth(y + 0.2);
      const view = { x, y, tile, ownerGfx, building: null, extras: [], terrain: cell.terrain, initialized: false };
      this.views.set(key, view);
      this.cells.set(key, cell);

      if (cell.terrain === "energy_field") {
        const glow = this.add
          .image(x, y - 2, "fx-glow")
          .setTint(0x6fe0ff)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(y + 0.1)
          .setDisplaySize(HEX_SIZE * 1.7, HEX_SIZE * 1.7);
        this.tweens.add({ targets: glow, alpha: { from: 0.25, to: 0.7 }, duration: 1300 + Math.abs(cell.q * 137) % 500, yoyo: true, repeat: -1, ease: "Sine.InOut" });
        view.extras.push(glow);
      }
    }
  }

  // ------------------------------------------------------------------ ownership
  _drawOwner(view, cell) {
    const g = view.ownerGfx;
    g.clear();
    if (!cell.ownerId) return;
    const owner = this.playersById.get(cell.ownerId);
    const color = colorForPlayer(owner);
    const poly = this._polyAt(view.x, view.y);
    const center = new Phaser.Math.Vector2(view.x, view.y);

    g.fillStyle(color, 0.17);
    g.fillPoints(poly, true);
    for (const [w, a] of [[11, 0.07], [7, 0.12], [4.5, 0.2]]) {
      g.lineStyle(w, color, a);
      g.strokePoints(poly, true);
    }
    g.lineStyle(2.4, color, 1);
    g.strokePoints(poly, true);
    g.lineStyle(1, 0xffffff, 0.35);
    g.strokePoints(poly.map((p) => p.clone().lerp(center, 0.07)), true);
    g.fillStyle(0xffffff, 0.9);
    for (const p of poly) g.fillCircle(p.x, p.y, 1.8);

    // fortification: shield pips along the lower edge
    const lvl = cell.fortificationLevel || 0;
    for (let i = 0; i < lvl; i++) {
      const px = view.x + (i - (lvl - 1) / 2) * 11;
      const py = view.y + HEX_SIZE * 0.68;
      const shield = [
        new Phaser.Math.Vector2(px - 5, py - 5),
        new Phaser.Math.Vector2(px + 5, py - 5),
        new Phaser.Math.Vector2(px + 5, py + 1),
        new Phaser.Math.Vector2(px, py + 6),
        new Phaser.Math.Vector2(px - 5, py + 1),
      ];
      g.fillStyle(0x0b0f19, 0.9);
      g.fillPoints(shield, true);
      g.lineStyle(1.6, 0x8cc4ff, 1);
      g.strokePoints(shield, true);
    }
  }

  _syncBuilding(view, cell, animate) {
    view.building?.destroy();
    view.building = null;
    view.extras.filter((e) => e.isBuildingFx).forEach((e) => e.destroy());
    view.extras = view.extras.filter((e) => !e.isBuildingFx);
    if (!cell.building || !cell.ownerId) return;

    const owner = this.playersById.get(cell.ownerId);
    const colorName = owner?.color || "cyan";
    const key = buildingKey(cell.building, colorName);
    if (!this.textures.exists(key)) return;
    const m = this.bldM || buildingMetrics(HEX_SIZE);
    const baseScale = 1 / TEX_SCALE;
    const sprite = this.add
      .image(view.x, view.y + HEX_SIZE * 0.1, key)
      .setOrigin(0.5, m.groundY / m.H)
      .setScale(baseScale)
      .setDepth(view.y + 1);
    view.building = sprite;
    const color = PLAYER_COLOR_HEX[colorName];

    const glow = this.add
      .image(view.x, view.y + HEX_SIZE * 0.12, "fx-glow")
      .setTint(color)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(view.y + 0.9)
      .setDisplaySize(HEX_SIZE * 1.9, HEX_SIZE * 1.1)
      .setAlpha(0.28);
    glow.isBuildingFx = true;
    this.tweens.add({ targets: glow, alpha: { from: 0.18, to: 0.42 }, duration: 1800 + (view.x % 7) * 120, yoyo: true, repeat: -1, ease: "Sine.InOut" });
    view.extras.push(glow);

    if (animate) {
      this.effects.pop(sprite, baseScale);
      this.effects.dust(view.x, view.y + HEX_SIZE * 0.2);
      this.effects.ring(view.x, view.y + HEX_SIZE * 0.15, color, { to: 54, duration: 700 });
    }

    if (cell.building === "command_hub") {
      const radar = this.add.graphics({ x: view.x, y: view.y + HEX_SIZE * 0.1 }).setDepth(view.y + 0.9).setBlendMode(Phaser.BlendModes.ADD);
      radar.lineStyle(2, color, 1);
      radar.strokeEllipse(0, 0, HEX_SIZE * 1.5, HEX_SIZE * 0.9);
      radar.isBuildingFx = true;
      this.tweens.add({ targets: radar, scale: { from: 0.6, to: 1.35 }, alpha: { from: 0.9, to: 0 }, duration: 2200, repeat: -1, ease: "Sine.Out" });
      view.extras.push(radar);
    }
    if (cell.building === "factory") {
      const sz = m.S / TEX_SCALE;
      FACTORY_SMOKE.forEach((s) => {
        const emitter = this.add.particles(view.x + s.x * sz, view.y + HEX_SIZE * 0.1 + s.y * sz, "fx-dot", {
          lifespan: 2200,
          speedY: { min: -20, max: -11 },
          speedX: { min: -3, max: 9 },
          scale: { start: 0.5, end: 1.7 },
          alpha: { start: 0.34, end: 0 },
          tint: 0xd5d8e0,
          frequency: 480,
        });
        emitter.setDepth(view.y + 2);
        emitter.isBuildingFx = true;
        view.extras.push(emitter);
      });
    }
  }

  // ------------------------------------------------------------------ highlights
  _setHighlights(keys) {
    this.highlightKeys = new Set(keys);
    this._drawHighlights();
    // focus: dim tiles that are not valid targets while an action mode is active
    const dim = Boolean(this.actionMode);
    for (const [key, view] of this.views) {
      if (dim && !this.highlightKeys.has(key)) view.tile.setTint(0xa3a8bf);
      else view.tile.clearTint();
    }
    const hover = this.lastHoverHex;
    this.hoverKey = "__refresh__";
    this._setHover(hover);
  }

  _drawHighlights() {
    if (!this.highlightGfx || !this.highlightGfx.scene) return;
    this.highlightGfx.clear();
    this.iconLayer.removeAll(true);
    const style = MODE_STYLE[this.actionMode];
    if (!style) return;
    for (const key of this.highlightKeys) {
      const view = this.views.get(key);
      if (!view) continue;
      const poly = this._polyAt(view.x, view.y);
      this.highlightGfx.fillStyle(style.color, 0.16);
      this.highlightGfx.fillPoints(poly, true);
      for (const [w, a] of [[9, 0.1], [5, 0.2]]) {
        this.highlightGfx.lineStyle(w, style.color, a);
        this.highlightGfx.strokePoints(poly, true);
      }
      this.highlightGfx.lineStyle(2.4, style.color, 1);
      this.highlightGfx.strokePoints(poly, true);
      if (this.effects.hasIcon(style.icon)) {
        const badge = this.add.circle(view.x, view.y - 2, 12, 0x0b0f19, 0.82).setStrokeStyle(1.6, style.color, 1);
        const icon = this.add.image(view.x, view.y - 2, `ico-${style.icon}`).setDisplaySize(15, 15).setTint(style.color);
        this.iconLayer.add([badge, icon]);
      }
    }
  }

  _drawSelection(selectedHex) {
    this.selectionGfx.clear();
    if (!selectedHex) return;
    const { x, y } = this._pos(selectedHex.q, selectedHex.r);
    const poly = this._polyAt(x, y);
    this.selectionGfx.lineStyle(9, 0xffffff, 0.15);
    this.selectionGfx.strokePoints(poly, true);
    this.selectionGfx.lineStyle(4, 0xffffff, 0.95);
    this.selectionGfx.strokePoints(poly, true);
  }

  // ------------------------------------------------------------------ supply chains
  _drawChains(time) {
    const g = this.chainGfx;
    g.clear();
    for (const chain of this.chains) {
      if (!chain.active || !chain.pathKeys || chain.pathKeys.length < 2) continue;
      const color = colorForPlayer(this.playersById.get(chain.playerId));
      const pts = chain.pathKeys.map((k) => {
        const [q, r] = k.split(",").map(Number);
        const p = this._pos(q, r);
        return { x: p.x, y: p.y - 4 };
      });
      for (const [w, a] of [[12, 0.1], [7, 0.2], [3.4, 0.85]]) {
        g.lineStyle(w, color, a);
        g.beginPath();
        g.moveTo(pts[0].x, pts[0].y);
        pts.slice(1).forEach((p) => g.lineTo(p.x, p.y));
        g.strokePath();
      }
      // flowing energy packets travelling source -> city
      const lengths = [];
      let total = 0;
      for (let i = 1; i < pts.length; i++) {
        const l = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
        lengths.push(l);
        total += l;
      }
      const spacing = 30;
      for (let d = (time * 0.045) % spacing; d < total; d += spacing) {
        let rem = d;
        let i = 0;
        while (i < lengths.length && rem > lengths[i]) rem -= lengths[i++];
        if (i >= lengths.length) break;
        const t = rem / lengths[i];
        const x = pts[i].x + (pts[i + 1].x - pts[i].x) * t;
        const y = pts[i].y + (pts[i + 1].y - pts[i].y) * t;
        g.fillStyle(color, 0.35);
        g.fillCircle(x, y, 6.5);
        g.fillStyle(0xffffff, 0.95);
        g.fillCircle(x, y, 2.8);
      }
      const pulse = 0.5 + 0.5 * Math.sin(time * 0.004);
      for (const p of [pts[0], pts[pts.length - 1]]) {
        g.lineStyle(2, color, 0.5 + pulse * 0.5);
        g.strokeCircle(p.x, p.y, 17 + pulse * 3);
      }
    }
  }

  // ------------------------------------------------------------------ events -> effects
  _processEvents(gameState) {
    const events = gameState.eventLog || [];
    const fresh = [];
    for (const e of events) {
      const key = `${e.timestamp}|${e.type || e.action}|${e.playerId || ""}|${e.hex ? `${e.hex.q},${e.hex.r}` : ""}|${e.round}`;
      if (this.seenEvents.has(key)) continue;
      this.seenEvents.add(key);
      fresh.push(e);
    }
    if (this.seenEvents.size > 600) this.seenEvents = new Set([...this.seenEvents].slice(-300));
    if (this.firstState) return;
    fresh.forEach((e, i) => this.time.delayedCall(i * 120, () => this._playEvent(e)));
  }

  _playEvent(e) {
    const kind = e.action || e.type;
    const view = e.hex ? this.views.get(hexKey(e.hex.q, e.hex.r)) : null;
    const owner = this.playersById.get(e.playerId);
    const color = colorForPlayer(owner);

    if (kind === "claim" && view) {
      this.effects.ring(view.x, view.y, color, { to: 50 });
      this.effects.glowFlash(view.x, view.y, color, 80);
      this.effects.floatText(view.x, view.y - 14, `+${e.dominionAwarded} DP`, 0xffd47a);
    } else if (kind === "fortify" && view) {
      this.effects.ring(view.x, view.y, 0x8cc4ff, { to: 56, width: 4 });
      this.effects.glowFlash(view.x, view.y, 0x5aa9ff, 90);
    } else if (kind === "build" && view && e.dominionAwarded) {
      this.effects.floatText(view.x, view.y - 26, `+${e.dominionAwarded} DP`, 0xffd47a, { size: 17 });
    } else if (kind === "attack" && view) {
      const from = this._attackOrigin(e);
      const target = { x: view.x, y: view.y };
      const success = e.outcome === "SUCCESS";
      this.effects.beam(from, target, color, {
        onHit: () => {
          this.effects.ring(target.x, target.y, success ? 0xff5a5a : 0x8cc4ff, { to: 62, width: 5 });
          this.effects.burst(target.x, target.y, success ? 0xff7a5a : 0x9fc8ff, { count: success ? 26 : 14 });
          this.effects.glowFlash(target.x, target.y, success ? 0xff5a5a : 0x8cc4ff, 100);
          this.effects.shake(success ? 0.006 : 0.003, success ? 240 : 140);
          this.effects.floatText(target.x, target.y - 18, success ? "BREACH!" : "REPELLED", success ? 0xff6a5a : 0x9fc8ff, { size: 17 });
          if (success && e.dominionAwarded) this.effects.floatText(target.x, target.y + 4, `+${e.dominionAwarded} DP`, 0xffd47a, { delay: 250 });
        },
      });
    } else if (kind === "round_started") {
      this._floatIncome();
    }

    for (const d of e.chainUpdate?.dominionEvents || []) {
      const chain = this.chains.find((c) => c.playerId === d.playerId && c.sourceKey === d.sourceKey);
      const cityView = chain ? this.views.get(chain.cityKey) : null;
      if (cityView) {
        const c = colorForPlayer(this.playersById.get(d.playerId));
        this.time.delayedCall(250, () => {
          this.effects.ring(cityView.x, cityView.y, c, { to: 70, width: 5, duration: 900 });
          this.effects.burst(cityView.x, cityView.y, 0xffd47a, { count: 28, speed: [60, 190] });
          this.effects.floatText(cityView.x, cityView.y - 30, `SUPPLY CHAIN  +${d.amount} DP`, 0xffd47a, { size: 18, rise: 44, duration: 1600 });
        });
      }
    }
  }

  _attackOrigin(e) {
    const target = e.hex;
    for (const n of getNeighbors(target.q, target.r)) {
      const c = this.cells.get(hexKey(n.q, n.r));
      if (c && c.ownerId === e.playerId) {
        const p = this._pos(n.q, n.r);
        return { x: p.x, y: p.y - 6 };
      }
    }
    const p = this._pos(target.q, target.r);
    return { x: p.x - 40, y: p.y - 40 };
  }

  // Round start: floating income badges on the local player's producing hexes.
  _floatIncome() {
    const me = useGameStore.getState().playerId;
    const gen = BASE_CONFIG.RESOURCE_GENERATION;
    let i = 0;
    for (const [key, cell] of this.cells) {
      if (cell.ownerId !== me) continue;
      const res = RESOURCE_BY_TERRAIN[cell.terrain];
      let amount = 0;
      let kind = res;
      if (res) amount = 1 + (cell.building === "factory" ? gen.factory_bonus : 0);
      else if (cell.terrain === "plains" && cell.building === "factory") {
        amount = gen.factory_on_plains_energy;
        kind = "energy";
      }
      if (!amount) continue;
      const view = this.views.get(key);
      this.effects.floatIcon(view.x, view.y - 10, kind, `+${amount}`, RESOURCE_COLOR[kind], { delay: i++ * 70 });
    }
  }
}
