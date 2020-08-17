const {ccclass, property} = cc._decorator;

@ccclass
export default class M2S_SettingsItem extends cc.Component {
    @property(cc.Label)
    title: cc.Label = null as any;

    @property(cc.Label)
    value: cc.Label = null as any;

    @property(cc.Slider)
    slider: cc.Slider = null as any;

    @property(cc.Label)
    desc: cc.Label = null as any;

    prop: "N" | "M" | "C" | "K" = null as any;
    maxValue = 10;
    minValue = 1;
}
