import M2S_SceneMenu from "./M2S_SceneMenu";

const { ccclass, property } = cc._decorator;

@ccclass
export default class M2S_MenuBtn extends cc.Component {

    @property(cc.Node)
    area: cc.Node = null as any;

    @property(cc.Node)
    label: cc.Node = null as any;

    @property(M2S_SceneMenu)
    sceneRef: M2S_SceneMenu = null as any;

    @property([cc.Component.EventHandler])
    events: cc.Component.EventHandler[] = [];

    onLoad() {
        let fail = false;
        const check = (prop: "area" | "label" | "sceneRef") => {
            if (!this[prop]) {
                console.log(`M2S_MenuBtn.${prop} not defined`);
                fail = true;
            }
        }
        check("area");
        check("label");
        check("sceneRef");
        if (fail) { return; }

        this.area.on('mouseenter', () => {
            this.sceneRef.playSound(this.sceneRef.hoverSound);
            this.label.color = cc.color(255, 175, 6);
        });
        this.area.on('mouseleave', () => {
            this.label.color = cc.Color.WHITE;
        });
        this.area.on(cc.Node.EventType.TOUCH_END, (event: cc.Event.EventTouch) => {
            this.sceneRef.playSound(this.sceneRef.clickSound);
            this.events.forEach(e => {
                e.emit([]);
            })
        });
    }
}
