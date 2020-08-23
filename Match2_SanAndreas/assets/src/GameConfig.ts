import * as C from "./Constants";
import LevelConfig from "./LevelConfig";

class GameConfig {
    /** Ширина поля(в тайлах) */
    N = C.FIELD_WIDTH_DEFAULT;

    /** Высота поля */
    M = C.FIELD_HEIGHT_DEFAULT;

    /** Количество цветов */
    C = C.MAX_COLORS_ON_FIELD_DEFAULT;

    /** Минимальный размер группы */
    K = C.MIN_TILES_GROUP_DEFAULT;

    /** Минимальный размер группы, начиная с которой из группы будет создана бомба */
    groupSizeForBomb = C.GROUP_SIZE_FOR_BOMB_DEFAULT;

    customLevel?: LevelConfig;
}

var gameConfig = new GameConfig();
export default gameConfig;