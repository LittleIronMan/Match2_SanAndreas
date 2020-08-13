/** Класс Pos - дискретная позиция тайла на поле */
export class Pos {
    x = 0;
    y = 0;
    set(x: number, y: number) {
        this.x = x;
        this.y = y;
    }
    equal(x: number, y: number) {
        return (this.x === x && this.y === y);
    }
    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }
}

/** Базовый класс для тайлов */
export class M2S_BaseTile {
    pos: Pos;
    color: number;
    onField = false; // находится ли тайл сейчас на игровом поле
    constructor(x: number, y: number, color: number) {
        this.pos = new Pos(x, y);
        this.color = color;
    }
}

/** Базовый класс для игрового поля */
export class M2S_BasePlayField {
    /** Ширина поля(в тайлах) */
    width: number;

    /** Высота поля */
    height: number;

    /** Максимальное количество различных цветов тайлов на поле */
    countColors: number;

    /** Массив тайлов(width * height).
     *  Визуально индексация начинается с верхней-левой ячейки поля.
     */
    field: (M2S_BaseTile | null)[][];

    /** Дополнительный массив, соразмерный с полем, используется для промежуточных вычислений */
    private fieldMask: number[][];

    constructor(width: number, height: number, countColors: number) {
        this.width = width;
        this.height = height;
        this.countColors = countColors;
        this.field = Array(width);
        this.fieldMask = Array(width);
        for (let x = 0; x < width; x++) {
            this.field[x] = Array(height);
            this.fieldMask[x] = Array(height);
            for (let y = 0; y < height; y++) {
                this.field[x][y] = null;
                this.fieldMask[x][y] = 0;
            }
        }
    }

    /** Функция создания нового тайла на поле,
     *  Может быть перегружена в классах-наследниках
     */
    createTile(x: number, y: number, color: number): M2S_BaseTile {
        let newTile = new M2S_BaseTile(x, y, color);
        return newTile;
    }

    protected _setTileOnField(tile: M2S_BaseTile, x: number, y: number) {
        if (!tile.pos.equal(x, y)) {
            // убираем тайл с его старого места
            this.field[tile.pos.x][tile.pos.y] = null;
            let oldTile = this.field[x][y];
            if (oldTile) {
                // по-хорошему - такой ситуации не должно быть
                oldTile.onField = false;
            }
        }
        // устанавливаем тайл на новое место
        this.field[x][y] = tile;
        tile.pos.set(x, y);
        tile.onField = true;
    }
    /** Ставит(переставляет) тайл на поле, обновляя соответствующие переменные */
    setTileOnField(tile: M2S_BaseTile, x: number, y: number, onInit=false) {
        this._setTileOnField(tile, x, y);
    }

    /** Инициализация поля с помощью предустановленных чисел.
     *  Каждому числу соответствует цвет тайла, 0 - пустая клетка.
     *  Обрати внимание, что матрица arr транспонирована относительно field,
     *  это сделано для удобного задния поля в коде.
     *  Вероятно, основное применение этой функции - тестирование.
     */
    initWith(arr: number[][]) {
        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                let color = arr[y][x];
                if (color > 0) {
                    let newTile = this.createTile(x, y, color);
                    this.setTileOnField(newTile, x, y, true);
                }
            }
        }
    }
    /** (Для тестов) Сравнивает цвета тайлов на поле с соответствующими числами массива */
    equals(arr: number[][]) {
        let mismatchFound = false;
        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                let tile = this.field[x][y];
                if (!tile) {
                    if (arr[y][x] !== 0) {
                        mismatchFound = true; break;
                    }
                    continue;
                }
                if (tile.color !== arr[y][x]) {
                    mismatchFound = true; break;
                }
            }
            if (mismatchFound) {
                break;
            }
        }
        return !mismatchFound;
    }
    /** Инициализация поля случайным образом */
    randomInit() {
        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                let color = Math.floor(Math.random() * this.countColors) + 1;
                let newTile = this.createTile(x, y, color);
                this.setTileOnField(newTile, x, y, true);
            }
        }
    }

    /** Функция дискретного перемещения тайлов на единицу вниз, с учетом других тайлов. */
    oneMoveDownTiles() {
        for (let y = this.height - 2; y >= 0; y--) {
            for (let x = 0; x < this.width; x++) {
                let tile = this.field[x][y];
                if (!tile) {
                    // тайл не найден в ячейке
                    continue;
                }
                let tileDown = this.field[x][y + 1];
                if (tileDown) {
                    // не двигаемся, если под тайлом препятствие
                    continue;
                }
                this.setTileOnField(tile, x, y + 1);
            }
        }
    }

    /** Проверяет что позиция валидна для текущих размеров поля */
    isValidPos(x: number, y: number): boolean {
        if (x < 0 || x >= this.width) return false;
        if (y < 0 || y >= this.height) return false;
        return true;
    }

    /** Возвращает группу смежных тайлов того-же цвета, что и в выбранной ячейке. */
    findGroup(x: number, y: number, targetColor: number, group: Pos[], isFirstCall=true): boolean {
        if (!this.isValidPos(x, y)) {
            return false;
        }
        let tile = this.field[x][y];
        if (!tile || tile.color != targetColor) {
            return false;
        }
        if (this.fieldMask[x][y] !== 0) {
            return false;
        }
        group.push(new Pos(x, y));
        this.fieldMask[x][y] = 1; // делаем метку на поле, что эту ячейку мы уже проверили
        this.findGroup(x + 1, y, targetColor, group, false); // рекурсивно распространяем поиск во все стороны
        this.findGroup(x - 1, y, targetColor, group, false);
        this.findGroup(x, y + 1, targetColor, group, false);
        this.findGroup(x, y - 1, targetColor, group, false);
        if (isFirstCall) {
            // по завершению поиска - убираем метки с поля
            group.forEach(pos => { this.fieldMask[pos.x][pos.y] = 0; });
        }
        return true;
    }

    /** Для выбранного тайла находится группа смежных с ним тайлов того-же цвета.
     *  Эта группа уничтожается с поля.
     */
    strikeTo(x: number, y: number) {
        if (!this.isValidPos(x, y)) {
            return;
        }
        let tile = this.field[x][y];
        if (!tile) {
            return;
        }
        let group: Pos[] = [];
        this.findGroup(x, y, tile.color, group);
        if (group.length < 2) {
            return;
        }
        // уничтожаем группу тайлов на поле
        group.forEach(pos => {
            this.field[pos.x][pos.y] = null;
        })
    }
}