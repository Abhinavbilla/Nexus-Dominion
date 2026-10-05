import Phaser from "phaser";
import { axialToPixel, pixelToAxial, hexKey } from "@hex-dominion/shared/hexMath.js";
import { drawTerrain } from "./TerrainRenderer.js";
import { drawTerritory, drawSelection, drawHighlight } from "./TerritoryRenderer.js";
import { drawBuilding } from "./BuildingRenderer.js";
import { drawSupplyChains } from "./SupplyChainRenderer.js";
import { EffectsManager } from "./EffectsManager.js";
import { CameraController } from "./CameraController.js";
import { colorForPlayer } from "./playerColors.js";

const HEX_SIZE = 32;

export default class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
    this.onHexClick = null;
    this.prevBoardByKey = new Map();
    this.cellsByKey = new Map();
    this.playersById = new Map();
  }

  create() {
    this.boardLayer = this.add.graphics();
    this.chainLayer = this.add.graphics();
    this.highlightLayer = this.add.graphics();
    this.selectionLayer = this.add.graphics();
    this.cameraController = new CameraController(this);
    this.effects = new EffectsManager(this);

    this.tweens.add({ targets: this.highlightLayer, alpha: { from: 0.35, to: 1 }, duration: 650, yoyo: true, repeat: -1 });

    this.tweens.add({ targets: this.chainLayer, alpha: { from: 0.65, to: 1 }, duration: 900, yoyo: true, repeat: -1, ease: "Sine.InOut" });

    this.input.on("pointerup", (pointer) => {
      if (!this.cameraController.wasClick()) return;
      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const { q, r } = pixelToAxial(worldPoint.x, worldPoint.y, HEX_SIZE);
      const cell = this.cellsByKey.get(hexKey(q, r));
      if (cell && this.onHexClick) this.onHexClick({ q, r });
    });

    this.cameras.main.centerOn(0, 0);
  }

  updateState(gameState, selectedHex, highlightKeys = []) {
    this.playersById = new Map(gameState.players.map((p) => [p.id, p]));
    const nextCellsByKey = new Map(gameState.board.map((c) => [hexKey(c.q, c.r), c]));

    this._diffAndAnimate(gameState.board, nextCellsByKey);
    this._celebrateNewChains(gameState.activeSupplyChains || []);
    this.cellsByKey = nextCellsByKey;
    this._drawBoard(gameState.board);
    this._drawSupplyChains(gameState.activeSupplyChains);
    this._drawHighlights(highlightKeys);
    this._drawSelection(selectedHex);

    this.prevBoardByKey = nextCellsByKey;
  }

  _hexToScreen(q, r) {
    return axialToPixel(q, r, HEX_SIZE);
  }

  _drawBoard(board) {
    this.boardLayer.clear();
    for (const cell of board) {
      const { x, y } = this._hexToScreen(cell.q, cell.r);
      drawTerrain(this.boardLayer, x, y, HEX_SIZE, cell.terrain);
      if (cell.ownerId) {
        const owner = this.playersById.get(cell.ownerId);
        drawTerritory(this.boardLayer, x, y, HEX_SIZE, {
          ownerColorHex: colorForPlayer(owner),
          fortificationLevel: cell.fortificationLevel,
        });
      }
      if (cell.building) {
        const owner = this.playersById.get(cell.ownerId);
        drawBuilding(this.boardLayer, x, y, HEX_SIZE, cell.building, colorForPlayer(owner));
      }
    }
  }

  _drawSupplyChains(chains) {
    this.chainLayer.clear();
    drawSupplyChains(
      this.chainLayer,
      chains || [],
      (key) => {
        const [q, r] = key.split(",").map(Number);
        return this._hexToScreen(q, r);
      },
      (playerId) => colorForPlayer(this.playersById.get(playerId))
    );
  }

  _drawHighlights(highlightKeys) {
    this.highlightLayer.clear();
    for (const key of highlightKeys) {
      const [q, r] = key.split(",").map(Number);
      const { x, y } = this._hexToScreen(q, r);
      drawHighlight(this.highlightLayer, x, y, HEX_SIZE, 0x5eeaff);
    }
  }

  _drawSelection(selectedHex) {
    this.selectionLayer.clear();
    if (!selectedHex) return;
    const { x, y } = this._hexToScreen(selectedHex.q, selectedHex.r);
    drawSelection(this.selectionLayer, x, y, HEX_SIZE);
  }

  // Burst + label on the City endpoint when a Supply Chain newly becomes active.
  _celebrateNewChains(chains) {
    const keys = new Set(chains.map((c) => `${c.playerId}|${c.sourceKey}`));
    if (this.prevChainKeys) {
      for (const chain of chains) {
        if (this.prevChainKeys.has(`${chain.playerId}|${chain.sourceKey}`)) continue;
        const [q, r] = chain.cityKey.split(",").map(Number);
        const { x, y } = this._hexToScreen(q, r);
        const color = colorForPlayer(this.playersById.get(chain.playerId));
        this.effects.burst(x, y, color);
        this._floatText(x, y - 8, "SUPPLY CHAIN", color);
      }
    }
    this.prevChainKeys = keys;
  }

  _floatText(x, y, text, color) {
    const label = this.add
      .text(x, y - 10, text, { fontFamily: "Orbitron, monospace", fontSize: "11px", color: `#${color.toString(16).padStart(6, "0")}` })
      .setOrigin(0.5);
    this.tweens.add({ targets: label, y: y - 40, alpha: 0, duration: 900, ease: "Cubic.Out", onComplete: () => label.destroy() });
  }

  // Compares against the previous board snapshot to trigger capture/build
  // feedback (spec.md §67-70) without the server needing to send separate
  // animation commands — the diff itself is the event.
  _diffAndAnimate(board, nextCellsByKey) {
    if (this.prevBoardByKey.size === 0) return;
    for (const cell of board) {
      const key = hexKey(cell.q, cell.r);
      const prev = this.prevBoardByKey.get(key);
      if (!prev) continue;
      const { x, y } = this._hexToScreen(cell.q, cell.r);

      if (prev.ownerId !== cell.ownerId && cell.ownerId) {
        const color = colorForPlayer(this.playersById.get(cell.ownerId));
        this.effects.flash(x, y, HEX_SIZE, color);
        this.effects.burst(x, y, color);
        if (prev.ownerId) this.effects.shake();
        this._floatText(x, y, prev.ownerId ? "CAPTURED" : "+1", color);
      } else if (prev.building !== cell.building && cell.building) {
        this.effects.flash(x, y, HEX_SIZE, colorForPlayer(this.playersById.get(cell.ownerId)));
      } else if (prev.fortificationLevel !== cell.fortificationLevel) {
        this.effects.flash(x, y, HEX_SIZE * 0.6, colorForPlayer(this.playersById.get(cell.ownerId)));
      }
    }
  }
}
