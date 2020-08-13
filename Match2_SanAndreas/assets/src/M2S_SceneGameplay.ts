import { testAll } from "./M2S_Tests";
import { M2S_BasePlayField, M2S_BaseTile, Pos } from "./M2S_BasePlayField";

const N = 9;
const M = 9;
const C = 5;

export const tileWidth = 171;
export const tileHeight = 192;

export class M2S_Tile extends M2S_BaseTile {
    node: cc.Node;
    constructor(x: number, y: number, color: number) {
        super(x, y, color);
        this.node = null as any; // чтобы компилятор успокоился, после вызова фукнции createTile - поле node никогда не будет null
    }
}

export class M2S_PlayField extends M2S_BasePlayField {
    node: cc.Node;
    tilesPrefabs: cc.Node[] = [];
    constructor(width: number, height: number, countColors: number) {
        super(width, height, countColors);
        this.node = new cc.Node();
    }
    /** Перегруженная фабрика, для создания "реальных" тайлов. */
    createTile(x: number, y: number, color: number): M2S_BaseTile {
        let newTile = new M2S_Tile(x, y, color);
        newTile.node = cc.instantiate(this.tilesPrefabs[color - 1]);
        this.node.addChild(newTile.node);
        return newTile;
    }
    /** Перегруженная функция установки тайла на поле,
     *  также обновляет "реальную" позицию тайла на сцене
     */
    setTileOnField(tile: M2S_Tile, x: number, y: number, onInit=false) {
        this._setTileOnField(tile, x, y);
        if (onInit) {
            // при инициализации массива тайлов - устанавливаем их на сцене на конечные позиции
            tile.node.setPosition(this.fieldPosToScenePos(tile.pos));
        }
        else {

        }
    }
    fieldPosToScenePos(fieldPos: Pos): cc.Vec2 {
        let pos = cc.v2((fieldPos.x - 0.5 * (this.width - 1)) * tileWidth, (0.5 * (this.height - 1) - fieldPos.y) * tileHeight);
        return pos;
    }
    scenePosToFieldPos(scenePos: cc.Vec2): Pos {
        let pos = this.node.convertToNodeSpaceAR(scenePos); // позиция относительно центра поля
        let centerOffset = cc.v2(this.width * tileWidth, -this.height * tileHeight).mul(0.5);
        let topLeftPos = pos.add(centerOffset); // позиция относительно верхнего-левого угла поля
        let fieldPos = new Pos(Math.floor(topLeftPos.x / tileWidth), Math.floor(-topLeftPos.y / tileHeight));
        return fieldPos;
    }
    getTileAt(x: number, y: number): M2S_Tile | null {
        if (!this.isValidPos(x, y)) {
            return null;
        }
        let tile = this.field[x][y] as M2S_Tile;
        return tile;
    }
    moveTiles(dt: number) {

    }
}

const {ccclass, property} = cc._decorator;

@ccclass
export default class M2S_SceneGameplay extends cc.Component {
    @property(cc.Node)
    fieldPlace: cc.Node = null as any; // чтобы компилятор не ругался

    @property(cc.Node)
    tilesSprites: cc.Node[] = [];

    touchStartTile: M2S_Tile | null = null;

    playField = new M2S_PlayField(N, M, C);

    onLoad() {
        let testsSuccess = testAll();
        if (!testsSuccess) {
            return;
        }

        if (!this.fieldPlace) {
            console.log("Не установлен fieldPlace!");
            return;
        }
        if (this.tilesSprites.length < C) {
            console.log(`Определено ${this.tilesSprites.length} тайлов, а нужно ${C}!`);
            return;
        }
        this.fieldPlace.addChild(this.playField.node);
        // заполняем поле тайлами
        this.playField.tilesPrefabs = this.tilesSprites;
        this.playField.randomInit();
        // корректируем размер поля
        let w = this.fieldPlace.width = N * tileWidth + 80;
        let h = this.fieldPlace.height = M * tileHeight + 88;
        const fieldPadding = 100;
        let maxW = this.fieldPlace.parent.width - fieldPadding;
        let maxH = this.fieldPlace.parent.height - fieldPadding;
        let scaleW = 1, scaleH = 1;
        if (w > maxW) { scaleW = maxW / w; }
        if (h > maxH) { scaleH = maxH / h; }
        this.fieldPlace.scale = Math.min(scaleW, scaleH);

        this.fieldPlace.on(cc.Node.EventType.TOUCH_START, (event: cc.Event.EventTouch) => {
            let fieldPos = this.playField.scenePosToFieldPos(event.touch.getLocation());
            this.touchStartTile = this.playField.getTileAt(fieldPos.x, fieldPos.y);
    
            //event.stopPropagation();
        });

        this.fieldPlace.on(cc.Node.EventType.TOUCH_MOVE, (event: cc.Event.EventTouch) => {
        });

        this.fieldPlace.on(cc.Node.EventType.TOUCH_END, (event: cc.Event.EventTouch) => {
            let fieldPos = this.playField.scenePosToFieldPos(event.touch.getLocation());
            let tile = this.playField.getTileAt(fieldPos.x, fieldPos.y);
            if (tile && (tile === this.touchStartTile)) {
                tile.node.runAction(cc.rotateBy(0.5, 360));
            }
            this.touchStartTile = null;
        });
    }
    update(dt: number) {
        this.playField.moveTiles(dt);
    }
}
