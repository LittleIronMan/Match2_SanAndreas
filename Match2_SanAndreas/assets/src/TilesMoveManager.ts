import { TILES_ACCELERATION, TILES_MAX_SPEED, ALPHA_MAX, TILE_HEIGHT } from "./Constants";
import PlayField from "./PlayField";
import Tile from "./Tile";
import Pos from "./Pos";

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

export default class TilesMoveManager {
    /** массив с информацией о двигающихся столбцах с тайлами */
    columns: ColumnInfo[] = [];

    fieldRef: PlayField = null as any;

    constructor(field: PlayField) {
        this.fieldRef = field;

        for (let x = 0; x < field.width; x++) {
            this.columns.push(new ColumnInfo());
        }
    }

    moveTiles(dt: number): boolean {
        const topTileY = this.fieldRef.fieldPosToScenePos(new Pos(0, 0)).y;

        let moveDetected = false;

        for (let x = 0; x < this.fieldRef.width; x++) {
            const column = this.columns[x];
            let columnFallDetected = false;

            for (let y = this.fieldRef.height - 1; y >= 0; y--) {
                const tile = this.fieldRef.field[x][y] as Tile;

                if (!tile) {
                    continue;
                }

                const tNode = tile.renderTile.node;
                const realPos = tNode.getPosition();
                const targetPos = this.fieldRef.fieldPosToScenePos(tile.pos);

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
                        this.fieldRef.needCheckTilesFall = true;

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
                            this.fieldRef.needCheckTilesFall = true;
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
                moveDetected = true;
            }
            else {
                column.fallTime = 0;
            }
        }

        return moveDetected;
    }
}