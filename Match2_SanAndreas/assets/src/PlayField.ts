import BasePlayField, { SetOnFieldOptions, FieldProps } from "./BasePlayField";
import Pos from "./Pos";
import BaseTile from "./BaseTile";
import TileType, { TileTag } from "./TileType";
import { TILE_HEIGHT, TILE_WIDTH } from "./Constants";
import Tile from "./Tile";
import TilesFabric from "./TilesFabric";
import TilesMoveManager from "./TilesMoveManager";

/**
 * @class
 * @classdesc Хранит в себе состояние поля тайлов
 */
export default class PlayField extends BasePlayField {
    node: cc.Node;

    /** Фабрика для создания тайлов */
    tilesFabric: TilesFabric;

    /** Флаг того, что необходимо пересчитать дискретные позиции тайлов */
    needCheckTilesFall = false;

    /** Флаг того, что на поле активна анимация уничтожения тайлов */
    tilesKillDetected = false;

    /** Флаг того, что тайлы на поле в данный момент двигаются */
    tilesFallDetected = false;

    /** Менеджер перемещения тайлов по полю */
    moveManager: TilesMoveManager = null as any;

    hasActionsOnField(): boolean {
        return this.tilesFallDetected || this.tilesKillDetected;
    }

    constructor(props: FieldProps, tilesFabric: TilesFabric) {
        super(props);
        this.node = new cc.Node();
        this.moveManager = new TilesMoveManager();
        this.tilesFabric = tilesFabric;
    }

    /**
     * Перегруженная фабрика, для создания "реальных" тайлов.
     * @param type Тип тайла, обязательный аргумент
     * @param color Цвет тайла - натуральное число <= макс. кол-ву цветов на поле
     * @returns Новый объект реального тайла
     * @public
     */
    createTile(type: TileType, color = TileTag.ANY_COLOR): BaseTile {
        const newTile = this.tilesFabric.create(type, color);

        this.node.addChild(newTile.node);
        return newTile;
    }

    /**
     * Перегруженная функция установки тайла на поле,
     * также обновляет "реальную" позицию тайла на сцене
     * @param tile Тайл(или его отсутствие) для установки на поле
     * @param x Координата X для установке на поле(натуральное число)
     * @param y Координата Y
     * @param opts Дополнительная информация об установке тайла на поле
     */
    setTileOnField(tile: Tile | null, x: number, y: number, opts: SetOnFieldOptions = {}) {
        this._setTileOnField(tile, x, y);

        if (tile) {

            if (opts.onInit || opts.onDrop || opts.onGenerating) {

                // при инициализации массива тайлов, или при рождении новых тайлов -
                // устанавливаем их ноды на сцене
                const realPos = tile.pos.clone();

                if (opts.onDrop) {
                    tile.trajectory.push(new Pos(x, y));

                    const downTile = this.field[x][1] as Tile;
                    if (downTile && downTile.isDropped) {
                        realPos.y = downTile.getRealPos().y - 1;
                    }
                    else {
                        realPos.y = -1;
                    }
                    tile.isDropped = true;
                    tile.node.opacity = 0;
                }

                tile.setRealPos(realPos, this);

            }
            else {
                tile.trajectory.push(new Pos(x, y));
            }

        }
        else {

        }
    }

    /** Конвертирует дискретную позицию тайла на поле в "пиксельную" позицию на сцене. Мемоизирована */
    fieldPosToScenePos(fieldPos: Pos, memoize = true): cc.Vec2 {
        let hash: any;

        if (memoize) {
            hash = this.getPosHash(fieldPos.x, fieldPos.y);
            const cache = this._mem1[hash];
            if (cache) { return cache.clone(); }
        }

        const pos = cc.v2((fieldPos.x - 0.5 * (this.width - 1)) * TILE_WIDTH, (0.5 * (this.height - 1) - fieldPos.y) * TILE_HEIGHT);

        if (memoize) {
            this._mem1[hash] = pos;
        }

        return pos.clone();
    }
    private _mem1: { [hash: number]: cc.Vec2 } = {}

    /**
     * @param scenePos "Пиксельная" позиция тайла на сцене
     * @param roundValue Нужно ли округлять координаты результата(true по-умолчанию)
     * @return Эквивалентная позиция тайла на игровом поле, чаще всего вектор с целочисленными координатами
     */
    scenePosToFieldPos(scenePos: cc.Vec2, roundValue = true): Pos {
        const pos = this.node.convertToNodeSpaceAR(scenePos); // позиция относительно центра поля
        const centerOffset = cc.v2(this.width * TILE_WIDTH, -this.height * TILE_HEIGHT).mul(0.5);
        const topLeftPos = pos.add(centerOffset); // позиция относительно верхнего-левого угла поля
        let fieldPos = new Pos(topLeftPos.x / TILE_WIDTH, -topLeftPos.y / TILE_HEIGHT);
        if (roundValue) {
            fieldPos.x = Math.floor(fieldPos.x);
            fieldPos.y = Math.floor(fieldPos.y);
        }
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
        const moveDetected = this.moveManager.moveTiles(dt, this);

        let newFalls = false;

        if (this.needCheckTilesFall) {
            this.needCheckTilesFall = false;
            newFalls = this.oneMoveDownTiles();
        }

        this.tilesFallDetected = moveDetected || newFalls;
    }
}