import BaseTile from "./BaseTile";
import TileType from "./TileType";
import { TILES_ACCELERATION, TILES_MAX_SPEED, ALPHA_MAX } from "./Constants";
import Pos from "./Pos";
import PlayField from "./PlayField";

/**
 * @class
 * @classdesc Класс для тайлов, которые умеют рендериться и передвигаться по полю
 */
export default class Tile extends BaseTile {
    /** Ссылка на нод, который рендерит тайл на сцене */
    node: cc.Node;

    /** Тайл только что выпала с неба, еще появляется */
    isDropped = false;

    /** Общее время движения тайла */
    fallTime: number = 0;

    /** траектория перемещения тайла */
    trajectory: Pos[] = [];

    private _realPos: Pos = null as any;

    /**
     * Считает скорость движения тайла, исходя из общего времени падения fallTime.
     * @param futureDt Если передать аргумент futureDt,
     * то эта величина времени прибавляется к fallTime,
     * тем самым рассчитывается "будущая" скорость.
     * @returns Cкорость тайла
     * @public
     */
    getSpeed(futureDt = 0): number {
        let speed = TILES_ACCELERATION * (this.fallTime + futureDt);
        speed = Math.min(speed, TILES_MAX_SPEED);
        return speed;
    }

    resetDroppedFlag() {
        if (this.isDropped) {
            this.isDropped = false;
            this.node.opacity = ALPHA_MAX;
        }
    }

    getRealPos(): Pos {
        return this._realPos.clone();
    }

    setRealPos(newPos: Pos, playField: PlayField) {
        this._realPos = newPos;
        const pixelPos = playField.fieldPosToScenePos(newPos, false);
        this.node.setPosition(pixelPos);
    }

    constructor(type: TileType, color: number) {
        super(type, color);
        this.node = null as any;
    }
}
