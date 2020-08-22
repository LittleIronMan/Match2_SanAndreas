import Pos from "./Pos";

export enum TileType { SIMPLE, BOMB, BLOCK };

/** Базовый класс для тайлов */
export default class BaseTile {
    pos: Pos;
    color: number;
    onField = false; // находится ли тайл сейчас на игровом поле
    prevPos: Pos;
    type: TileType;
    constructor(type: TileType, color: number) {
        this.pos = Pos.INVALID_POS.clone();
        this.prevPos = Pos.INVALID_POS.clone();
        this.color = color;
        this.type = type;
    }
}
