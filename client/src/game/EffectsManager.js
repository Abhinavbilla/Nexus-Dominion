// Lightweight capture/build/attack feedback (spec.md §67-70) using Phaser
// tweens + a single generated particle texture — no external art assets.
export class EffectsManager {
  constructor(scene) {
    this.scene = scene;
    this._ensureParticleTexture();
  }

  _ensureParticleTexture() {
    if (this.scene.textures.exists("fx-dot")) return;
    const g = this.scene.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture("fx-dot", 8, 8);
    g.destroy();
  }

  flash(x, y, size, color) {
    const circle = this.scene.add.circle(x, y, size * 0.9, color, 0.5);
    this.scene.tweens.add({
      targets: circle,
      alpha: 0,
      scale: 1.7,
      duration: 500,
      ease: "Cubic.Out",
      onComplete: () => circle.destroy(),
    });
  }

  burst(x, y, color) {
    const emitter = this.scene.add.particles(x, y, "fx-dot", {
      speed: { min: 50, max: 140 },
      lifespan: 550,
      scale: { start: 1.1, end: 0 },
      tint: color,
      quantity: 14,
      emitting: false,
    });
    emitter.explode(14);
    this.scene.time.delayedCall(650, () => emitter.destroy());
  }

  pulseScale(target) {
    target.setScale(0.5);
    this.scene.tweens.add({ targets: target, scale: 1, duration: 320, ease: "Back.Out" });
  }

  shake(intensity = 0.003, duration = 150) {
    this.scene.cameras.main.shake(duration, intensity);
  }
}
