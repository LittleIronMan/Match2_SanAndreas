import { TILES_ACCELERATION, TILES_MAX_SPEED, ALPHA_MAX, TILE_HEIGHT } from "./Constants";
import PlayField from "./PlayField";
import Tile from "./Tile";
import Pos from "./Pos";

export default class TilesMoveManager {
    fieldRef: PlayField = null as any;

    constructor(field: PlayField) {
        this.fieldRef = field;
    }

    moveTiles(dt: number): boolean {
        const topTileY = this.fieldRef.fieldPosToScenePos(new Pos(0, 0)).y;

        let moveDetected = false;

        for (let x = 0; x < this.fieldRef.width; x++) {

            for (let y = this.fieldRef.height - 1; y >= 0; y--) {
                const tile = this.fieldRef.field[x][y] as Tile;

                if (!tile) {
                    continue;
                }

                const tNode = tile.renderTile.node;
                const realPos = tNode.getPosition();
                const targetPos = this.fieldRef.fieldPosToScenePos(tile.pos);

                let tileIsMove = false;

                // тайл движется тогда, когда не равны его целевая и текущая позиции
                if (!realPos.equals(targetPos)) {

                    tileIsMove = true;
                    tile.fallTime += dt;

                    let nextTilePos: cc.Vec2;
                    // Если после перемещения тайла с его текущей скорость
                    // он(тайл) перелетит свою целевую позицию,
                    // то ставим тайл на целевую позицию (т.е. останавливаем его движение).
                    // При этом устанавливаем флаг пересчета дискретных(а значит и целевых) позиций тайлов
                    const nextY = realPos.y - (tile.getSpeed() * dt);

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
                        const nextNextY = nextY - (tile.getSpeed(dt) * dt);

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

                if (tileIsMove) {
                    moveDetected = true;
                }
                else {
                    tile.fallTime = 0;
                }
            }
        }

        return moveDetected;
    }
}