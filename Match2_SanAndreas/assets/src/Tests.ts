import BasePlayField from './BasePlayField';
import Pos from "./Pos";
import { TILE_WIDTH, TILE_HEIGHT, EMPTY_CELL, ANY_COLOR, BLOCKED_CELL } from './Constants';
import PlayField from './PlayField';
import TilesMoveManager from './TilesMoveManager';
import TilesFabric from './TilesFabric';

const fieldParams = {width: 3, height: 3, countColors: 4};
const _ = EMPTY_CELL;
const A = ANY_COLOR;
const BB = BLOCKED_CELL; // Почему BB? Потому что в массивах более заметно.

const EPSILON = 0.01;

type EqualsFunc<T> = (val: T, anotherVal: T) => boolean;
function WithEqualsMethod<T>(equalsFunc?: EqualsFunc<T>) {
    const _equalsFunc: EqualsFunc<T> = equalsFunc ? equalsFunc : ((a, b) => a === b);
    class NewClass {
        val: T;
        constructor(val: T) {
            this.val = val;
        }
        equals(anotherVal: T) {
            return _equalsFunc(this.val, anotherVal);
        }
    }
    return NewClass;
}

export function testAll(): boolean {
    const testList: {name: string, func: () => boolean[] | boolean}[] = [];

    testList.push({name: "Init #1", func: () => {
        const f = new BasePlayField(fieldParams);
        f.initWith([
            [ 3, 3, 1],
            [ 4, 2, 1],
            [ _, _, _]
        ]);
        const TileColor = WithEqualsMethod<number>();
        function colorOfTile(x: number, y: number): InstanceType<typeof TileColor> {
            let color: number;
            let tile = f.field[x][y];
            if (!tile) {
                color = EMPTY_CELL;
            }
            else {
                color = tile.color;
            }
            return new TileColor(color);
        }
        const results: boolean[] = [];
        results.push(   colorOfTile(0,0).equals(3)   );
        results.push(   colorOfTile(1,0).equals(3)   );
        results.push(   colorOfTile(2,0).equals(1)   );
        results.push(   colorOfTile(0,1).equals(4)   );
        results.push(   colorOfTile(1,1).equals(2)   );
        results.push(   colorOfTile(2,1).equals(1)   );
        results.push(   colorOfTile(0,2).equals(_)   );
        results.push(   colorOfTile(1,2).equals(_)   );
        results.push(   colorOfTile(2,2).equals(_)   );

        return results;
    }});

    testList.push({name: "Strike #1", func: () => {
        const f = new BasePlayField(fieldParams);
        const T = 2; // Target color
        f.initWith([
            [ 3, 3, 1],
            [ 4, T, 1],
            [ 4, T, 3]
        ]);
        f.strikeTo(1, 1);
        return f.equals([
            [ 3, 3, 1],
            [ 4, _, 1],
            [ 4, _, 3]
        ]);
    }});

    testList.push({name: "Strike #2", func: () => {
        const f = new BasePlayField({width: 6, height: 6, countColors: 4});
        const T = 1; // Target color
        f.initWith([
            [ A, A, 3, T, 4, A],
            [ 4, 2, 2, T, 3, 2],
            [ T, T, T, T, T, T],
            [ T, 4, T, 2, 4, T],
            [ T, 3, T, T, T, T],
            [ T, T, T, 3, 3, T],
        ]);
        f.strikeTo(2, 2);
        return f.equals([
            [ A, A, 3, _, 4, A],
            [ 4, 2, 2, _, 3, 2],
            [ _, _, _, _, _, _],
            [ _, 4, _, 2, 4, _],
            [ _, 3, _, _, _, _],
            [ _, _, _, 3, 3, _],
        ]);
    }});

    testList.push({name: "Move #1", func: () => {
        const f = new BasePlayField(fieldParams);
        f.initWith([
            [ 3, 3, 1],
            [ 4, 2, 1],
            [ _, _, _]
        ]);
        f.oneMoveDownTiles();
        return f.equals([
            [ A, A, A],
            [ 3, 3, 1],
            [ 4, 2, 1]
        ]);
    }});

    testList.push({name: "Move #2", func: () => {
        const f = new BasePlayField(fieldParams);
        f.initWith([
            [ 3, 3, 1],
            [ 4, 2, 1],
            [ 1, _, _]
        ]);
        f.oneMoveDownTiles();
        return f.equals([
            [ 3, A, A],
            [ 4, 3, 1],
            [ 1, 2, 1]
        ]);
    }});

    testList.push({name: "Move #3", func: () => {
        const f = new BasePlayField(fieldParams);
        f.initWith([
            [BB,BB,BB],
            [ 4, 2, 1],
            [ 1, _, _]
        ]);
        f.oneMoveDownTiles();
        return f.equals([
            [BB,BB,BB],
            [ 4, _, _],
            [ 1, 2, 1]
        ]);
    }});

    // тест диагональных падений
    testList.push({name: "Move #4", func: () => {
        const f = new BasePlayField({width: 6, height: 6, countColors: 4});
        const results: boolean[] = [];
        f.initWith([
            [ 3, A, 4, A, A, A],
            [ 1,BB, 2, A, A, A],
            [BB, 3,BB,BB, 3, A],
            [ 4, _, _,BB, 2, A],
            [ _, _, _, 1, A, A],
            [ _, _, _, A, A, A],
        ]);
        f.oneMoveDownTiles();
        results.push(f.equals([
            [ A, A, 4, A, A, A],
            [ 3,BB, 2, A, A, A],
            [BB, 1,BB,BB, A, A],
            [ _, 3, _,BB, 3, A],
            [ 4, _, _, 2, A, A],
            [ _, _, 1, A, A, A],
        ]));
        f.oneMoveDownTiles();
        results.push(f.equals([
            [ A, A, A, A, A, A],
            [ 3,BB, 4, A, A, A],
            [BB, 2,BB,BB, A, A],
            [ _, 1, _,BB, 3, A],
            [ _, 3, _, 2, A, A],
            [ 4, _, 1, A, A, A],
        ]));
        f.oneMoveDownTiles();
        results.push(f.equals([
            [ A, A, A, A, A, A],
            [ A,BB, 4, A, A, A],
            [BB, 3,BB,BB, A, A],
            [ _, 2, _,BB, 3, A],
            [ _, 1, _, 2, A, A],
            [ 4, 3, 1, A, A, A],
        ]));
        f.oneMoveDownTiles();
        results.push(f.equals([
            [ A, A, A, A, A, A],
            [ A,BB, A, A, A, A],
            [BB, 4,BB,BB, A, A],
            [ _, 2, 3,BB, 3, A],
            [ _, 1, _, 2, A, A],
            [ 4, 3, 1, A, A, A],
        ]));
        return results;
    }});

    const scenePos = cc.v2;
    const fieldPos = (x: number, y: number) => new Pos(x, y);

    testList.push({name: "Position convert #1", func: () => {
        const f = new PlayField(fieldParams, new TilesFabric());

        const ScenePos = WithEqualsMethod<cc.Vec2>((selfPos: cc.Vec2, anotherPos: cc.Vec2) => {
            return cc.Vec2.equals(selfPos, anotherPos, EPSILON);
        })
        function convert(fieldPos: Pos): InstanceType<typeof ScenePos> {
            return new ScenePos(f.fieldPosToScenePos(fieldPos));
        }

        const results: boolean[] = [];
        results.push(    convert(fieldPos(1,1)) .equals(scenePos(0,0))   );
        results.push(    convert(fieldPos(0,0)) .equals(scenePos(-TILE_WIDTH,TILE_HEIGHT))   );

        return results;
    }});

    testList.push({name: "Position convert #2", func: () => {
        const f = new PlayField(fieldParams, new TilesFabric());

        function convert(scenePos: cc.Vec2): Pos {
            return f.scenePosToFieldPos(scenePos);
        }

        const results: boolean[] = [];
        results.push(   convert(scenePos(0,0)) .equal(fieldPos(1,1))   );
        results.push(   convert(scenePos(0.25*TILE_WIDTH, 0.25*TILE_HEIGHT)) .equal(fieldPos(1,1))   );
        results.push(   convert(scenePos(-0.25*TILE_WIDTH, -0.25*TILE_HEIGHT)) .equal(fieldPos(1,1))   );
        results.push(   convert(scenePos(-TILE_WIDTH, TILE_HEIGHT)) .equal(fieldPos(0,0))   );

        return results;
    }});

    // проверяем установку флага targetPosUpdated (когда deltaMove больше длины первого учатстка траектории)
    testList.push({name: "Tiles move #1", func: () => {
        const results: boolean[] = [];

        const initPos = new Pos(0, 0);
        const path = [
            new Pos(1, 1),
            new Pos(2, 0)
        ];
        const deltaMove = 2;

        const moveResult = TilesMoveManager.updateTilePos(initPos, path, deltaMove);

        results.push(   moveResult.posUpdated   );
        results.push(   moveResult.targetPosUpdated   );
        results.push(   !moveResult.needNewTarget   );
        const q2 = Math.sqrt(2);
        results.push(   cc.Vec2.equals(moveResult.pos, new Pos(q2, 2 - q2), EPSILON)   );
        results.push(   path.length === 1   );

        return results;
    }});

    // проверяем установку флага needNewTarget (когда deltaMove больше длины ВСЕЙ траектории)
    testList.push({name: "Tiles move #2", func: () => {
        const results: boolean[] = [];

        const initPos = new Pos(0, 0);
        const path = [
            new Pos(1, 1),
            new Pos(2, 0)
        ];
        const deltaMove = 3;

        const moveResult = TilesMoveManager.updateTilePos(initPos, path, deltaMove);

        results.push(   moveResult.posUpdated   );
        results.push(   moveResult.targetPosUpdated   );
        results.push(   moveResult.needNewTarget   );
        results.push(   cc.Vec2.equals(moveResult.pos, new Pos(2, 0))   );
        results.push(   path.length === 0   );

        return results;
    }});

    // проверяем функцию обновления позиции в её штатном режиме
    testList.push({name: "Tiles move #3", func: () => {
        const results: boolean[] = [];

        const initPos = new Pos(0, 0);
        const path = [
            new Pos(1, 1),
            new Pos(2, 0)
        ];
        const deltaMove = 0.5;

        const moveResult = TilesMoveManager.updateTilePos(initPos, path, deltaMove);

        results.push(   moveResult.posUpdated   );
        results.push(   !moveResult.targetPosUpdated   );
        results.push(   !moveResult.needNewTarget   );
        const q = 0.5 / Math.sqrt(2);
        results.push(   cc.Vec2.equals(moveResult.pos, new Pos(q, q), EPSILON)   );
        results.push(   path.length === 2   );

        return results;
    }});

    let fail = false;
    for (const test of testList) {
        let result: boolean;

        let funcRes = test.func();
        if (funcRes instanceof Array) {
            result = funcRes.reduce((totalRes, localRes) => totalRes && localRes);
        }
        else {
            result = funcRes;
        }

        if (!result) {
            fail = true;
            console.log(`Test ${test.name} failed!`);
        }
    }

    if (!fail) {
        console.log(`All ${testList.length} tests OK!`);
    }

    return !fail;
}