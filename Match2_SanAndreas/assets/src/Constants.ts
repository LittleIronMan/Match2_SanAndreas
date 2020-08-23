export const ALPHA_MAX = 255;

export const TILE_WIDTH = 171;
export const TILE_HEIGHT = 192;
export const TILES_ACCELERATION = 40;
export const TILES_MAX_SPEED = 12;

/** Минимальная ширина пустоты снаружи рамки поля */
export const FIELD_EX_CONTAINER_PADDING = 100;
/** Горизонтальный отступ между рамкой поля и тайлами */
export const FIELD_HORIZONTAL_PADDING = 80;
/** Вертикальный отступ между рамкой поля и тайлами */
export const FIELD_VERTICAL_PADDING = 88;

export const FIELD_WIDTH_DEFAULT = 8;
export const FIELD_HEIGHT_DEFAULT = 8;
export const MAX_COLORS_ON_FIELD_DEFAULT = 5;
export const MIN_TILES_GROUP_DEFAULT = 2;
export const BOMB_EXPLOSION_RADIUS = 2;
export const GROUP_SIZE_FOR_BOMB_DEFAULT = 5;

export const OK = 1;

export const LEFT = -1;
export const RIGHT = 1;
export const UP = 1;
export const DOWN = -1;

/** Тег пустой ячейки поля */
export const EMPTY_CELL = 0;

/** Тег тайла произвольного цвета */
export const ANY_COLOR = -1;

/** Тег заблокированной ячейки поля */
export const BLOCKED_CELL = -2;

/** Тег бомбы на поле */
export const BOMB_TAG = -3;


export const DEFAULT_VOLUME = 0.3;


/** Цена за один убитый тайл */
export const ONE_TILE_PRICE = 50;
/** Коэффициент квадратичного члена в формуле начисления очков */
export const BIG_TILES_GROUP_MULTIPLIER = 10;
/** Ограничение ходов на уровне */
export const LEVEL_TURNS_LIMIT = 20;