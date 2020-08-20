import gameConfig from "./GameConfig";
import { ANY_COLOR, EMPTY_CELL } from "./Constants";
import BaseTile from "./BaseTile";
import Pos from "./Pos";

const FOUR_SIDES = [{x: -1, y: 0}, {x: 1, y: 0}, {x: 0, y: -1}, {x: 0, y: 1}];

/** Базовый класс для игрового поля */
export default class BasePlayField {
    /** Ширина поля(в тайлах) */
    width: number;

    /** Высота поля */
    height: number;

    /** Максимальное количество различных цветов тайлов на поле */
    countColors: number;

    /**
     * Массив тайлов(width * height).
     * Визуально индексация начинается с верхней-левой ячейки поля.
     */
    field: (BaseTile | null)[][];

    /** Массив предустановленных тайлов, выпадающих сверху*/
    dropDownTiles: number[][];

    /**
     * @param width ширина поля(в тайлах, т.е. натуральное число)
     * @param height высота поля
     * @param countColors максимальное кол-во различных цветов тайлов на поле
     */
    constructor({width, height, countColors}: {width: number, height: number, countColors: number}) {
        this.width = width;
        this.height = height;
        this.countColors = countColors;
        this.field = Array(width);
        this.dropDownTiles = Array(width);
        for (let x = 0; x < width; x++) {
            this.field[x] = Array(height);
            this.dropDownTiles[x] = [];
            for (let y = 0; y < height; y++) {
                this.field[x][y] = null;
            }
        }
    }

    /**
     * Функция создания нового тайла на поле,
     * Может быть перегружена в классах-наследниках
     */
    createTile(color: number): BaseTile {
        const newTile = new BaseTile(color);
        return newTile;
    }

    protected _setTileOnField(tile: BaseTile | null, x: number, y: number) {
        if (tile && tile.onField && !tile.pos.equals(x, y)) {
            // убираем тайл с его старого места
            this.field[tile.pos.x][tile.pos.y] = null;
            const oldTile = this.field[x][y]; // старый тайл на том месте, на которое мы хотим поставить новый тайл
            if (oldTile) {
                // по-хорошему - такой ситуации не должно быть
                oldTile.onField = false;
            }
        }
        // устанавливаем тайл на новое место
        this.field[x][y] = tile;
        if (tile) {
            tile.pos.set(x, y);
            tile.onField = true;
        }
    }

    /** Ставит(переставляет) тайл на поле, обновляя соответствующие переменные */
    setTileOnField(tile: BaseTile | null, x: number, y: number, onInit=false, onDrop=false) {
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
                const color = arr[y][x];
                if (color > 0) {
                    const newTile = this.createTile(color);
                    this.setTileOnField(newTile, x, y, true);
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
                if (testValue === ANY_COLOR) {
                    continue;
                }
                const tile = this.field[x][y];
                if (!tile) {
                    if (testValue !== EMPTY_CELL) {
                        mismatchFound = true; break;
                    }
                    continue;
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
                const newTile = this.createTile(color);
                this.setTileOnField(newTile, x, y, true);
            }
        }
    }

    /** Функция дискретного перемещения тайлов на единицу вниз, с учетом других тайлов. */
    oneMoveDownTiles() {
        let hasDownMove = false;
        for (let y = this.height - 2; y >= 0; y--) {
            for (let x = 0; x < this.width; x++) {
                const tile = this.field[x][y];
                if (!tile) {
                    // тайл не найден в ячейке
                    continue;
                }
                const tileDown = this.field[x][y + 1];
                if (tileDown) {
                    // не двигаемся, если под тайлом препятствие
                    continue;
                }
                this.setTileOnField(tile, x, y + 1);
                hasDownMove = true;
            }
        }
        // рождаем новые тайлы, если в этом есть необходимость
        for (let x = 0; x < this.width; x++) {
            const tile = this.field[x][0];
            if (tile) {
                continue;
            }
            let color: number;
            if (this.dropDownTiles[x].length > 0) {
                color = this.dropDownTiles[x].pop() as number; 
            }
            else {
                color = this.getRandomColor();
            }
            const newTile = this.createTile(color);
            this.setTileOnField(newTile, x, 0, false, true);
        }
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

        /** Дополнительный массив, соразмерный с полем, используется для промежуточных вычислений */
        const fieldMask: (1 | undefined)[] = Array(this.width * this.height);

        const W = this.width;
        fieldMask[y*W + x] = 1;

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
                    if (fieldMask[newY*W + newX]) {
                        continue;
                    }
                    fieldMask[newY*W + newX] = 1; // делаем метку на поле, что эту ячейку мы уже проверили
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
}