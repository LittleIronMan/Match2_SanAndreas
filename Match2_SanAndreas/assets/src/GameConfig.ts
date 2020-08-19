import { FIELD_WIDTH_DEFAULT, FIELD_HEIGHT_DEFAULT, MAX_COLORS_ON_FIELD_DEFAULT, MIN_TILES_GROUP_DEFAULT } from "./Constants";

class GameConfig {
    /** ширина поля(в тайлах) */
    N = FIELD_WIDTH_DEFAULT;

    /** высота поля */
    M = FIELD_HEIGHT_DEFAULT;
    
    /** количество цветов */
    C = MAX_COLORS_ON_FIELD_DEFAULT;

    /** минимальный размер группы */
    K = MIN_TILES_GROUP_DEFAULT;
}

var gameConfig = new GameConfig();
export default gameConfig;