import Phaser from "phaser";
import { iconDataUrl } from "../ui/Icon.jsx";

const ICONS = ["claim", "build", "attack", "fortify", "wood", "metal", "energy", "dominion", "chain"];

// Visual feedback toolkit for the board: rings, beams, bursts, floating labels/icons, shake.
// All textures are generated at runtime (no asset files).
export class EffectsManager {
  constructor(scene) {
    this.scene = scene;
    this._makeTextures();
    this._loadIcons();
  }

  _makeTextures() {
    const { scene } = this;
    if (!scene.textures.exists("fx-dot")) {
      const c = document.createElement("canvas");
      c.width = c.height = 16;
      const x = c.getContext("2d");
      const g = x.createRadialGradient(8, 8, 0, 8, 8, 8);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(0.5, "rgba(255,255,255,0.7)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      x.fillStyle = g;
      x.fillRect(0, 0, 16, 16);
      scene.textures.addCanvas("fx-dot", c);
    }
    if (!scene.textures.exists("fx-glow")) {
      const c = document.createElement("canvas");
      c.width = c.height = 128;
      const x = c.getContext("2d");
      const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, "rgba(255,255,255,0.9)");
      g.addColorStop(0.35, "rgba(255,255,255,0.35)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      x.fillStyle = g;
      x.fillRect(0, 0, 128, 128);
      scene.textures.addCanvas("fx-glow", c);
    }
  }

  _loadIcons() {
    for (const name of ICONS) {
      const key = `ico-${name}`;
      if (this.scene.textures.exists(key)) continue;
      const img = new Image();
      img.onload = () => {
        // The scene may already be torn down (React StrictMode double-mount, screen change).
        const game = this.scene.sys?.game;
        if (!game || !game.renderer || !this.scene.textures) return;
        if (!this.scene.textures.exists(key)) this.scene.textures.addImage(key, img);
        this.scene.events.emit("icon-ready", key);
      };
      img.src = iconDataUrl(name, "#ffffff", 96);
    }
  }

  hasIcon(name) {
    return this.scene.textures.exists(`ico-${name}`);
  }

  // Expanding ring (shockwave / ripple).
  ring(x, y, color, { from = 6, to = 46, duration = 600, width = 3, flat = 0.62 } = {}) {
    const g = this.scene.add.graphics({ x, y }).setDepth(9000).setBlendMode(Phaser.BlendModes.ADD);
    g.lineStyle(width, color, 1);
    g.strokeEllipse(0, 0, from * 2, from * 2 * flat);
    const t = { r: from, a: 1 };
    this.scene.tweens.add({
      targets: t,
      r: to,
      a: 0,
      duration,
      ease: "Cubic.Out",
      onUpdate: () => {
        g.clear();
        g.lineStyle(width * (0.4 + t.a * 0.6), color, t.a);
        g.strokeEllipse(0, 0, t.r * 2, t.r * 2 * flat);
      },
      onComplete: () => g.destroy(),
    });
  }

  glowFlash(x, y, color, size = 70, duration = 520) {
    const s = this.scene.add.image(x, y, "fx-glow").setTint(color).setBlendMode(Phaser.BlendModes.ADD).setDepth(9000);
    s.setDisplaySize(size * 0.6, size * 0.6).setAlpha(0.95);
    this.scene.tweens.add({ targets: s, alpha: 0, displayWidth: size * 2.2, displayHeight: size * 2.2, duration, ease: "Cubic.Out", onComplete: () => s.destroy() });
  }

  burst(x, y, color, { count = 16, speed = [50, 150], life = 650, scale = 0.7 } = {}) {
    const emitter = this.scene.add.particles(x, y, "fx-dot", {
      speed: { min: speed[0], max: speed[1] },
      lifespan: life,
      scale: { start: scale, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: color,
      blendMode: "ADD",
      quantity: count,
      emitting: false,
    });
    emitter.setDepth(9100);
    emitter.explode(count);
    this.scene.time.delayedCall(life + 150, () => emitter.destroy());
  }

  dust(x, y) {
    const emitter = this.scene.add.particles(x, y + 6, "fx-dot", {
      speed: { min: 20, max: 70 },
      angle: { min: 190, max: 350 },
      lifespan: 700,
      scale: { start: 0.9, end: 0.1 },
      alpha: { start: 0.55, end: 0 },
      tint: 0xd7cdb8,
      quantity: 14,
      emitting: false,
    });
    emitter.setDepth(9050);
    emitter.explode(14);
    this.scene.time.delayedCall(900, () => emitter.destroy());
  }

  // Energy beam from A to B that travels, then fades.
  beam(from, to, color, { duration = 260, onHit } = {}) {
    const g = this.scene.add.graphics().setDepth(9200).setBlendMode(Phaser.BlendModes.ADD);
    const t = { p: 0, fade: 1 };
    this.scene.tweens.add({
      targets: t,
      p: 1,
      duration,
      ease: "Cubic.In",
      onUpdate: () => {
        const x = from.x + (to.x - from.x) * t.p;
        const y = from.y + (to.y - from.y) * t.p;
        g.clear();
        for (const [w, a] of [[9, 0.18], [5, 0.4], [2.2, 1]]) {
          g.lineStyle(w, color, a);
          g.lineBetween(from.x, from.y, x, y);
        }
        g.fillStyle(0xffffff, 1);
        g.fillCircle(x, y, 4);
      },
      onComplete: () => {
        if (onHit) onHit();
        this.scene.tweens.add({ targets: g, alpha: 0, duration: 220, onComplete: () => g.destroy() });
      },
    });
  }

  shake(intensity = 0.004, duration = 180) {
    this.scene.cameras.main.shake(duration, intensity);
  }

  // Rising text label with outline.
  floatText(x, y, text, color, { size = 15, rise = 36, duration = 1100, delay = 0 } = {}) {
    const css = typeof color === "number" ? `#${color.toString(16).padStart(6, "0")}` : color;
    const label = this.scene.add
      .text(x, y, text, { fontFamily: '"Barlow Condensed", sans-serif', fontStyle: "700", fontSize: `${size}px`, color: css, stroke: "#05070d", strokeThickness: 4 })
      .setOrigin(0.5)
      .setDepth(9500)
      .setAlpha(0);
    this.scene.tweens.add({
      targets: label,
      y: y - rise,
      alpha: { from: 1, to: 0 },
      delay,
      duration,
      ease: "Cubic.Out",
      onStart: () => label.setAlpha(1),
      onComplete: () => label.destroy(),
    });
  }

  // Icon + amount floating up (resource income etc.).
  floatIcon(x, y, iconName, text, color, { delay = 0, rise = 34 } = {}) {
    if (!this.hasIcon(iconName)) return;
    const css = typeof color === "number" ? `#${color.toString(16).padStart(6, "0")}` : color;
    const icon = this.scene.add.image(x - 8, y, `ico-${iconName}`).setDisplaySize(15, 15).setTint(typeof color === "number" ? color : 0xffffff);
    const label = this.scene.add
      .text(x + 3, y, text, { fontFamily: '"JetBrains Mono", monospace', fontStyle: "700", fontSize: "12px", color: css, stroke: "#05070d", strokeThickness: 3 })
      .setOrigin(0, 0.5);
    [icon, label].forEach((o) => o.setDepth(9500).setAlpha(0));
    this.scene.tweens.add({
      targets: [icon, label],
      y: `-=${rise}`,
      alpha: { from: 1, to: 0 },
      delay,
      duration: 1300,
      ease: "Sine.Out",
      onStart: () => [icon, label].forEach((o) => o.setAlpha(1)),
      onComplete: () => [icon, label].forEach((o) => o.destroy()),
    });
  }

  // Bounce-in for a freshly built sprite.
  pop(sprite, baseScale) {
    sprite.setScale(baseScale * 0.2).setAlpha(0);
    this.scene.tweens.add({ targets: sprite, scale: baseScale, alpha: 1, duration: 480, ease: "Back.Out" });
  }
}
