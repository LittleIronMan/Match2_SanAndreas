import g from "./FirstClickDetector";
import cache from "./Cache";
import { DEFAULT_VOLUME } from "./Constants";

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
        const clip = cc.loader.getRes("sounds/" + sound);
        if (clip) {
            cc.audioEngine.play(clip, false, DEFAULT_VOLUME);
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
            this.label.color = MENU_BUTTON_MOUSE_HOVER_COLOR;
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

/** Цвет кнопки, выделенной курсором мыши */
const MENU_BUTTON_MOUSE_HOVER_COLOR = cc.color(255, 175, 6);
