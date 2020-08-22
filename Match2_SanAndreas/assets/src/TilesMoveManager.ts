import { TILE_HEIGHT } from "./Constants";
import PlayField from "./PlayField";
import Tile from "./Tile";
import Pos from "./Pos";

class UpdatePosResult {
    posUpdated = false;
    pos: cc.Vec2;
    targetPosUpdated = false;
    needNewTarget = false;
    constructor(currentPos: cc.Vec2) {
        this.pos = currentPos;
    }
}

export default class TilesMoveManager {

    moveTiles(dt: number, playField: PlayField): boolean {
        const topTileY = playField.fieldPosToScenePos(new Pos(0, 0)).y;

        let moveDetected = false;

        for (let x = 0; x < playField.width; x++) {

            for (let y = playField.height - 1; y >= 0; y--) {

                const tile = playField.field[x][y] as Tile;

                if (!tile) {
                    continue;
                }

                if (tile.trajectory.length === 0) {
                    tile.fallTime = 0;
                    continue;
                }

                const tNode = tile.renderTile.node;

                tile.fallTime += dt;

                const deltaMove = tile.getSpeed() * dt;
                const moveResult = TilesMoveManager.updateTilePos(tNode.getPosition(), tile.trajectory, deltaMove);

                if (moveResult.needNewTarget) {
                    playField.needCheckTilesFall = true;
                }

                if (moveResult.targetPosUpdated) {
                    tile.resetDroppedFlag();
                }

                if (moveResult.posUpdated) {
                    tNode.setPosition(moveResult.pos);
                    moveDetected = true;

                    if (tile.isDropped) {
                        // обновляем величину прозрачности для новорожденных тайлов
                        if ((moveResult.pos.y > topTileY) && (moveResult.pos.y < (topTileY + TILE_HEIGHT))) {
                            tNode.opacity = (1 - (moveResult.pos.y - topTileY) / TILE_HEIGHT) * 255;
                        }
                    }
                }

                if (!moveResult.needNewTarget) {
                    // если же в этом фрейме тайл еще НЕ достигает конца траектории,
                    // но достигнет его в следующем фрейме - это также значит, что пора пересчитать целевые позиции тайлов

                    const nextDeltaMove = tile.getSpeed(dt) * dt;
                    const nextMoveResult = TilesMoveManager.updateTilePos(moveResult.pos, [...tile.trajectory], nextDeltaMove);

                    if (nextMoveResult.needNewTarget) {
                        playField.needCheckTilesFall = true;
                    }
                }

            }
        }

        return moveDetected;
    }

    static updateTilePos(currentPos: cc.Vec2, path: cc.Vec2[], deltaMove: number): UpdatePosResult {
        const result = new UpdatePosResult(currentPos.clone());

        do {
            if (path.length === 0) {
                result.needNewTarget = true;
                break;
            }

            let targetPos = path[0];

            const {restDist, deltaMoveV} = TilesMoveManager.getRestDist(result.pos, targetPos, deltaMove);
            if (restDist <= 0) {
                result.pos.set(targetPos);
                result.posUpdated = true;

                // назначаем тайлу следующую точку траектории
                path.shift();
                result.targetPosUpdated = true;

                // restDist переносим на следующий участок траектории
                deltaMove = -restDist;

                continue;
            }

            result.pos.addSelf(deltaMoveV);
            result.posUpdated = true;

            break;

        } while (true);

        return result;
    }

    /**
     * Возвращает расстояние от тайла до его до целевой позиции ПОСЛЕ перемещения на заданную величину.
     * Результат может быть отрицательной величиной, что означает перелет.
     */
    static getRestDist(realPos: cc.Vec2, targetPos: cc.Vec2, deltaMove: number): { restDist: number, deltaMoveV: cc.Vec2} {
        /** вектор расстояния от текущей позиции до целевой */
        const deltaPos = targetPos.sub(realPos);

        /** направление движения */
        const moveDir = deltaPos.normalize();
        /** вектор перемещения в текущем фрейме */
        const deltaMoveV = moveDir.mul(deltaMove);

        const restDist = deltaPos.sub(deltaMoveV).dot(moveDir);

        return {restDist, deltaMoveV};
    }
}