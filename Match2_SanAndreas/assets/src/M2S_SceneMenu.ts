import g from "./M2S_FirstClickDetector";
import config from "./M2S_Config";
import M2S_SettingsItem from "./M2S_SettingsItem";

const {ccclass, property} = cc._decorator;

@ccclass
export default class M2S_SceneMenu extends cc.Component {
    /** Детектит первый клик/тап юзера, после чего можно включать звуки */
    @property(cc.Node)
    firstTapDetector: cc.Node = null as any;
    @property(cc.Node)
    firstTapLabel: cc.Node = null as any;

    @property({ type: cc.AudioClip })
    hoverSound: cc.AudioClip = null as any;

    @property({ type: cc.AudioClip })
    clickSound: cc.AudioClip = null as any;

    @property(cc.Node)
    menuButtons: cc.Node = null as any;
    @property(cc.Node)
    settingsPanel: cc.Node = null as any;
    @property(cc.Node)
    settingsItem: cc.Node = null as any;

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
        this.settingsPanel.active = true;
        this.menuButtons.active = false;
    }

    onLoad() {
        let fail = false;
        const Props = ["hoverSound", "clickSound", "firstTapDetector", "firstTapLabel", "menuButtons", "settingsPanel", "settingsPanel"] as const;
        Props.forEach(prop => {
            if (!this[prop]) {
                console.log(`M2S_SceneMenu.${prop} not defined`);
                fail = true;
            }
        })
        if (fail) { return; }

        if (!g.firstClickDetected) {
            this.firstTapDetector.on(cc.Node.EventType.TOUCH_START, this.onFirstTap, this);
        }

        const initConfigItem = (prop: "N" | "M" | "C" | "K", desc: string, minValue: number, maxValue: number, yPos: number) => {
            let node = cc.instantiate(this.settingsItem);
            node.active = true;
            let item = node.getComponent(M2S_SettingsItem);
            item.prop = prop;
            item.minValue = minValue;
            item.maxValue = maxValue;
            let curVal = config[prop];
            item.slider.progress = (curVal - minValue) / (maxValue - minValue);
            item.title.string = prop + " := ";
            item.value.string = curVal.toString();
            item.desc.string = desc;
            node.setPosition(node.position.x, yPos);

            node.parent = this.settingsPanel;
        }
        initConfigItem("N", "ширина поля", 2, 20, 70);
        initConfigItem("M", "высота поля", 2, 20, 0);
        initConfigItem("C", "кол-во цветов", 2, 6, -70);
        initConfigItem("K", "MIN группа", 2, 5, -140);
    }

    onFirstTap(event: cc.Event.EventTouch) {
        this.firstTapLabel.active = false;
        g.firstClickDetected = true;
        this.firstTapDetector.off(cc.Node.EventType.TOUCH_START, this.onFirstTap, this);
    }

    onChangeProperty(sender: cc.Slider, eventType: cc.Event) {
        let item = sender.node.parent.getComponent(M2S_SettingsItem);
        let newValue = Math.round(item.minValue + (item.maxValue - item.minValue) * sender.progress);
        config[item.prop] = newValue;
        item.value.string = newValue.toString();
    }
    closeSettings() {
        console.log("Click CLOSE");
        this.settingsPanel.active = false;
        this.menuButtons.active = true;
    }
}
