/** Класс Pos - дискретная позиция тайла на поле */
export default class Pos {
    x = 0;
    y = 0;
    set(x: number, y: number) {
        this.x = x;
        this.y = y;
    }
    equals(x: number, y: number) {
        return (this.x === x && this.y === y);
    }
    equal(anotherPos: Pos) {
        return (this.x === anotherPos.x && this.y === anotherPos.y);
    }
    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }
    clone(): Pos {
        return new Pos(this.x, this.y);
    }
    static INVALID_POS = new Pos(-1, -1);
}
