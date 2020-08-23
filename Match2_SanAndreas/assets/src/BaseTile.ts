import Pos from "./Pos";

export enum TileType { SIMPLE, BOMB, BLOCK };

/**
 * @class
 * @classdesc Базовый класс для тайлов
 */
export default class BaseTile {
    /** Дискретная позиция тайла на поле */
    pos: Pos;

    /** Тип тайла */
    type: TileType;

    /** Цвет тайла */
    color: number;

    /** Находится ли тайл сейчас на игровом поле */
    onField = false;

    /** Предыдущая позиция тайла на игровом поле */
    prevPos: Pos;

    constructor(type: TileType, color: number) {
        this.pos = Pos.INVALID_POS.clone();
        this.prevPos = Pos.INVALID_POS.clone();
        this.color = color;
        this.type = type;
    }
}
