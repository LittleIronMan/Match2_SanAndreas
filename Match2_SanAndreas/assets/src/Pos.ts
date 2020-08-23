/**
 * @class
 * @classdesc Класс Pos - координаты ячейки тайла на поле.
 * Чаще всего применяется с координатами в целочесленном виде,
 * но в некоторых рассчетах также могут устанавливаться и координаты с плавающей точкой.
 */
export default class Pos {
    x = 0;
    y = 0;

    static INVALID_POS = new Pos(-1, -1);

    set(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    setPos(pos: Pos) {
        this.x = pos.x;
        this.y = pos.y;
    }

    addSelf(val: Pos) {
        this.x += val.x;
        this.y += val.y;
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

    toV2(): cc.Vec2 {
        return cc.v2(this.x, this.y);
    }
}
