import BaseTile from "./BaseTile";
import TileRender from "./TileRender";

export default class Tile extends BaseTile {
    /** @description ссылка на нод, который рендерит тайл на сцене */
    renderTile: TileRender;

    /** @description фишка только что выпала с неба, еще появляется */
    isDropped = false;

    constructor(color: number) {
        super(color);
        this.renderTile = null as any; // чтобы компилятор не ругался, после вызова фукнции createTile - поле node никогда не будет null
    }
}
