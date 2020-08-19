import BasePlayField from "./BasePlayField";
import Pos from "./Pos";
import BaseTile from "./BaseTile";
import { TILES_ACCELERATION, TILES_MAX_SPEED, ALPHA_MAX, TILE_HEIGHT, TILE_WIDTH } from "./Constants";
import TileRender from "./TileRender";
import Tile from "./Tile";

class ColumnInfo {
    /** @description Общее время падения столбца */
    fallTime: number = 0;

    /**
     * @description Считает скорость движения тайлов в столбце, исходя из общего времени падения fallTime.
     * @param futureDt {number} Если передать аргумент futureDt,
     * то эта величина времени прибавляется к fallTime,
     * тем самым рассчитывается "будущая" скорость.
     * @returns {number} Cкорость тайлов в столбце
     * @public
     */
    getSpeed(futureDt=0): number {
        let speed = TILES_ACCELERATION * (this.fallTime + futureDt);
        speed = Math.min(speed, TILES_MAX_SPEED);
        return speed;
    }

    /** @description Движется ли тайл, или нет. */
    isMove(): boolean {
        return this.fallTime > 0;
    }
}

const SAN_ANDREAS_GANGS_CONFIG: {name: string, avatars: number, color: string}[] = [
    { name: "ballas", avatars: 4, color: "#780088" },
    { name: "grove", avatars: 4, color: "#3DD166" },
    { name: "police", avatars: 5, color: "#4148FD" },
    { name: "vagos", avatars: 3, color: "#FFF153" },
    { name: "triads", avatars: 3, color: "#080808" },
    { name: "aztecas", avatars: 3, color: "#28F3EB" },
    { name: "rifa", avatars: 4, color: "#527881" },
];

/**
 * @class
 * @classdesc Хранит в себе состояние поля фишек
 */
export default class PlayField extends BasePlayField {
    node: cc.Node;
    tilesPrefab: TileRender = null as any;
    columns: ColumnInfo[] = []; // массив с информацией о двигающихся столбцах с тайлами
    needCheckTilesFall = false; // флаг того, что необходимо пересчитать дискретные позиции тайлов
    tilesFallDetected = false; // флаг того, что тайлы на поле в данный момент двигаются
    tilesKillDetected = false; // флаг того, что на поле активна анимация уничтожения тайлов
    hasActionsOnField(): boolean {
        return this.tilesFallDetected || this.tilesKillDetected;
    }

    /**
     * @param width ширина поля(в тайлах, т.е. натуральное число)
     * @param height высота поля
     * @param countColors максимальное кол-во различных цветов тайлов на поле
     */
    constructor(args: {width: number, height: number, countColors: number}) {
        super(args);
        this.node = new cc.Node();
        for (let x = 0; x < args.width; x++) {
            this.columns.push(new ColumnInfo());
        }
    }

    /**
     * Перегруженная фабрика, для создания "реальных" тайлов.
     * @param color {number} Цвет тайла - натуральное число <= C(кол-ву цветов на поле)
     * @returns Новый объект реального тайла
     * @public
     */
    createTile(color: number): BaseTile {
        const newTile = new Tile(color);

        const t = cc.instantiate(this.tilesPrefab.node).getComponent(TileRender);
        const gConf = SAN_ANDREAS_GANGS_CONFIG[color - 1];
        const fileName = "gangs/" + gConf.name
            + (Math.floor(Math.random() * gConf.avatars) + 1) + ".png";
        t.frame.color = cc.color().fromHEX(gConf.color);
        t.glass.color = cc.color().fromHEX(gConf.color);
        t.avatar.spriteFrame = cc.loader.getRes(fileName, cc.SpriteFrame);

        newTile.renderTile = t;
        this.node.addChild(t.node);
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
        const topTileY = this.fieldPosToScenePos(new Pos(0, 0)).y;

        this.tilesFallDetected = false;
        for (let x = 0; x < this.width; x++) {
            const column = this.columns[x];
            let columnFallDetected = false;
            for (let y = this.height - 1; y >= 0; y--) {
                const tile = this.field[x][y] as Tile;
                if (!tile) {
                    continue;
                }
                const tNode = tile.renderTile.node;
                const realPos = tNode.getPosition();
                const targetPos = this.fieldPosToScenePos(tile.pos);
                // тайл движется тогда, когда не равны его целевая и текущая позиции
                if (!realPos.equals(targetPos)) {
                    if (!columnFallDetected) {
                        columnFallDetected = true;
                        column.fallTime += dt;
                    }
                    let nextTilePos: cc.Vec2;
                    // Если после перемещения тайла с его текущей скорость
                    // он(тайл) перелетит свою целевую позицию,
                    // то ставим тайл на целевую позицию (т.е. останавливаем его движение).
                    // При этом устанавливаем флаг пересчета дискретных(а значит и целевых) позиций тайлов
                    const nextY = realPos.y - (column.getSpeed() * dt);
                    if (nextY <= targetPos.y) {
                        nextTilePos = targetPos;
                        // #todo анимация остановки тайла
                        this.needCheckTilesFall = true;
                        if (tile.isDropped) {
                            tile.isDropped = false;
                            tNode.opacity = ALPHA_MAX;
                        }
                    }
                    else {
                        nextTilePos = cc.v2(realPos.x, nextY);
                        // если же в этом фрейме тайл еще НЕ перелетает целевую позицию,
                        // но перелетит её в следующем фрейме - это также значит, что пора пересчитать целевые позиции тайлов
                        const nextNextY = nextY - (column.getSpeed(dt) * dt);
                        if (nextNextY <= targetPos.y) {
                            this.needCheckTilesFall = true;
                        }
                        if (tile.isDropped) {
                            // обновляем величину прозрачности для новорожденных тайлов
                            if (realPos.y <= topTileY) {
                                tile.isDropped = false;
                                tNode.opacity = ALPHA_MAX;
                            }
                            if ((realPos.y > topTileY) && (realPos.y < (topTileY + TILE_HEIGHT))) {
                                tNode.opacity = (1 - (realPos.y - topTileY) / TILE_HEIGHT) * 255;
                            }
                        }
                    }
                    tNode.setPosition(nextTilePos);
                }
            }
            if (columnFallDetected) {
                this.tilesFallDetected = true;
            }
            else {
                column.fallTime = 0;
            }
        }
        if (this.needCheckTilesFall) {
            this.needCheckTilesFall = false;
            const newFalls = this.oneMoveDownTiles();
            this.tilesFallDetected = this.tilesFallDetected || newFalls;
        }
    }
}