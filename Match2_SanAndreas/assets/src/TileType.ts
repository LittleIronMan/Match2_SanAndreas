/**
 * Теги тайлов.
 * Тег однозначно задает особенности тайла.
 * Имея тег, можно установить тип тайла, цвет, тип бомбы и проч.
 */
const TileTag = {
    /** Тег пустой ячейки поля */
    EMPTY_CELL: 0,

    /** Тег тайла произвольного цвета */
    ANY_COLOR: -1,

    /** Тег заблокированной ячейки поля */
    BLOCKED_CELL: -2,

    /** Тег бомбы на поле */
    BOMB_TAG: -3,
} as const;

export { TileTag };

/**
 * Тип тайла.
 */
enum TileType { SIMPLE, BOMB, BLOCK };

export default TileType;
