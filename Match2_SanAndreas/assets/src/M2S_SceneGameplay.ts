import { testAll } from "./M2S_Tests";
import { M2S_BasePlayField, M2S_BaseTile, Pos } from "./M2S_BasePlayField";

const N = 9;
const M = 9;
const C = 5;

const tileWidth = 171;
const tileHieght = 192;

const {ccclass, property} = cc._decorator;

class M2S_Tile extends M2S_BaseTile {
    node: cc.Node;
    constructor(x: number, y: number, color: number) {
        super(x, y, color);
        this.node = null as any; // чтобы компилятор успокоился, после вызова фукнции createTile - поле node никогда не будет null
    }
}

class PlayField extends M2S_BasePlayField {
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
    /** Перегруженная функция установки фишки на поле,
     *  также обновляет "реальную" позицию тайла на сцене
     */
    setTileOnField(tile: M2S_Tile, x: number, y: number, onInit=false) {
        this._setTileOnField(tile, x, y);
        if (onInit) {
            // при инициализации массива фишек - устанавливаем их на сцене на конечные позиции
            tile.node.setPosition(this.fieldPosToScenePos(tile.pos));
        }
        else {

        }
    }
    fieldPosToScenePos(fieldPos: Pos): cc.Vec2 {
        let pos = cc.v2((fieldPos.x - 0.5 * (this.width - 1)) * tileWidth, (0.5 * (this.height - 1) - fieldPos.y) * tileHieght);
        pos
        return pos;
    }
    moveTiles(dt: number) {

    }
}

@ccclass
export default class M2S_SceneGameplay extends cc.Component {
    @property(cc.Node)
    fieldPlace: cc.Node | null = null;

    @property(cc.Node)
    tilesSprites: cc.Node[] = [];

    playField = new PlayField(N, M, C);
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
        // заполняем поле фишками
        this.playField.tilesPrefabs = this.tilesSprites;
        this.playField.randomInit();
        // корректируем размер поля
        let w = this.fieldPlace.width = N * tileWidth + 80;
        let h = this.fieldPlace.height = M * tileHieght + 88;
        const fieldPadding = 100;
        let maxW = this.fieldPlace.parent.width - fieldPadding;
        let maxH = this.fieldPlace.parent.height - fieldPadding;
        let scaleW = 1, scaleH = 1;
        if (w > maxW) { scaleW = maxW / w; }
        if (h > maxH) { scaleH = maxH / h; }
        this.fieldPlace.scale = Math.min(scaleW, scaleH);
    }
    update(dt: number) {
        this.playField.moveTiles(dt);
    }
}
