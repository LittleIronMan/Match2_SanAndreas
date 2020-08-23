import PlayField from "./PlayField";
import Tile from "./Tile";
import Pos from "./Pos";

class UpdatePosResult {
    posUpdated = false;
    pos: Pos;
    targetPosUpdated = false;
    needNewTarget = false;
    constructor(currentPos: Pos) {
        this.pos = currentPos;
    }
}

export default class TilesMoveManager {

    moveTiles(dt: number, playField: PlayField): boolean {
        const topTileY = 0;

        let moveDetected = false;

        for (let x = 0; x < playField.width; x++) {

            for (let y = playField.height - 1; y >= 0; y--) {

                const tile = playField.field[x][y] as Tile;

                if (!tile) {
                    continue;
                }

                const tNode = tile.renderTile.node;

                if (tile.trajectory.length === 0) {
                    tile.fallTime = 0;
                    tNode.zIndex = 0;
                    continue;
                }

                tNode.zIndex = 1;

                tile.fallTime += dt;

                const deltaMove = tile.getSpeed() * dt;
                const moveResult = TilesMoveManager.updateTilePos(tile.getRealPos(), tile.trajectory, deltaMove);

                if (moveResult.needNewTarget) {
                    playField.needCheckTilesFall = true;
                }

                if (moveResult.targetPosUpdated) {
                    tile.resetDroppedFlag();
                }

                if (moveResult.posUpdated) {
                    tile.setRealPos(moveResult.pos, playField);
                    moveDetected = true;

                    if (tile.isDropped) {
                        // обновляем величину прозрачности для новорожденных тайлов
                        if ((moveResult.pos.y < topTileY) && (moveResult.pos.y > (topTileY - 1))) {
                            tNode.opacity = (1 - (topTileY - moveResult.pos.y)) * 255;
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

    static updateTilePos(currentPos: Pos, path: Pos[], deltaMove: number): UpdatePosResult {
        const result = new UpdatePosResult(currentPos.clone());

        do {
            if (path.length === 0) {
                result.needNewTarget = true;
                break;
            }

            let targetPos = path[0];

            const {restDist, deltaMoveV} = TilesMoveManager.getRestDist(result.pos, targetPos, deltaMove);
            if (restDist <= 0) {
                result.pos.setPos(targetPos);
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
    static getRestDist(realPos: Pos, targetPos: Pos, deltaMove: number): { restDist: number, deltaMoveV: Pos} {
        /** вектор расстояния от текущей позиции до целевой */
        const deltaPos = targetPos.toV2().sub(realPos.toV2());

        /** направление движения */
        const moveDir = deltaPos.normalize();
        /** вектор перемещения в текущем фрейме */
        const deltaMoveV = moveDir.mul(deltaMove);

        const restDist = deltaPos.sub(deltaMoveV).dot(moveDir);

        return {restDist, deltaMoveV: new Pos(deltaMoveV.x, deltaMoveV.y)};
    }
}