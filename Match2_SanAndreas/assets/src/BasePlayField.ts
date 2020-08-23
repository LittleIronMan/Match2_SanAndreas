import gameConfig from "./GameConfig";
import { LEFT, RIGHT, DOWN, UP, OK } from "./Constants";
import * as C from "./Constants";
import BaseTile, { TileType } from "./BaseTile";
import Pos from "./Pos";

type Dir = (typeof RIGHT | typeof LEFT);

export interface FieldProps {
    width: number;
    height: number;
    countColors: number;
}

export interface SetOnFieldOptions {
    /**
     * Флаг того, что функция применяется при инициализации поля,
     * это означает что тайл нужно сразу поместить на целевую позицию
     */
    onInit?: true,

    /**
     * Тайл размещается на поле после "выпадения" сверху, например.
     * Его нужно разместить чуть выше самого верхнего ряда.
     */
    onDrop?: true,

    onGenerating?: true
}

/** Тип для множества уникальных дискретных позиций */
type PosHashMap<T> = {[posHash: number]: T};
type TilesSet = PosHashMap<BaseTile>;

const FOUR_SIDES = [{x: LEFT, y: 0}, {x: RIGHT, y: 0}, {x: 0, y: DOWN}, {x: 0, y: UP}];


const DEFAULT_TRIGGER = LEFT;

const DENY_FALL_TO_SIDE = 0;
const MISMATCH_TRIGGER = 1;
const TRIGGER_MATCH = 2;
enum TriggersMatchValue { DENY_FALL_TO_SIDE = 0, MISMATCH_TRIGGER = 1, TRIGGER_MATCH = 1 };

/** Базовый класс для игрового поля */
export default class BasePlayField {
    /** Ширина поля(в тайлах) */
    width: number;

    /** Высота поля */
    height: number;

    /** Максимальное количество различных цветов тайлов на поле */
    countColors: number;

    /**
     * Двумерный массив тайлов(width * height).
     * Визуально индексация начинается с верхней-левой ячейки поля.
     */
    field: (BaseTile | null)[][];

    /** Множество предустановленных тайлов, выпадающих из точек рождения */
    dropDownTiles: {[posHash: number]: number[]} = {};

    /** Множество заблокированных клеток поля */
    blockedCells: PosHashMap<1> = {};

    /**
     * Для заданной ячейки возвращает рекомендуемое направление движения вниз-вбок В эту ячейку.
     * Например, для если для ячейки (3,3) триггер == -1,
     * то это означает что рекомендуется падение в эту ячейку ИЗ ЛЕВОГО столбца, при прочих равных.
     * Используется для чередования падений вбок в некоторые ячейки.
     */
    fallToSideTriggers: {[posHash: number]: Dir} = {};

    /**
     * @param width ширина поля(в тайлах, т.е. натуральное число)
     * @param height высота поля
     * @param countColors максимальное кол-во различных цветов тайлов на поле
     */
    constructor({width, height, countColors}: FieldProps) {
        this.width = width;
        this.height = height;
        this.countColors = countColors;
        this.field = Array(width);
        for (let x = 0; x < width; x++) {
            this.field[x] = Array(height);
            for (let y = 0; y < height; y++) {
                this.field[x][y] = null;
            }
        }
    }

    /**
     * Функция создания нового тайла на поле,
     * Может быть перегружена в классах-наследниках
     */
    createTile(type: TileType, color: number = C.ANY_COLOR): BaseTile {
        const newTile = new BaseTile(type, color);
        return newTile;
    }

    protected _setTileOnField(tile: BaseTile | null, x: number, y: number) {
        const oldTile = this.field[x][y]; // старый тайл на том месте, на которое мы хотим поставить новый тайл
        if (oldTile) {
            oldTile.onField = false;
        }
        if (tile && tile.onField && !tile.pos.equals(x, y)) {
            // убираем новый тайл с его предыдущего места
            this.field[tile.pos.x][tile.pos.y] = null;
        }
        // устанавливаем тайл на новое место
        this.field[x][y] = tile;
        if (tile) {
            tile.prevPos.set(tile.pos.x, tile.pos.y);
            tile.pos.set(x, y);
            tile.onField = true;
        }
    }

    /** Ставит(переставляет) тайл на поле, обновляя соответствующие переменные */
    setTileOnField(tile: BaseTile | null, x: number, y: number, opts: SetOnFieldOptions = {}) {
        this._setTileOnField(tile, x, y);
    }

    /**
     * Инициализация поля с помощью предустановленных чисел.
     * Каждому числу соответствует цвет тайла, 0 - пустая клетка.
     * Обрати внимание, что матрица arr транспонирована относительно field,
     * это сделано для удобного задния поля в коде.
     * Вероятно, основное применение этой функции - тестирование.
     */
    initWith(arr: number[][]) {
        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                let color = arr[y][x];
                if (color == C.ANY_COLOR) {
                    color = this.getRandomColor();
                }
                if (color > 0) {
                    const newTile = this.createTile(TileType.SIMPLE, color);
                    this.setTileOnField(newTile, x, y, {onInit: true});
                }
                else if (color === C.BLOCKED_CELL) {
                    const posHash = this.getPosHash(x, y);
                    this.blockedCells[posHash] = OK;

                    const newTile = this.createTile(TileType.BLOCK, color);
                    this.setTileOnField(newTile, x, y, {onInit: true});
                    this.setTileOnField(null, x, y);
                }
                else if (color === C.BOMB_TAG) {
                    const bomb = this.createTile(TileType.BOMB, color);
                    this.setTileOnField(bomb, x, y, {onInit: true});
                }
            }
        }
    }

    /**
     * (Для тестов) Сравнивает цвета тайлов на поле с соответствующими числами массива,
     * если число равно 0 - подразумевается пустая клетка, если -1 - значит не сравниваем
     */
    equals(arr: number[][]) {
        let mismatchFound = false;
        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                const testValue = arr[y][x];

                if (testValue === C.ANY_COLOR) {
                    continue;
                }

                const tile = this.field[x][y];

                if (!tile) {
                    if (testValue === C.EMPTY_CELL) {
                        continue;
                    }
                    const posHash = this.getPosHash(x, y);
                    if (testValue === C.BLOCKED_CELL && this.blockedCells[posHash]) {
                        continue;
                    }
                    mismatchFound = true; break;
                }

                if (tile.color !== testValue) {
                    mismatchFound = true; break;
                }
            }

            if (mismatchFound) {
                break;
            }
        }
        return !mismatchFound;
    }

    getRandomColor(): number {
        return Math.floor(Math.random() * this.countColors) + 1;
    }

    /** Инициализация поля случайным образом */
    randomInit() {
        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                const color = this.getRandomColor();
                const newTile = this.createTile(TileType.SIMPLE, color);
                this.setTileOnField(newTile, x, y, {onInit: true});
            }
        }
    }

    canTileFallDown(tile: BaseTile): boolean {
        const tileDown = this.field[tile.pos.x][tile.pos.y + 1];
        if (tileDown) {
            // не двигаемся, если под тайлом другой тайл
            return false;
        }
        const downPosHash = this.getPosHash(tile.pos.x, tile.pos.y + 1);
        if (this.blockedCells[downPosHash]) {
            // не двигаемся, если ячейка снизу заблокирована
            return false;
        }
        return true;
    }

    canTileFallToSide(tile: BaseTile, dir: Dir, movedTiles: TilesSet): boolean {
        const x = tile.pos.x + dir;
        const y = tile.pos.y + 1;

        if (!this.isValidPos(x, y)) {
            return false;
        }

        const tileDown = this.field[x][y];
        if (tileDown) {
            // не двигаемся, если под тайлом другой тайл
            return false;
        }
        const downPosHash = this.getPosHash(x, y);
        if (this.blockedCells[downPosHash]) {
            // не двигаемся, если ячейка снизу заблокирована
            return false;
        }

        let denyFall = true;
        for (let yTop = tile.pos.y; yTop >= 0; yTop--) {
            const topPosHash = this.getPosHash(x, yTop);
            if (this.blockedCells[topPosHash]) {
                // если в нише, в которую хотим падать, сверху наткнулись на блокиратор - значит в эту нишу падать МОЖНО
                denyFall = false;
                break;
            }
            const topTile = this.field[x][yTop];
            if (topTile) {
                break;
            }
        }

        if (denyFall) {
            return false;
        }

        // за один вызов фукнции дискретного падения тайлов, 
        // в столбце из тайлов(без пустот и блокираторов) может упасть вбок только один тайл(самый верхний)
        // код ниже проверяет это условие
        for (const movedTile of Object.values(movedTiles)) {
            if ((movedTile.prevPos.x === tile.pos.x) && (movedTile.prevPos.x !== movedTile.pos.x)) {
                // нашелся сдвинутый вниз-вбок тайл из этого-же столбца

                if (movedTile.prevPos.y < tile.pos.y) {
                    // этот тайл был расположен выше текущего тайла

                    denyFall = true;
                    for (let yTop = tile.pos.y - 1; yTop > movedTile.prevPos.y; yTop--) {
                        // если между этими тайлами есть пустые клетки - снимаем запрет
                        let midTile = this.field[tile.pos.x][yTop];
                        if (!midTile) {
                            denyFall = false;
                            break;
                        }
                        // также снимаем запрет, если между этими тайлами есть блокиратор
                        const topPosHash = this.getPosHash(x, yTop);
                        if (this.blockedCells[topPosHash]) {
                            denyFall = false;
                            break;
                        }
                    }

                    if (denyFall) {
                        break;
                    }
                }
            }
        }

        if (denyFall) {
            return false;
        }

        return true;
    }

    /** Функция дискретного перемещения тайлов на единицу СТРОГО ВНИЗ, с учетом других тайлов и особенностей поля. */
    oneMoveStrictDownTiles(movedTiles: TilesSet): TilesSet {
        /** Множество тайлов, сдвинутых вертикально вниз */
        const tilesMovedDown: TilesSet = {};

        for (let y = this.height - 2; y >= 0; y--) {
            for (let x = 0; x < this.width; x++) {
                const posHash = this.getPosHash(x, y);
                if (movedTiles[posHash]) {
                    continue;
                }

                const tile = this.field[x][y];
                if (!tile) {
                    // тайл не найден в ячейке
                    continue;
                }

                if (!this.canTileFallDown(tile)) {
                    continue;
                }

                this.setTileOnField(tile, x, y + 1);
                const downPosHash = this.getPosHash(x, y + 1);
                tilesMovedDown[downPosHash] = tile;
                movedTiles[downPosHash] = tile;
            }
        }

        return tilesMovedDown;
    }

    private moveTileToSide(tile: BaseTile, dir: Dir, movedTiles: TilesSet, lastMovedTiles: TilesSet) {
        const x = tile.pos.x + dir;
        const y = tile.pos.y + 1;

        this.setTileOnField(tile, x, y);

        const downPosHash = this.getPosHash(x, y);

        this.fallToSideTriggers[downPosHash] = dir;

        movedTiles[downPosHash] = tile;
        lastMovedTiles[downPosHash] = tile;
    }

    getTriggersMatchValue(x: number, y: number, dir: Dir, trgrUp: Dir, movedTiles: TilesSet): TriggersMatchValue {
        let result: TriggersMatchValue = DENY_FALL_TO_SIDE;

        if (!this.isValidPos(x, y)) {
            return result;
        }

        const posHash = this.getPosHash(x, y);

        if (movedTiles[posHash]) {
            return result;
        }

        const tile = this.field[x][y];

        if (!tile) {
            return result;
        }

        if (this.canTileFallDown(tile)) {
            // не трогаем те тайлы, которые могут падать вниз
            return result;
        }

        if (!this.canTileFallToSide(tile, dir, movedTiles)) {
            return result;
        }

        if (trgrUp === -dir) {
            result = TRIGGER_MATCH;
        }
        else {
            result = MISMATCH_TRIGGER;
        }

        return result;
    }

    /** Функция дискретного перемещения тайлов на единицу ВНИЗ И В БОК, с учетом других тайлов и особенностей поля. */
    oneMoveDownAndSideTiles(movedTiles: TilesSet): TilesSet {
        /** Множество тайлов, сдвинутых вниз-вбок */
        const tilesMovedToSide: TilesSet = {};

        for (let y = 0; y <= this.height - 2; y++) {
            for (let x = 0; x < this.width; x++) {
                let dirToFall: Dir | 0 = 0;

                const posHash = this.getPosHash(x, y);

                let leftDirTriggerMatch = DENY_FALL_TO_SIDE;

                // для каждого тайла проверяем возможность падать вниз-вбок слева направо
                for (const dir of [LEFT, RIGHT] as Dir[]) {
                    let trgrUp = this.fallToSideTriggers[this.getPosHash(x + dir, y + 1)];
                    if (!trgrUp) {
                        trgrUp = DEFAULT_TRIGGER;
                    }

                    let triggerMatch = this.getTriggersMatchValue(x, y, dir, trgrUp, movedTiles);

                    if (triggerMatch === TRIGGER_MATCH) {
                        // тайл может упасть по заданному направлению, и триггер совпадает
                        dirToFall = dir;
                        break;
                    }

                    if (triggerMatch === DENY_FALL_TO_SIDE) {
                        if (dir === LEFT) {
                            // тайл не может падать влево, проверяем правое направление
                            leftDirTriggerMatch = DENY_FALL_TO_SIDE;
                            continue;
                        }
                        else if (leftDirTriggerMatch === MISMATCH_TRIGGER) {
                            // тайл не может падать направо, но может налево(но триггер не сопадает),
                            // значит тайл упадет налево, игнорируя триггер
                            dirToFall = LEFT;
                            break;
                        }
                        else {
                            // тайл не может падать ни влево, ни направо
                            break;
                        }
                    }

                    // далее по коду подразумевается что triggerMatch === MISMATCH_TRIGGER

                    // проверяем тайл, расположенный на той-же строке, но через один столбец(x + 2 * dir, y)
                    // который тоже может хотеть упасть в ячейку (x + dir, y + 1)
                    // будем называть этот тайл "соперником"(rival)
                    const rivalX = x + 2 * dir;
                    const rivalDir = -dir as Dir;
                    let rivalTriggersMatch = this.getTriggersMatchValue(rivalX, y, rivalDir, trgrUp, movedTiles);

                    if (rivalTriggersMatch === TRIGGER_MATCH) {
                        // если тайл-соперник тоже хочет падать в эту ячейку(x + dir, y + 1),
                        // и триггер указывает на него,
                        // значит соперник будет сдвинут.
                        this.moveTileToSide(this.field[rivalX][y] as BaseTile, rivalDir, movedTiles, tilesMovedToSide);
                        if (dir === LEFT) {
                            leftDirTriggerMatch = DENY_FALL_TO_SIDE;
                        }
                        continue;
                    }
                    else if (rivalTriggersMatch === DENY_FALL_TO_SIDE) {
                        if (dir === LEFT) {
                            // если еще не проверили второе направление падения(направо),
                            // то проверяем
                            leftDirTriggerMatch = MISMATCH_TRIGGER;
                            continue;
                        }
                        else if (leftDirTriggerMatch === DENY_FALL_TO_SIDE) {
                            // тайл не может падать влево, но может направо(но триггер не сопадает),
                            // значит тайл упадет направо, игнорируя триггер
                            dirToFall = RIGHT;
                            break;
                        }
                        else if (leftDirTriggerMatch === MISMATCH_TRIGGER) {
                            // Если тайл имеет возможность падать в оба направления(соперников нет),
                            // но для обоих направлений не соостветствуют триггеры в ячейках,
                            // значит тайл будет падать влево, игнорируя триггер в левой ячейке.
                            dirToFall = LEFT;
                            break;
                        }
                    }
                }

                if (dirToFall !== 0) {
                    this.moveTileToSide(this.field[x][y] as BaseTile, dirToFall, movedTiles, tilesMovedToSide);
                }
            }
        }

        return tilesMovedToSide;
    }

    /** Функция дискретного перемещения тайлов на единицу вниз(в т.ч. и вниз-вбок), с учетом других тайлов и особенностей поля. */
    oneMoveDownTiles() {
        let movedTiles: TilesSet = {}

        let needRepeat;
        do {
            needRepeat = false;

            /** Сначала двигаем тайлы вертикально вниз */
            const movedStrictDown = this.oneMoveStrictDownTiles(movedTiles);

            /** Двигаем вниз-вбок те тайлы, которые не могут падать вертикально вниз */
            const movedToSide = this.oneMoveDownAndSideTiles(movedTiles);
            if (Object.keys(movedToSide).length > 0) {
                needRepeat = true;
            }

        } while (needRepeat);

        let hasNewTiles = false;
        // рождаем новые тайлы, если в этом есть необходимость
        const y = 0;
        for (let x = 0; x < this.width; x++) {
            const tile = this.field[x][y];
            if (tile) {
                // тайлы не рождаются в ячейках, если в них уже есть другие тайлы
                continue;
            }
            const posHash = this.getPosHash(x, y);
            if (this.blockedCells[posHash]) {
                // запрещаем рождение тайлов в заблокированные клетки поля
                continue;
            }

            let color: number;
            const presetColors: number[] | undefined = this.dropDownTiles[posHash];
            if (presetColors && presetColors.length > 0) {
                color = presetColors.pop() as number; 
            }
            else {
                color = this.getRandomColor();
            }
            const newTile = this.createTile(TileType.SIMPLE, color);
            this.setTileOnField(newTile, x, 0, {onDrop: true});

            hasNewTiles = true;
        }

        const hasDownMove = ((Object.keys(movedTiles).length > 0) || hasNewTiles);
        return hasDownMove;
    }

    /** Проверяет что позиция валидна для текущих размеров поля */
    isValidPos(x: number, y: number): boolean {
        if (x < 0 || x >= this.width) return false;
        if (y < 0 || y >= this.height) return false;
        return true;
    }

    /** Возвращает группу смежных тайлов того-же цвета, что и в выбранной ячейке. */
    findGroup(x: number, y: number, targetColor: number): Pos[] {
        const result: Pos[] = [];

        if (!this.isValidPos(x, y)) {
            return result;
        }

        /** Кэш для ячеек, отмеченных при вычислении группы */
        const fieldMask: {[posHash: number]: 1} = {};

        const W = this.width;
        fieldMask[this.getPosHash(x, y)] = OK;

        let groupToCheck = [new Pos(x, y)];

        while (groupToCheck.length > 0) {
            const nextGroup: Pos[] = [];
            for (const pos of groupToCheck) {
                result.push(pos);
                for (const delta of FOUR_SIDES) {
                    const newX = pos.x + delta.x;
                    const newY = pos.y + delta.y;
                    if (!this.isValidPos(newX, newY)) {
                        continue;
                    }
                    const newPosHash = this.getPosHash(newX, newY);
                    if (fieldMask[newPosHash]) {
                        continue;
                    }
                    fieldMask[newPosHash] = OK; // Запоминаем, что эту ячейку мы уже проверили
                    const tile = this.field[newX][newY];
                    if (!tile || (tile.color != targetColor)) {
                        continue;
                    }
                    nextGroup.push(new Pos(newX, newY));
                }
            }
            result.concat(groupToCheck);
            groupToCheck = nextGroup;
        }
        return result;
    }

    /**
     * Для выбранного тайла находится группа смежных с ним тайлов того-же цвета.
     * Эта группа уничтожается с поля.
     */
    strikeTo(x: number, y: number) {
        if (!this.isValidPos(x, y)) {
            return;
        }
        const tile = this.field[x][y];
        if (!tile) {
            return;
        }
        const group = this.findGroup(x, y, tile.color);
        if (group.length < gameConfig.K) {
            return;
        }
        // уничтожаем группу тайлов на поле
        group.forEach(pos => {
            this.field[pos.x][pos.y] = null;
        })
    }

    /** Хэширует двумерный целочисленный вектор в скаляр. */
    getPosHash(x: number, y: number): number {
        return y * this.width + x;
    }

    getExplAreaForBomb(x: number, y: number): Pos[] {

        const explosion: Pos[] = [];

        const R = C.BOMB_EXPLOSION_RADIUS;

        for (let dx = -R; dx <= R; dx++) {
            for (let dy = -R; dy <= R; dy++) {

                if (Math.abs(dx) + Math.abs(dy) > R) {
                    continue;
                }

                const xx = x + dx;
                const yy = y + dy;

                if (!this.isValidPos(xx, yy)) {
                    continue;
                }

                const victim = this.field[xx][yy];
                if (!victim) {
                    continue;
                }
                
                explosion.push(victim.pos);
            }
        }

        return explosion;
    }
}