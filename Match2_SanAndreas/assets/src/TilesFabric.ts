import Tile from "./Tile";
import TileType from "./TileType";

/**
 * @class
 * @classdesc (Полу)абстрактная фабрика для создания тайлов
 */
export default class TilesFabric {

    create(type: TileType, color: number): Tile {
        const newTile = new Tile(type, color);

        return newTile;
    }
}