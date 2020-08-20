import BasePlayField from "./BasePlayField";
import Pos from "./Pos";
import BaseTile from "./BaseTile";
import { TILE_HEIGHT, TILE_WIDTH } from "./Constants";
import TileRender from "./TileRender";
import Tile from "./Tile";
import TilesFabric from "./TilesFabric";
import TilesMoveManager from "./TilesMoveManager";

/**
 * @class
 * @classdesc Хранит в себе состояние поля фишек
 */
export default class PlayField extends BasePlayField {
    node: cc.Node;
    tilesPrefab: TileRender = null as any;

    /** флаг того, что необходимо пересчитать дискретные позиции тайлов */
    needCheckTilesFall = false;

    /** флаг того, что на поле активна анимация уничтожения тайлов */
    tilesKillDetected = false;

    /** флаг того, что тайлы на поле в данный момент двигаются */
    tilesFallDetected = false;

    moveManager: TilesMoveManager = null as any;

    hasActionsOnField(): boolean {
        return this.tilesFallDetected || this.tilesKillDetected;
    }

    constructor(args: {width: number, height: number, countColors: number}) {
        super(args);
        this.node = new cc.Node();
        this.moveManager = new TilesMoveManager(this);
    }

    /**
     * Перегруженная фабрика, для создания "реальных" тайлов.
     * @param color {number} Цвет тайла - натуральное число <= C(кол-ву цветов на поле)
     * @returns Новый объект реального тайла
     * @public
     */
    createTile(color: number): BaseTile {
        const newTile = TilesFabric.create(color, this.tilesPrefab);

        this.node.addChild(newTile.renderTile.node);
        return newTile;
    }

    /**
     * Перегруженная функция установки тайла на поле,
     * также обновляет "реальную" позицию тайла на сцене
     * @param tile Тайл(или его отсутствие) для установки на поле
     * @param x Координата X для установке на поле(натуральное число)
     * @param y Координата Y
     * @param onInit Флаг того, что функция применяется при инициализации поля,
     * это означает что тайл нужно сразу поместить на целевую позицию
     * @param onDrop Тайл размещается на поле после "выпадения" сверху, например.
     * Его нужно разместить чуть выше самого верхнего ряда.
     */
    setTileOnField(tile: Tile | null, x: number, y: number, onInit=false, onDrop=false) {
        this._setTileOnField(tile, x, y);
        if (tile) {
            if (onInit || onDrop) {
                // при инициализации массива тайлов, или при рождении новых тайлов -
                // устанавливаем их ноды на сцене
                const pos = this.fieldPosToScenePos(tile.pos);
                if (onDrop) {
                    const downTile = this.field[x][1] as Tile;
                    if (downTile && downTile.isDropped) {
                        pos.y = downTile.renderTile.node.y + TILE_HEIGHT;
                    }
                    else {
                        pos.y += TILE_HEIGHT;
                    }
                    tile.isDropped = true;
                    tile.renderTile.node.opacity = 0;
                }
                tile.renderTile.node.setPosition(pos);
            }
        }
        else {

        }
    }

    /** Конвертирует дискретную позицию тайла на поле в "пиксельную" позицию на сцене. Мемоизирована */
    fieldPosToScenePos(fieldPos: Pos): cc.Vec2 {
        const hash = fieldPos.x * 100 + fieldPos.y;
        const cache = this._mem1[hash];
        if (cache) { return cache.clone(); }
        const pos = cc.v2((fieldPos.x - 0.5 * (this.width - 1)) * TILE_WIDTH, (0.5 * (this.height - 1) - fieldPos.y) * TILE_HEIGHT);
        this._mem1[hash] = pos;
        return pos.clone();
    }
    private _mem1: {[hash: number]: cc.Vec2} = {}

    scenePosToFieldPos(scenePos: cc.Vec2): Pos {
        const pos = this.node.convertToNodeSpaceAR(scenePos); // позиция относительно центра поля
        const centerOffset = cc.v2(this.width * TILE_WIDTH, -this.height * TILE_HEIGHT).mul(0.5);
        const topLeftPos = pos.add(centerOffset); // позиция относительно верхнего-левого угла поля
        const fieldPos = new Pos(Math.floor(topLeftPos.x / TILE_WIDTH), Math.floor(-topLeftPos.y / TILE_HEIGHT));
        return fieldPos;
    }

    getTileAt(x: number, y: number): Tile | null {
        if (!this.isValidPos(x, y)) {
            return null;
        }
        const tile = this.field[x][y] as Tile;
        return tile;
    }

    moveTiles(dt: number) {
        const moveDetected = this.moveManager.moveTiles(dt);

        let newFalls = false;

        if (this.needCheckTilesFall) {
            this.needCheckTilesFall = false;
            newFalls = this.oneMoveDownTiles();
        }

        this.tilesFallDetected = moveDetected || newFalls;
    }
}