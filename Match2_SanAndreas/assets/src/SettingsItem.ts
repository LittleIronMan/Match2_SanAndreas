const { ccclass, property } = cc._decorator;

const MAX_VALUE_DEFAULT = 10;
const MIN_VALUE_DEFAULT = 1;

@ccclass
export default class SettingsItem extends cc.Component {
    @property(cc.Label)
    title: cc.Label = null as any;

    @property(cc.Label)
    value: cc.Label = null as any;

    @property(cc.Slider)
    slider: cc.Slider = null as any;

    @property(cc.Label)
    desc: cc.Label = null as any;

    prop: "N" | "M" | "C" | "K" = null as any;
    maxValue = MAX_VALUE_DEFAULT;
    minValue = MIN_VALUE_DEFAULT;
}