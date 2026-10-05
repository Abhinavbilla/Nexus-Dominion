import Phaser from "phaser";

// Drag-to-pan + wheel-to-zoom for the board camera. Click vs. drag is
// distinguished by movement distance so hex selection still works cleanly.
export class CameraController {
  constructor(scene, { minZoom = 0.6, maxZoom = 2.2 } = {}) {
    this.scene = scene;
    this.minZoom = minZoom;
    this.maxZoom = maxZoom;
    this.dragging = false;
    this.dragDistance = 0;
    this.lastX = 0;
    this.lastY = 0;

    scene.input.on("pointerdown", (p) => {
      this.dragging = true;
      this.dragDistance = 0;
      this.lastX = p.x;
      this.lastY = p.y;
    });

    scene.input.on("pointermove", (p) => {
      if (!this.dragging) return;
      const dx = p.x - this.lastX;
      const dy = p.y - this.lastY;
      this.dragDistance += Math.abs(dx) + Math.abs(dy);
      const cam = scene.cameras.main;
      cam.scrollX -= dx / cam.zoom;
      cam.scrollY -= dy / cam.zoom;
      this.lastX = p.x;
      this.lastY = p.y;
    });

    scene.input.on("pointerup", () => {
      this.dragging = false;
    });

    scene.input.on(
      "wheel",
      (_pointer, _objects, _dx, dy) => {
        const cam = scene.cameras.main;
        cam.zoom = Phaser.Math.Clamp(cam.zoom - dy * 0.001, this.minZoom, this.maxZoom);
      }
    );
  }

  // A pointerup counts as a "click" (not a drag) when total movement stayed small.
  wasClick() {
    return this.dragDistance < 6;
  }
}
