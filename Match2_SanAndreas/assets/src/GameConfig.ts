import * as C from "./Constants";

class GameConfig {
    /** ширина поля(в тайлах) */
    N = C.FIELD_WIDTH_DEFAULT;

    /** высота поля */
    M = C.FIELD_HEIGHT_DEFAULT;
    
    /** количество цветов */
    C = C.MAX_COLORS_ON_FIELD_DEFAULT;

    /** минимальный размер группы */
    K = C.MIN_TILES_GROUP_DEFAULT;

    groupSizeForBomb = C.GROUP_SIZE_FOR_BOMB_DEFAULT;
}

var gameConfig = new GameConfig();
export default gameConfig;