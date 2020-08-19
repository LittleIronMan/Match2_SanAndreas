import g from "./FirstClickDetector";
import config from "./Config";
import SettingsItem from "./SettingsItem";
import cache from "./Cache";

const {ccclass, property} = cc._decorator;

@ccclass
export default class SceneMenu extends cc.Component {
    /** Детектит первый клик/тап юзера, после чего можно включать звуки */
    @property(cc.Node)
    firstTapDetector: cc.Node = null as any;
    @property(cc.Node)
    firstTapLabel: cc.Node = null as any;

    @property(cc.Node)
    menuButtons: cc.Node = null as any;
    @property(cc.Node)
    settingsPanel: cc.Node = null as any;
    @property(cc.Node)
    settingsItem: cc.Node = null as any;
    @property(cc.Node)
    loading: cc.Node = null as any;

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
        const Props = ["firstTapDetector", "firstTapLabel", "menuButtons", "settingsPanel", "settingsPanel", "loading"] as const;
        Props.forEach(prop => {
            if (!this[prop]) {
                console.log(`SceneMenu.${prop} not defined`);
                fail = true;
            }
        })
        if (fail) { return; }

        this.firstTapLabel.active = !g.firstClickDetected;
        if (!g.firstClickDetected) {
            this.firstTapDetector.on(cc.Node.EventType.TOUCH_START, this.onFirstTap, this);
        }

        const initConfigItem = (prop: "N" | "M" | "C" | "K", desc: string, minValue: number, maxValue: number, yPos: number) => {
            let node = cc.instantiate(this.settingsItem);
            node.active = true;
            let item = node.getComponent(SettingsItem);
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

        this.loading.active = true;
        this.menuButtons.active = false;
        cache.loadAll().then(_ => {
            this.loading.active = false;
            this.menuButtons.active = true;
        });
    }

    onFirstTap(event: cc.Event.EventTouch) {
        this.firstTapLabel.active = false;
        g.firstClickDetected = true;
        this.firstTapDetector.off(cc.Node.EventType.TOUCH_START, this.onFirstTap, this);
    }

    onChangeProperty(sender: cc.Slider, eventType: cc.Event) {
        let item = sender.node.parent.getComponent(SettingsItem);
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
