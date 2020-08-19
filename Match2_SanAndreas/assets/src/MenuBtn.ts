import g from "./FirstClickDetector";
import cache from "./Cache";

const { ccclass, property } = cc._decorator;

@ccclass
export default class MenuBtn extends cc.Component {

    @property(cc.Node)
    area: cc.Node = null as any;

    @property(cc.Node)
    label: cc.Node = null as any;

    @property([cc.Component.EventHandler])
    events: cc.Component.EventHandler[] = [];

    playSound(sound: string) {
        if (!g.firstClickDetected || !cache.sounds) {
            return;
        }
        let clip = cc.loader.getRes("sounds/" + sound);
        if (clip) {
            cc.audioEngine.play(clip, false, 0.5);
        }
    }

    onLoad() {
        let fail = false;
        const Props = ["area", "label"] as const;
        Props.forEach(prop => {
            if (!this[prop]) {
                console.log(`MenuBtn.${prop} not defined`);
                fail = true;
            }
        })
        if (fail) { return; }

        this.area.on('mouseenter', () => {
            this.playSound("hover");
            this.label.color = cc.color(255, 175, 6);
        });
        this.area.on('mouseleave', () => {
            this.label.color = cc.Color.WHITE;
        });
        this.area.on(cc.Node.EventType.TOUCH_END, (event: cc.Event.EventTouch) => {
            this.events.forEach(e => {
                e.emit([]);
            })
            this.playSound("click");
        });
    }
}
