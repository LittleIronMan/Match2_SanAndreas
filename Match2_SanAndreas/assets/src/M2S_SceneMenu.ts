import g from "./M2S_FirstClickDetector";

const {ccclass, property} = cc._decorator;

@ccclass
export default class M2S_SceneMenu extends cc.Component {
    @property(cc.Node)
    /** Детектит первый клик/тап юзера, после чего можно включать звуки */
    firstTapDetector: cc.Node = null as any;

    @property({ type: cc.AudioClip })
    hoverSound: cc.AudioClip = null as any;

    @property({ type: cc.AudioClip })
    clickSound: cc.AudioClip = null as any;

    playSound(clip: cc.AudioClip) {
        if (!g.firstClickDetected) {
            return;
        }
        cc.audioEngine.play(clip, false, 0.5);
    }

    onClickPlay() {
        console.log("Click PLAY");
        cc.director.loadScene("Gameplay.fire");
    }
    onClickSettings() {
        console.log("Click SETTINGS");
    }

    onLoad() {
        let fail = false;
        const Props = ["hoverSound", "clickSound", "firstTapDetector"] as const;
        Props.forEach(prop => {
            if (!this[prop]) {
                console.log(`M2S_SceneMenu.${prop} not defined`);
                fail = true;
            }
        })
        if (fail) { return; }

        this.firstTapDetector.active = !g.firstClickDetected;
        if (!g.firstClickDetected) {
            this.firstTapDetector.on(cc.Node.EventType.TOUCH_START, (event: cc.Event.EventTouch) => {
                this.firstTapDetector.active = false;
                g.firstClickDetected = true;
            });
        }
    }
}
