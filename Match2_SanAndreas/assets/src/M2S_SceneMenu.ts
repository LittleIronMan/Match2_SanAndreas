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

    firstClickDetected = false;

    playSound(clip: cc.AudioClip) {
        if (!this.firstClickDetected) {
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
        const check = (prop: "hoverSound" | "clickSound" | "firstTapDetector") => {
            if (!this[prop]) {
                console.log(`M2S_SceneMeny.${prop} not defined`);
                fail = true;
            }
        }
        check("hoverSound");
        check("clickSound");
        check("firstTapDetector");
        if (fail) { return; }

        this.firstTapDetector.active = true;
        this.firstTapDetector.on(cc.Node.EventType.TOUCH_START, (event: cc.Event.EventTouch) => {
            this.firstTapDetector.active = false;
            this.firstClickDetected = true;
        });
    }
}
