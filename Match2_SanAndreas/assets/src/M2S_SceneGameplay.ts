import { testAll } from "./M2S_Tests";
import { M2S_BasePlayField, M2S_BaseTile, Pos } from "./M2S_BasePlayField";
import g from "./M2S_FirstClickDetector";
import cache from "./M2S_Cache";
import { M2S_Tile, M2S_PlayField } from "./M2S_PlayField";
import config from "./M2S_Config";

export const tileWidth = 171;
export const tileHeight = 192;

const {ccclass, property} = cc._decorator;

@ccclass
export default class M2S_SceneGameplay extends cc.Component {
    @property(cc.Node)
    fieldPlace: cc.Node = null as any; // чтобы компилятор не ругался

    @property(cc.Node)
    tilesPrefab: cc.Node = null as any;
    initCompleted = false;

    touchStartTile: M2S_Tile | null = null;

    playField = new M2S_PlayField(config.N, config.M, config.C);

    levelParams = {
        turnsLimit: 20,
        goal: 320 * 20, // подразумевается, что каждый ход игрок будет в среднем уничтожать не менее 4-х тайлов
    };
    userParams = {
        points: 0,
        turns: 0,
    };
    getTurnsLeft(): number {
        return this.levelParams.turnsLimit - this.userParams.turns;
    }
    getUserGoalProgress(): number {
        return Math.min(this.userParams.points / this.levelParams.goal, 1);
    }

    @property(cc.Node)
    progressBar: cc.Node = null as any;
    progressBarTween: cc.Tween | null = null;
    @property(cc.Label)
    turnsLeftLabel: cc.Label = null as any;
    @property(cc.Label)
    pointsLabel: cc.Label = null as any;
    @property(cc.Label)
    goalValueLabel: cc.Label = null as any;

    @property(cc.Node)
    levelClose: cc.Node = null as any;
    @property(cc.Node)
    levelCloseBg: cc.Node = null as any;
    @property(cc.Node)
    levelCloseFail: cc.Node = null as any;
    @property(cc.Node)
    levelCloseSuccess: cc.Node = null as any;
    @property(cc.Node)
    levelCloseTapToContinue: cc.Node = null as any;
    @property(cc.Node)
    pauseMenu: cc.Node = null as any;
    @property(cc.Node)
    pauseBg: cc.Node = null as any;
    tapToContinueAction: (() => void) | null = null;

    /** Подсчет количества очков за выбранную юзером группу фишек */
    getPointsForGroup(group: Pos[]) {
        let result = 0;
        let len = group.length;
        result = len * 50 + (len * len - 4) * 10; 
        return result;
    }

    /** Обновление интерфейса сцены после хода юзера */
    afterUserKillGroup(group: Pos[]) {
        let newPoints = this.getPointsForGroup(group);
        this.userParams.points += newPoints;
        this.userParams.turns++;
        this.updateGameplayUI();
        if (this.getUserGoalProgress() === 1) {
            this.finishLevel(true);
        }
        else if (this.getTurnsLeft() <= 0) {
            this.finishLevel(false);
        }
    }
    updateGameplayUI(onInit=false) {
        let turnsLeft = this.getTurnsLeft();
        this.turnsLeftLabel.string = turnsLeft.toString();
        this.pointsLabel.string = this.userParams.points.toString();

        let goalProgress = this.getUserGoalProgress();
        const minWidth = 88;
        if (onInit) {
            this.progressBar.width = minWidth;
            this.goalValueLabel.string = this.levelParams.goal.toString();
        }
        else {
            const maxWidth = this.progressBar.parent.width;
            let newWidth = minWidth + (maxWidth - minWidth) * goalProgress;
            if (this.progressBarTween) {
                this.progressBarTween.stop();
            }
            this.progressBarTween = cc.tween(this.progressBar)
                .to(0.5, {width: newWidth})
                .start();
        }
    }

    clickOnTile(tile: M2S_Tile) {
        let group: Pos[] = [];
        this.playField.findGroup(tile.pos.x, tile.pos.y, tile.color, group);
        if (group.length >= config.K) {
            let killTiles: Promise<void>[] = [];
            this.playField.tilesKillDetected = true;
            group.forEach(pos => {
                let tile = this.playField.getTileAt(pos.x, pos.y);
                // сразу освобождаем место на поле
                this.playField.setTileOnField(null, pos.x, pos.y);
                // анимация уничтожения тайла
                killTiles.push(new Promise((resolve, reject) => {
                    if (tile) {
                        cc.tween(tile.node)
                            .to(0.3, {scale: 0.6, angle: 360})
                            .call(() => resolve())
                            .removeSelf()
                            .start();
                    }
                }));
            });
            // звук уничтожения
            let clip = cc.loader.getRes("sounds/gun" + ((Math.random() * 5) + 1));
            if (clip) {
                cc.audioEngine.play(clip, false, 0.3);
            }
            // после уничтожения всех тайлов - нужно проверить поле на возможность падений
            Promise.all(killTiles).then(_ => {
                this.playField.tilesKillDetected = false;
                this.playField.needCheckTilesFall = true;
                this.afterUserKillGroup(group);
            });
        }
    }

    onLoad() {
        let testsSuccess = testAll();
        if (!testsSuccess) {
            return;
        }

        let fail = false;
        const Props = ["fieldPlace",
            "tilesPrefab",
            "progressBar",
            "turnsLeftLabel",
            "pointsLabel",
            "goalValueLabel",
            "levelClose",
            "levelCloseBg",
            "levelCloseFail",
            "levelCloseSuccess",
            "levelCloseTapToContinue",
            "pauseMenu",
            "pauseBg"
        ] as const;
        Props.forEach(prop => {
            if (!this[prop]) {
                console.log(`M2S_SceneGameplay.${prop} not defined`);
                fail = true;
            }
        })
        if (fail) { return; }

        this.levelCloseBg.on(cc.Node.EventType.TOUCH_START, (event: cc.Event.EventTouch) => {
            if (this.tapToContinueAction) {
                this.tapToContinueAction();
            }
            event.stopPropagation();
        });
        this.pauseBg.on(cc.Node.EventType.TOUCH_START, (event: cc.Event.EventTouch) => {
            event.stopPropagation();
        });

        this.updateGameplayUI(true);

        // сначала загружаем ресурсы
        this.fieldPlace.opacity = 0;

        cache.loadAll()
        // и только потом создаем поле
        .then(_ => {

        this.fieldPlace.addChild(this.playField.node);
        // заполняем поле тайлами
        this.playField.tilesPrefab = this.tilesPrefab;
        this.playField.randomInit();
        // корректируем размер поля
        let w = this.fieldPlace.width = config.N * tileWidth + 80;
        let h = this.fieldPlace.height = config.M * tileHeight + 88;
        const fieldPadding = 100;
        let maxW = this.fieldPlace.parent.width - fieldPadding;
        let maxH = this.fieldPlace.parent.height - fieldPadding;
        let scaleW = 1, scaleH = 1;
        if (w > maxW) { scaleW = maxW / w; }
        if (h > maxH) { scaleH = maxH / h; }
        this.fieldPlace.scale = Math.min(scaleW, scaleH);

        this.fieldPlace.on(cc.Node.EventType.TOUCH_START, (event: cc.Event.EventTouch) => {
            // блокируем тачи во время падений и анимаций на игровом поле
            if (this.playField.hasActionsOnField()) {
                return;
            }
            let fieldPos = this.playField.scenePosToFieldPos(event.touch.getLocation());
            this.touchStartTile = this.playField.getTileAt(fieldPos.x, fieldPos.y);
    
            //event.stopPropagation();
        });

        this.fieldPlace.on(cc.Node.EventType.TOUCH_MOVE, (event: cc.Event.EventTouch) => {
        });

        this.fieldPlace.on(cc.Node.EventType.TOUCH_END, (event: cc.Event.EventTouch) => {
            if (!g.firstClickDetected) {
                g.firstClickDetected = true;
            }
            if (this.playField.hasActionsOnField()) {
                this.touchStartTile = null;
                return;
            }
            let fieldPos = this.playField.scenePosToFieldPos(event.touch.getLocation());
            let tile = this.playField.getTileAt(fieldPos.x, fieldPos.y);
            if (tile && (tile === this.touchStartTile)) {
                this.clickOnTile(tile);
            }
            this.touchStartTile = null;
        });

        this.initCompleted = true;
        cc.tween(this.fieldPlace).to(0.3, {opacity: 255}).start();

        });
    }
    update(dt: number) {
        if (!this.initCompleted) {
            return;
        }
        this.playField.moveTiles(dt);
    }

    finishLevel(success: boolean) {
        let label: cc.Node;
        let hideLabel: cc.Node;
        if (success) {
            label = this.levelCloseSuccess;
            hideLabel = this.levelCloseFail;
        }
        else {
            label = this.levelCloseFail;
            hideLabel = this.levelCloseSuccess;
        }
        hideLabel.active = false;

        label.active = true;
        label.opacity = 0;
        this.levelClose.active = true;
        this.levelCloseBg.opacity = 0;

        let tapTo = this.levelCloseTapToContinue;
        tapTo.opacity = 0;

        let clip = cc.loader.getRes(success ? "sounds/mission_passed" : "sounds/fail");
        if (clip) {
            cc.audioEngine.play(clip, false, 0.3);
        }
        cc.tween(this.levelCloseBg).to(2, {opacity: 255}).start();
        cc.tween(label).to(0.5, {opacity: 255}).start();
        cc.tween(tapTo)
            .delay(1.5)
            .call(() => {
                this.tapToContinueAction = () => {
                    cc.director.loadScene("Menu.fire");
                };
            })
            .to(0.5, {opacity: 255})
            .call(() => {
                cc.tween(tapTo)
                .sequence(
                    cc.tween().to(0.5, {opacity: 100}, {easing: 'sineInOut'}),
                    cc.tween().to(0.5, {opacity: 255}, {easing: 'sineInOut'})
                )
                .repeatForever()
                .start();
            })
            .start();
    }

    pauseGame() {
        this.pauseMenu.active = true;
    }
    continueGame() {
        this.pauseMenu.active = false;
    }
    exitGame() {
        cc.director.loadScene("Menu.fire");
    }
}
