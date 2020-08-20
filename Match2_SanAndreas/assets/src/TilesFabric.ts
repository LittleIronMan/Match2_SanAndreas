import TileRender from "./TileRender";
import Tile from "./Tile";

const SAN_ANDREAS_GANGS_CONFIG: { name: string; avatars: number; color: string; }[] = [
    { name: "ballas", avatars: 4, color: "#780088" },
    { name: "grove", avatars: 4, color: "#3DD166" },
    { name: "police", avatars: 5, color: "#4148FD" },
    { name: "vagos", avatars: 3, color: "#FFF153" },
    { name: "triads", avatars: 3, color: "#080808" },
    { name: "aztecas", avatars: 3, color: "#28F3EB" },
    { name: "rifa", avatars: 4, color: "#527881" },
];

export default class TilesFabric {
    static create(color: number, prefab: TileRender): Tile {
        const newTile = new Tile(color);

        const t = cc.instantiate(prefab.node).getComponent(TileRender);
        const gConf = SAN_ANDREAS_GANGS_CONFIG[color - 1];
        const fileName = "gangs/" + gConf.name
            + (Math.floor(Math.random() * gConf.avatars) + 1) + ".png";
        t.frame.color = cc.color().fromHEX(gConf.color);
        t.glass.color = cc.color().fromHEX(gConf.color);
        t.avatar.spriteFrame = cc.loader.getRes(fileName, cc.SpriteFrame);

        newTile.renderTile = t;

        return newTile;
    }
}
