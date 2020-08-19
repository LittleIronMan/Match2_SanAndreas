const {ccclass, property} = cc._decorator;

@ccclass
export default class TileRender extends cc.Component {
    @property(cc.Sprite)
    avatar: cc.Sprite = null as any;

    @property(cc.Node)
    frame: cc.Node = null as any;

    @property(cc.Node)
    glass: cc.Node = null as any;
}