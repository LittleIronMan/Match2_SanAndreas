import { testAll } from "./Tests";
import Pos from "./Pos";
import g from "./FirstClickDetector";
import cache from "./Cache";
import PlayField from "./PlayField";
import TileRender from "./TileRender";
import Tile from "./Tile";
import gameConfig from "./GameConfig";
import * as C from "./Constants";
import { TileType } from "./BaseTile";

const {ccclass, property} = cc._decorator;

@ccclass
export default class SceneGameplay extends cc.Component {
    @property(cc.Node)
    fieldPlace: cc.Node = null as any; // чтобы компилятор не ругался

    @property(TileRender)
    tilesPrefab: TileRender = null as any;
    initCompleted = false;

    touchStartTile: Tile | null = null;

    playField = new PlayField({width: gameConfig.N, height: gameConfig.M, countColors: gameConfig.C});

    levelParams = {
        turnsLimit: C.LEVEL_TURNS_LIMIT,
        /** Подразумевается, что каждый ход игрок будет в среднем уничтожать не менее 4-х тайлов */
        goal: SceneGameplay.getPointsForGroup(undefined, 4) * C.LEVEL_TURNS_LIMIT,
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

    private readonly minProgressBarWidth: number = 88;
    private readonly progressBarMoveDuration: number = 0.5;

    /**
     * Подсчет количества очков за выбранную юзером группу тайлов.
     * Должен быть передан хотябы один из двух аргументов.
     */
    static getPointsForGroup(group: Pos[] | undefined, groupLen?: number, afterBomb = false) {
        let result = 0;
        const len = (group ? group.length : groupLen as number);
        result = len * C.ONE_TILE_PRICE;
        // за бомбу не начисляются дополнительные очки
        if (!afterBomb) {
            result += (len * len - 4) * C.BIG_TILES_GROUP_MULTIPLIER; 
        }
        return result;
    }

    /** Обновление интерфейса сцены после хода юзера */
    afterUserKillGroup(group: Pos[], afterBomb = false) {
        const newPoints = SceneGameplay.getPointsForGroup(group, undefined, afterBomb);
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
        const turnsLeft = this.getTurnsLeft();
        this.turnsLeftLabel.string = turnsLeft.toString();
        this.pointsLabel.string = this.userParams.points.toString();

        const goalProgress = this.getUserGoalProgress();
        const minWidth = this.minProgressBarWidth;
        if (onInit) {
            this.progressBar.width = minWidth;
            this.goalValueLabel.string = this.levelParams.goal.toString();
        }
        else {
            const maxWidth = this.progressBar.parent.width;
            const newWidth = minWidth + (maxWidth - minWidth) * goalProgress;
            if (this.progressBarTween) {
                this.progressBarTween.stop();
            }
            this.progressBarTween = cc.tween(this.progressBar)
                .to(this.progressBarMoveDuration, {width: newWidth})
                .start();
        }
    }

    killGroupOfTiles(group: Pos[], audioClip?: cc.AudioClip): Promise<void> {
        const killTiles: Promise<void>[] = [];
        this.playField.tilesKillDetected = true;

        group.forEach(pos => {
            const tile = this.playField.getTileAt(pos.x, pos.y);
            // сразу освобождаем место на поле
            this.playField.setTileOnField(null, pos.x, pos.y);
            // анимация уничтожения тайла
            if (!tile) {
                return;
            }
            const KILL_TIME = 0.3;
            killTiles.push(new Promise((resolve, reject) => {
                cc.tween(tile.renderTile.node)
                    .to(KILL_TIME, {scale: 0.6, angle: 360, opacity: 0})
                    .call(() => resolve())
                    .removeSelf()
                    .start();
            }));
        });

        if (audioClip) {
            cc.audioEngine.play(audioClip, false, C.DEFAULT_VOLUME);
        }

        return Promise.all(killTiles).then();
    }

    clickOnTile(tile: Tile) {
        const x = tile.pos.x;
        const y = tile.pos.y;

        if (tile.type === TileType.BOMB) {

            const explosion: Pos[] = [];

            const R = C.BOMB_EXPLOSION_RADIUS;
            for (let dx = -R; dx <= R; dx++) {
                for (let dy = -R; dy <= R; dy++) {

                    if (Math.abs(dx) + Math.abs(dy) > R) {
                        continue;
                    }

                    const xx = x + dx;
                    const yy = y + dy;

                    if (!this.playField.isValidPos(xx, yy)) {
                        continue;
                    }

                    const victim = this.playField.field[xx][yy];
                    if (!victim) {
                        continue;
                    }
                    
                    explosion.push(victim.pos);
                }
            }

            // звуки взрывчатки
            const clip = cc.loader.getRes("sounds/grenade");
            if (clip) {
                cc.audioEngine.play(clip, false, C.DEFAULT_VOLUME);
            }

            this.killGroupOfTiles(explosion, clip).then(_ => {

                this.afterUserKillGroup(explosion, true);

                // после уничтожения всех тайлов - нужно проверить поле на возможность падений
                this.playField.tilesKillDetected = false;
                this.playField.needCheckTilesFall = true;
            });

        }
        else {

            const group = this.playField.findGroup(x, y, tile.color);

            if (group.length >= gameConfig.K) {

                // звуки оружия
                const clip = cc.loader.getRes("sounds/gun" + ((Math.random() * 5) + 1));
                if (clip) {
                    cc.audioEngine.play(clip, false, C.DEFAULT_VOLUME);
                }

                this.killGroupOfTiles(group, clip).then(_ => {

                    // устанавливаем бомбу, если нужно
                    this.afterUserKillGroup(group);

                    if (group.length >= gameConfig.groupSizeForBomb) {

                        let bomb = this.playField.createTile(TileType.BOMB) as Tile;
                        this.playField.setTileOnField(bomb, x, y, {onGenerating: true});

                        const bombNode = bomb.renderTile.node;
                        bombNode.opacity = 0;
                        bombNode.scale = 0.5;
                        bombNode.angle = -360;

                        return new Promise((resolve, reject) => {
                            cc.tween(bomb.renderTile.node)
                                .to(0.3, {opacity: 255, scale: 1, angle: 0})
                                .call(() => {
                                    resolve();
                                })
                                .start();
                        });

                    }
                    else {

                        return Promise.resolve();
                    }

                })
                .then(_ => {

                    // после уничтожения всех тайлов - нужно проверить поле на возможность падений
                    this.playField.tilesKillDetected = false;
                    this.playField.needCheckTilesFall = true;
                });
            }
        }
    }

    onLoad() {
        const testsSuccess = testAll();
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
            "pauseBg",
        ] as const;
        Props.forEach(prop => {
            if (!this[prop]) {
                console.log(`SceneGameplay.${prop} not defined`);
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
            const w = this.fieldPlace.width = gameConfig.N * C.TILE_WIDTH + C.FIELD_HORIZONTAL_PADDING;
            const h = this.fieldPlace.height = gameConfig.M * C.TILE_HEIGHT + C.FIELD_VERTICAL_PADDING;
            const maxW = this.fieldPlace.parent.width - C.FIELD_EX_CONTAINER_PADDING;
            const maxH = this.fieldPlace.parent.height - C.FIELD_EX_CONTAINER_PADDING;
            let scaleW = 1, scaleH = 1;
            if (w > maxW) { scaleW = maxW / w; }
            if (h > maxH) { scaleH = maxH / h; }
            this.fieldPlace.scale = Math.min(scaleW, scaleH);

            this.fieldPlace.on(cc.Node.EventType.TOUCH_START, (event: cc.Event.EventTouch) => {
                // блокируем тачи во время падений и анимаций на игровом поле
                if (this.playField.hasActionsOnField()) {
                    return;
                }
                const fieldPos = this.playField.scenePosToFieldPos(event.touch.getLocation());
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

                const fieldPos = this.playField.scenePosToFieldPos(event.touch.getLocation());
                const tile = this.playField.getTileAt(fieldPos.x, fieldPos.y);

                if (tile && (tile === this.touchStartTile)) {
                    this.clickOnTile(tile);
                }

                this.touchStartTile = null;
            });

            this.initCompleted = true;
            const FIELD_APPEAR_TIME = 0.3;
            cc.tween(this.fieldPlace).to(FIELD_APPEAR_TIME, {opacity: 255}).start();
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

        const clip = cc.loader.getRes(success ? "sounds/mission_passed" : "sounds/fail");
        if (clip) {
            cc.audioEngine.play(clip, false, C.DEFAULT_VOLUME);
        }

        const DARK_BG_FADE_TIME = 2;
        cc.tween(this.levelCloseBg).to(DARK_BG_FADE_TIME, {opacity: 255}).start();

        const RESULT_LABEL_APPEAR_TIME = 0.5;
        cc.tween(label).to(RESULT_LABEL_APPEAR_TIME, {opacity: 255}).start();

        const TAP_TO_CONTINUE_DELAY_TIME = 1.5;
        const TAP_TO_CONTINUE_BLINK_TIME = 0.5;
        const tapTo = this.levelCloseTapToContinue;
        tapTo.opacity = 0;
        cc.tween(tapTo)
            .delay(TAP_TO_CONTINUE_DELAY_TIME)
            .call(() => {
                this.tapToContinueAction = () => {
                    cc.director.loadScene("Menu.fire");
                };
            })
            .to(TAP_TO_CONTINUE_BLINK_TIME, {opacity: 255})
            .call(() => {
                cc.tween(tapTo)
                .sequence(
                    cc.tween().to(TAP_TO_CONTINUE_BLINK_TIME, {opacity: 100}, {easing: 'sineInOut'}),
                    cc.tween().to(TAP_TO_CONTINUE_BLINK_TIME, {opacity: 255}, {easing: 'sineInOut'})
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
