import { testAll } from "./M2S_Tests";
import { M2S_BasePlayField, M2S_BaseTile, Pos } from "./M2S_BasePlayField";

const N = 8;
const M = 8;
const C = 5;

export const tileWidth = 171;
export const tileHeight = 192;

const gangsConfig: {name: string, avatars: number, color: string}[] = [
    { name: "ballas", avatars: 4, color: "#780088" },
    { name: "grove", avatars: 4, color: "#3DD166" },
    { name: "police", avatars: 5, color: "#4148FD" },
    { name: "vagos", avatars: 3, color: "#FFF153" },
    { name: "triads", avatars: 3, color: "#080808" },
    { name: "aztecas", avatars: 3, color: "#28F3EB" },
    { name: "rifa", avatars: 4, color: "#527881" },
];

export class M2S_Tile extends M2S_BaseTile {
    node: cc.Node;
    isDropped = false; /** фишка только что выпала с неба, еще появляется */
    constructor(color: number) {
        super(color);
        this.node = null as any; // чтобы компилятор не ругался, после вызова фукнции createTile - поле node никогда не будет null
    }
}

class ColumnInfo {
    fallTime: number = 0;
    /** Считает скорость движения тайлов в столбце, исходя из общего времени падения fallTime.
     *  Если передать аргумент futureDt, то эта величина времени прибавляется к fallTime,
     *  тем самым рассчитывается "будущая" скорость.
     */
    getSpeed(futureDt=0): number {
        let speed = 8000 * (this.fallTime + futureDt);
        speed = Math.min(speed, 2300);
        return speed;
    }
    isMove() {
        return this.fallTime > 0;
    }
}

export class M2S_PlayField extends M2S_BasePlayField {
    node: cc.Node;
    tilesPrefab: cc.Node = null as any;
    columns: ColumnInfo[] = []; // массив с информацией о двигающихся столбцах с тайлами
    needCheckTilesFall = false; // флаг того, что необходимо пересчитать дискретные позиции тайлов
    tilesFallDetected = false; // флаг того, что тайлы на поле в данный момент двигаются
    tilesKillDetected = false; // флаг того, что на поле активна анимация уничтожения тайлов
    hasActionsOnField(): boolean {
        return this.tilesFallDetected || this.tilesKillDetected;
    }

    constructor(width: number, height: number, countColors: number) {
        super(width, height, countColors);
        this.node = new cc.Node();
        for (let x = 0; x < width; x++) {
            this.columns.push(new ColumnInfo());
        }
    }
    /** Перегруженная фабрика, для создания "реальных" тайлов. */
    createTile(color: number): M2S_BaseTile {
        let newTile = new M2S_Tile(color);

        let n = cc.instantiate(this.tilesPrefab);
        let avatar = n.getChildByName("avatar").getComponent(cc.Sprite);
        let frame = n.getChildByName("frame");
        let glass = n.getChildByName("glass");
        let gConf = gangsConfig[color - 1];
        let fileName = "gangs/" + gConf.name
            + (Math.floor(Math.random() * gConf.avatars) + 1) + ".png";
        frame.color = cc.color().fromHEX(gConf.color);
        glass.color = cc.color().fromHEX(gConf.color);
        avatar.spriteFrame = cc.loader.getRes(fileName, cc.SpriteFrame);

        newTile.node = n;
        this.node.addChild(newTile.node);
        return newTile;
    }
    /** Перегруженная функция установки тайла на поле,
     *  также обновляет "реальную" позицию тайла на сцене
     */
    setTileOnField(tile: M2S_Tile | null, x: number, y: number, onInit=false, onDrop=false) {
        this._setTileOnField(tile, x, y);
        if (tile) {
            if (onInit || onDrop) {
                // при инициализации массива тайлов, или при рождении новых тайлов -
                // устанавливаем их ноды на сцене
                let pos = this.fieldPosToScenePos(tile.pos);
                if (onDrop) {
                    let downTile = this.field[x][1] as M2S_Tile;
                    if (downTile && downTile.isDropped) {
                        pos.y = downTile.node.y + tileHeight;
                    }
                    else {
                        pos.y += tileHeight;
                    }
                    tile.isDropped = true;
                    tile.node.opacity = 0;
                }
                tile.node.setPosition(pos);
            }
        }
        else {

        }
    }
    /** Конвертирует дискретную позицию тайла на поле в "пиксельную" позицию на сцене. Мемоизирована */
    fieldPosToScenePos(fieldPos: Pos): cc.Vec2 {
        let hash = fieldPos.x * 100 + fieldPos.y;
        let cache = this._mem1[hash];
        if (cache) { return cache.clone(); }
        let pos = cc.v2((fieldPos.x - 0.5 * (this.width - 1)) * tileWidth, (0.5 * (this.height - 1) - fieldPos.y) * tileHeight);
        this._mem1[hash] = pos;
        return pos.clone();
    }
    private _mem1: {[hash: number]: cc.Vec2} = {}

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
        let topTileY = this.fieldPosToScenePos(new Pos(0, 0)).y;

        this.tilesFallDetected = false;
        for (let x = 0; x < this.width; x++) {
            let column = this.columns[x];
            let columnFallDetected = false;
            for (let y = this.height - 1; y >= 0; y--) {
                let tile = this.field[x][y] as M2S_Tile;
                if (!tile) {
                    continue;
                }
                let realPos = tile.node.getPosition();
                let targetPos = this.fieldPosToScenePos(tile.pos);
                // тайл движется тогда, когда не равны его целевая и текущая позиции
                if (!realPos.equals(targetPos)) {
                    if (!columnFallDetected) {
                        columnFallDetected = true;
                        column.fallTime += dt;
                    }
                    let nextTilePos: cc.Vec2;
                    // Если после перемещения тайла с его текущей скорость
                    // он(тайл) перелетит свою целевую позицию,
                    // то ставим тайл на целевую позицию (т.е. останавливаем его движение).
                    // При этом устанавливаем флаг пересчета дискретных(а значит и целевых) позиций тайлов
                    let nextY = realPos.y - (column.getSpeed() * dt);
                    if (nextY <= targetPos.y) {
                        nextTilePos = targetPos;
                        // #todo анимация остановки тайла
                        this.needCheckTilesFall = true;
                        if (tile.isDropped) {
                            tile.isDropped = false;
                            tile.node.opacity = 255;
                        }
                    }
                    else {
                        nextTilePos = cc.v2(realPos.x, nextY);
                        // если же в этом фрейме тайл еще НЕ перелетает целевую позицию,
                        // но перелетит её в следующем фрейме - это также значит, что пора пересчитать целевые позиции тайлов
                        let nextNextY = nextY - (column.getSpeed(dt) * dt);
                        if (nextNextY <= targetPos.y) {
                            this.needCheckTilesFall = true;
                        }
                        if (tile.isDropped) {
                            // обновляем величину прозрачности для новорожденных тайлов
                            if (realPos.y <= topTileY) {
                                tile.isDropped = false;
                                tile.node.opacity = 255;
                            }
                            if ((realPos.y > topTileY) && (realPos.y < (topTileY + tileHeight))) {
                                tile.node.opacity = (1 - (realPos.y - topTileY) / tileHeight) * 255;
                            }
                        }
                    }
                    tile.node.setPosition(nextTilePos);
                }
            }
            if (columnFallDetected) {
                this.tilesFallDetected = true;
            }
            else {
                column.fallTime = 0;
            }
        }
        if (this.needCheckTilesFall) {
            this.needCheckTilesFall = false;
            let newFalls = this.oneMoveDownTiles();
            this.tilesFallDetected = this.tilesFallDetected || newFalls;
        }
    }
}

const {ccclass, property} = cc._decorator;

@ccclass
export default class M2S_SceneGameplay extends cc.Component {
    @property(cc.Node)
    fieldPlace: cc.Node = null as any; // чтобы компилятор не ругался

    @property(cc.Node)
    tilesPrefab: cc.Node = null as any;
    initCompleted = false;

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
        if (!this.tilesPrefab) {
            console.log("Не установлен tilesPrefab!");
            return;
        }
        new Promise((resolve, reject) => {
            cc.loader.loadResDir('gangs', cc.SpriteFrame, function (err: Error, frames: cc.SpriteFrame[]) {
                resolve();
            });
        })
        .then(_ => {

        this.fieldPlace.addChild(this.playField.node);
        // заполняем поле тайлами
        this.playField.tilesPrefab = this.tilesPrefab;
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
            // блокируем тачи во время падений и анимаций на игровом поле
            if (this.playField.hasActionsOnField()) {
                return;
            }
            let fieldPos = this.playField.scenePosToFieldPos(event.touch.getLocation());
            this.touchStartTile = this.playField.getTileAt(fieldPos.x, fieldPos.y);
    
            //event.stopPropagation();
        });

        this.fieldPlace.on(cc.Node.EventType.TOUCH_MOVE, (event: cc.Event.EventTouch) => {
        });

        this.fieldPlace.on(cc.Node.EventType.TOUCH_END, (event: cc.Event.EventTouch) => {
            if (this.playField.hasActionsOnField()) {
                this.touchStartTile = null;
                return;
            }
            let fieldPos = this.playField.scenePosToFieldPos(event.touch.getLocation());
            let tile = this.playField.getTileAt(fieldPos.x, fieldPos.y);
            if (tile && (tile === this.touchStartTile)) {
                let group: Pos[] = [];
                this.playField.findGroup(fieldPos.x, fieldPos.y, tile.color, group);
                if (group.length >= 2) {
                    let killTiles: Promise<void>[] = [];
                    this.playField.tilesKillDetected = true;
                    group.forEach(pos => {
                        let tile = this.playField.getTileAt(pos.x, pos.y);
                        // сразу освобождаем место на поле
                        this.playField.setTileOnField(null, pos.x, pos.y);
                        // анимация уничтожения тайла
                        killTiles.push(new Promise((resolve, reject) => {
                            if (tile) {
                                cc.tween(tile.node)
                                    .to(0.3, {scale: 0.6, angle: 360})
                                    .call(() => resolve())
                                    .removeSelf()
                                    .start();
                            }
                        }));
                    });
                    // после уничтожения всех тайлов - нужно проверить поле на возможность падений
                    Promise.all(killTiles).then(_ => {
                        this.playField.tilesKillDetected = false;
                        this.playField.needCheckTilesFall = true;
                    });
                }
            }
            this.touchStartTile = null;
        });

        this.initCompleted = true;
        });
    }
    update(dt: number) {
        if (!this.initCompleted) {
            return;
        }
        this.playField.moveTiles(dt);
    }
}
