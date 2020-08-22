import BaseTile, { TileType } from "./BaseTile";
import TileRender from "./TileRender";
import { TILES_ACCELERATION, TILES_MAX_SPEED, ALPHA_MAX } from "./Constants";

export default class Tile extends BaseTile {
    /** @description Ссылка на нод, который рендерит тайл на сцене */
    renderTile: TileRender;

    /** @description Тайл только что выпала с неба, еще появляется */
    isDropped = false;

    /** @description Общее время падения столбца */
    fallTime: number = 0;

    /** траектория перемещения тайла */
    trajectory: cc.Vec2[] = [];

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

    resetDroppedFlag() {
        if (this.isDropped) {
            this.isDropped = false;
            this.renderTile.node.opacity = ALPHA_MAX;
        }
    }

    constructor(type: TileType, color: number) {
        super(type, color);
        this.renderTile = null as any; // чтобы компилятор не ругался, после вызова фукнции createTile - поле node никогда не будет null
    }
}
