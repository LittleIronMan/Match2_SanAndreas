import { testAll } from "./M2S_Tests";

const {ccclass, property} = cc._decorator;

@ccclass
export default class M2S_SceneGameplay extends cc.Component {
    onLoad() {
        testAll();
    }
}
