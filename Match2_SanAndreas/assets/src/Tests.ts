import { BasePlayField, Pos } from './BasePlayField';
import { TILE_WIDTH, TILE_HEIGHT, EMPTY_CELL, ANY_COLOR } from './Constants';
import { PlayField } from './PlayField';

const fieldParams = {width: 3, height: 3, countColors: 4};
const X = EMPTY_CELL;
const A = ANY_COLOR;

type EqualsFunc<T> = (val: T, anotherVal: T) => boolean;
function WithEqualsMethod<T>(equalsFunc?: EqualsFunc<T>) {
    const _equalsFunc: EqualsFunc<T> =  equalsFunc? equalsFunc : ((a, b) => a === b);
    class NewClass {
        val: T;
        constructor(val: T) {
            this.val = val;
        }
        equals(anotherVal: T) {
            return _equalsFunc(this.val, anotherVal);
        }
        static create(initVal: T): NewClass {
            return new NewClass(initVal);
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
            [ X, X, X]
        ]);
        const TileColor = WithEqualsMethod<number>();
        function colorOfTile(x: number, y: number): InstanceType<typeof TileColor> {
            let color: number;
            let tile = f.field[x][y];
            if (!tile) {
                color = X;
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
        results.push(   colorOfTile(0,2).equals(X)   );
        results.push(   colorOfTile(1,2).equals(X)   );
        results.push(   colorOfTile(2,2).equals(X)   );

        return results;
    }});

    testList.push({name: "Strike #1", func: () => {
        const f = new BasePlayField(fieldParams);
        f.initWith([
            [ 3, 3, 1],
            [ 4, 2, 1],
            [ 4, 2, 3]
        ]);
        f.strikeTo(1, 1);
        return f.equals([
            [ 3, 3, 1],
            [ 4, X, 1],
            [ 4, X, 3]
        ]);
    }});

    testList.push({name: "Move #1", func: () => {
        const f = new BasePlayField(fieldParams);
        f.initWith([
            [ 3, 3, 1],
            [ 4, 2, 1],
            [ X, X, X]
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
            [ 1, X, X]
        ]);
        f.oneMoveDownTiles();
        return f.equals([
            [ 3, A, A],
            [ 4, 3, 1],
            [ 1, 2, 1]
        ]);
    }});

    const scenePos = cc.v2;
    const fieldPos = (x: number, y: number) => new Pos(x, y);

    testList.push({name: "Position convert #1", func: () => {
        const f = new PlayField(fieldParams);

        const EPSILON = 0.01;
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
        const f = new PlayField(fieldParams);

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