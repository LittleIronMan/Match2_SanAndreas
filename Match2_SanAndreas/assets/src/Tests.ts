import { BasePlayField, BaseTile, Pos } from './BasePlayField';
import { tileWidth, tileHeight } from './SceneGameplay';
import { PlayField } from './PlayField';

export function testAll(): boolean {
    let testList: {name: string, func: () => boolean}[] = [];
    testList.push({name: "Init #1", func: () => {
        let f = new BasePlayField(3, 3, 4);
        f.initWith([
            [3,3,1],
            [4,2,1],
            [0,0,0]
        ]);
        let checkArr: {pos: Pos, color: number}[] = [];
        /* Следующая фукнция просто для сокращенной записи условий для проверки всех тайлов */
        function p (x: number, y: number, color: number) {
            checkArr.push({pos: new Pos(x, y), color: color});
        }
        p(0,0, 3);
        p(1,0, 3);
        p(2,0, 1);
        p(0,1, 4);
        p(1,1, 2);
        p(2,1, 1);
        p(0,2, 0);
        p(1,2, 0);
        p(2,2, 0);
        for (let ch of checkArr) {
            let tile = f.field[ch.pos.x][ch.pos.y];
            if (!tile) {
                if (ch.color !== 0) {
                    return false;
                }
                continue;
            }
            if (tile.color !== ch.color) {
                return false;
            }
        }
        return true;
    }});
    testList.push({name: "Strike #1", func: () => {
        let f = new BasePlayField(3, 3, 4);
        f.initWith([
            [ 3, 3, 1],
            [ 4, 2, 1],
            [ 4, 2, 3]
        ]);
        f.strikeTo(1, 1);
        return f.equals([
            [ 3, 3, 1],
            [ 4, 0, 1],
            [ 4, 0, 3]
        ]);
    }});
    testList.push({name: "Move #1", func: () => {
        let f = new BasePlayField(3, 3, 4);
        f.initWith([
            [ 3, 3, 1],
            [ 4, 2, 1],
            [ 0, 0, 0]
        ]);
        f.oneMoveDownTiles();
        return f.equals([
            [-1,-1,-1],
            [ 3, 3, 1],
            [ 4, 2, 1]
        ]);
    }});
    testList.push({name: "Move #2", func: () => {
        let f = new BasePlayField(3, 3, 4);
        f.initWith([
            [ 3, 3, 1],
            [ 4, 2, 1],
            [ 1, 0, 0]
        ]);
        f.oneMoveDownTiles();
        return f.equals([
            [ 3,-1,-1],
            [ 4, 3, 1],
            [ 1, 2, 1]
        ]);
    }});
    testList.push({name: "Position convert #1", func: () => {
        let f = new PlayField(3, 3, 4);
        function test(fx: number, fy: number, sx: number, sy: number): boolean {
            return (f.fieldPosToScenePos(new Pos(fx, fy)).sub(cc.v2(sx, sy)).len() < 0.01);
        }
        let result1 = test(1,1,  0,0);
        let result2 = test(0,0,  -tileWidth,tileHeight);
        return result1 && result2;
    }});
    testList.push({name: "Position convert #2", func: () => {
        let f = new PlayField(3, 3, 4);
        function test(sx: number, sy: number, fx: number, fy: number): boolean {
            return f.scenePosToFieldPos(cc.v2(sx, sy)).equal(fx, fy);
        }
        let result1 = test(0, 0,   1,1);
        let result2 = test(0.25*tileWidth, 0.25*tileHeight,  1,1);
        let result3 = test(-0.25*tileWidth, -0.25*tileHeight,  1,1);
        let result4 = test(-tileWidth, tileHeight,  0,0);
        return result1 && result2 && result3 && result4;
    }});

    let fail = false;
    for (let test of testList) {
        if (!test.func()) {
            fail = true;
            console.log(`Test ${test.name} failed!`);
        }
    }
    if (!fail) {
        console.log(`All ${testList.length} tests OK!`);
    }
    return !fail;
}