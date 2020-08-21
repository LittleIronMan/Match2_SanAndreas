import Pos from "./Pos";

/** Базовый класс для тайлов */
export default class BaseTile {
    pos: Pos;
    color: number;
    onField = false; // находится ли тайл сейчас на игровом поле
    prevPos: Pos;
    constructor(color: number) {
        this.pos = Pos.INVALID_POS.clone();
        this.prevPos = Pos.INVALID_POS.clone();
        this.color = color;
    }
}
