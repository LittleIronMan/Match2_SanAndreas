import g from "./FirstClickDetector";
import gameConfig from "./GameConfig";
import SettingsItem from "./SettingsItem";
import cache from "./Cache";
import MenuBtn from "./MenuBtn";
import { debugLevels } from "./DebugLevels";

const {ccclass, property} = cc._decorator;

const MENU_ITEM_HEIGHT = 60;

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
    levelsList: cc.Node = null as any;
    @property(MenuBtn)
    levelsItem: MenuBtn = null as any;

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

    onClickLevels() {
        console.log("Click LEVELS");
        this.levelsList.active = true;
        this.menuButtons.active = false;
    }

    onClickSettings() {
        console.log("Click SETTINGS");
        this.settingsPanel.active = true;
        this.menuButtons.active = false;
    }

    closeLevelsList() {
        this.levelsList.active = false;
        this.menuButtons.active = true;
    }

    closeSettings() {
        this.settingsPanel.active = false;
        this.menuButtons.active = true;
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

        interface ItemParams {
            prop: "N" | "M" | "C" | "K",
            desc: string,
            minValue: number,
            maxValue: number,
            yPos: number
        };
        const initConfigItem = (p: ItemParams) => {
            const node = cc.instantiate(this.settingsItem);
            node.active = true;
            const item = node.getComponent(SettingsItem);
            item.prop = p.prop;
            item.minValue = p.minValue;
            item.maxValue = p.maxValue;
            const curVal = gameConfig[p.prop];
            item.slider.progress = (curVal - p.minValue) / (p.maxValue - p.minValue);
            item.title.string = p.prop + " := ";
            item.value.string = curVal.toString();
            item.desc.string = p.desc;
            node.setPosition(node.position.x, p.yPos);

            node.parent = this.settingsPanel;
        }
        initConfigItem({prop: "N", desc: "ширина поля", minValue: 2, maxValue: 20, yPos: 70});
        initConfigItem({prop: "M", desc: "высота поля", minValue: 2, maxValue: 20, yPos: 0});
        initConfigItem({prop: "C", desc: "кол-во цветов", minValue: 2, maxValue: 6, yPos: -70});
        initConfigItem({prop: "K", desc: "MIN группа", minValue: 2, maxValue: 5, yPos: -140});

        this.loading.active = true;
        this.menuButtons.active = false;

        cache.loadAll().then(_ => {
            this.loading.active = false;
            this.menuButtons.active = true;
        });

        let yOffset = debugLevels.length * MENU_ITEM_HEIGHT / 2;
        debugLevels.forEach((level, idx) => {
            const n = cc.instantiate(this.levelsItem.node);
            n.active = true;
            const lvl = n.getComponent(MenuBtn);
            lvl.label.string = level.name;

			var handler = new cc.Component.EventHandler();
			handler.target = this.node;
			handler.component = "SceneMenu";
            handler.handler = "onSelectLevel";
            handler.customEventData = idx.toString();

            lvl.events.push(handler);

            this.levelsList.addChild(n);
            n.setPosition(0, yOffset);
            yOffset -= MENU_ITEM_HEIGHT;
        });
    }

    onFirstTap(event: cc.Event.EventTouch) {
        this.firstTapLabel.active = false;
        g.firstClickDetected = true;
        this.firstTapDetector.off(cc.Node.EventType.TOUCH_START, this.onFirstTap, this);
    }

    onChangeProperty(sender: cc.Slider, eventType: cc.Event) {
        const item = sender.node.parent.getComponent(SettingsItem);
        const newValue = Math.round(item.minValue + (item.maxValue - item.minValue) * sender.progress);
        gameConfig[item.prop] = newValue;
        item.value.string = newValue.toString();
    }

    onSelectLevel(event: cc.Event, levelIdxStr: string) {
        const levelIdx = +levelIdxStr;

        gameConfig.customLevel = debugLevels[levelIdx];

        cc.director.loadScene("Gameplay.fire");
    }
}
