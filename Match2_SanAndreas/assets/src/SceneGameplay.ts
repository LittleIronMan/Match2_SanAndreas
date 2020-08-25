import { testAll } from "./Tests";
import Pos from "./Pos";
import g from "./FirstClickDetector";
import cache from "./Cache";
import PlayField from "./PlayField";
import TileRender from "./TileRender";
import Tile from "./Tile";
import gameConfig from "./GameConfig";
import * as C from "./Constants";
import TileType from "./TileType";
import TilesFabric_Match2_SanAndreas from "./TilesFabric_Match2_SanAndreas";

const { ccclass, property } = cc._decorator;

/**
 * @class
 * @classdesc Результаты(последствия) некого хода пользователя
 */
class TurnResults {
    /** Количество тайлов, уничтоженных тапом юзера(как группа соседних тайлов одного цвета) */
    killedByTap = 0;

    /** Количество тайлов, уничтоженных взрывами бомб */
    killedByExpl = 0;

    add(anotherRes: TurnResults) {
        this.killedByTap += anotherRes.killedByTap;
        this.killedByExpl += anotherRes.killedByExpl;
    }
}

@ccclass
export default class SceneGameplay extends cc.Component {
    @property(cc.Node)
    fieldPlace: cc.Node = null as any;

    @property(TileRender)
    tilesPrefab: TileRender = null as any;

    initCompleted = false;

    touchStartTile: Tile | null = null;

    playField: PlayField = null as any;

    levelParams: {
        turnsLimit: number,
        goal: number,
    } = null as any;

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

    /** звуки взрывчатки */
    bombExplSound: cc.AudioClip = null as any;

    onLoad() {
        const testsSuccess = testAll();
        if (!testsSuccess) {
            return;
        }

        let fail = false;
        const Props = [
            "fieldPlace",
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

        const averageTurnResults = new TurnResults();
        /** Подразумевается, что каждый ход игрок будет в среднем уничтожать не менее 4-х тайлов */
        averageTurnResults.killedByTap = 4;
        this.levelParams = {
            turnsLimit: C.LEVEL_TURNS_LIMIT,
            goal: SceneGameplay.getPointsForGroup(averageTurnResults) * C.LEVEL_TURNS_LIMIT,
        };


        let initPlayField: () => void;

        const tilesFabric = new TilesFabric_Match2_SanAndreas(this.tilesPrefab, this.fieldPlace);

        if (gameConfig.customLevel) {
            const props = gameConfig.customLevel.fieldProps;
            const arr = gameConfig.customLevel.field;
            this.playField = new PlayField(props, tilesFabric);

            initPlayField = () => {
                this.playField.initWith(arr);
            }

            gameConfig.customLevel = undefined;
        }
        else {
            this.playField = new PlayField({ width: gameConfig.N, height: gameConfig.M, countColors: gameConfig.C }, tilesFabric);
            initPlayField = () => {
                this.playField.randomInit();
            }
        }

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

        this.fieldPlace.opacity = 0;

        // сначала загружаем ресурсы
        cache.loadAll()
        // и только потом создаем поле
        .then(_ => {
            this.bombExplSound = cc.loader.getRes("sounds/grenade");

            this.fieldPlace.addChild(this.playField.node);

            // заполняем поле тайлами
            initPlayField();

            // корректируем размер поля
            const w = this.fieldPlace.width = this.playField.width * C.TILE_WIDTH + C.FIELD_HORIZONTAL_PADDING;
            const h = this.fieldPlace.height = this.playField.height * C.TILE_HEIGHT + C.FIELD_VERTICAL_PADDING;
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

    /**
     * Подсчет количества очков за выбранную юзером группу тайлов.
     * Должен быть передан хотябы один из двух аргументов.
     */
    static getPointsForGroup(res: TurnResults) {
        let result = 0;
        result = (res.killedByTap + res.killedByExpl) * C.ONE_TILE_PRICE;
        // за тайлы, взорванные бомбой, не начисляются дополнительные очки
        result += (res.killedByTap * res.killedByTap - 4) * C.BIG_TILES_GROUP_MULTIPLIER;

        return result;
    }

    /** Обновление интерфейса сцены после хода юзера */
    afterUserKillGroup(res: TurnResults) {
        const newPoints = SceneGameplay.getPointsForGroup(res);
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

    updateGameplayUI(onInit = false) {
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
            this.progressBar.stopAllActions();
            cc.tween(this.progressBar)
                .to(this.progressBarMoveDuration, { width: newWidth })
                .start();
        }
    }

    bombShakingAnim(bomb: Tile): Promise<void> {

        const BOMB_SHAKING_TIME = 0.2;

        return new Promise((resolve, reject) => {
            cc.tween(bomb.node)
                .to(BOMB_SHAKING_TIME / 3, { angle: -10 })
                .to(BOMB_SHAKING_TIME / 3, { angle: 10 })
                .to(BOMB_SHAKING_TIME / 3, { angle: 10 })
                .call(() => {
                    resolve();
                })
                .start();
        });
    }

    killTileAnim(tile: Tile): Promise<void> {

        const KILL_TIME = 0.3;

        return new Promise((resolve, reject) => {
            cc.tween(tile.node)
                .to(KILL_TIME, { scale: 0.6, angle: 360, opacity: 0 })
                .call(() => resolve())
                .removeSelf()
                .start();
        });
    }

    killBomb(bomb: Tile): Promise<TurnResults> {

        const explosionArea = this.playField.getExplAreaForBomb(bomb.pos.x, bomb.pos.y);

        return this.bombShakingAnim(bomb)
            .then(_ => {
                return this.killGroupOfTiles(explosionArea, this.bombExplSound, bomb);
            });
    }

    killGroupOfTiles(group: Pos[], audioClip?: cc.AudioClip, bombEpicenter: Tile | null = null): Promise<TurnResults> {
        const killedTiles: Promise<void | TurnResults>[] = [];
        this.playField.tilesKillDetected = true;

        const accumResult = new TurnResults();

        const forKill = new Set<Tile>();

        group.forEach(pos => {
            const tile = this.playField.getTileAt(pos.x, pos.y);
            if (!tile) {
                return;
            }

            // сразу освобождаем место на поле
            if (tile.onField) {
                this.playField.setTileOnField(null, pos.x, pos.y);
            }

            forKill.add(tile);
        });

        if (bombEpicenter) {
            if (bombEpicenter.onField) {
                const pos = bombEpicenter.pos;
                this.playField.setTileOnField(null, pos.x, pos.y);
            }

            forKill.add(bombEpicenter);
        }

        forKill.forEach(tile => {

            if (bombEpicenter) {
                accumResult.killedByExpl++;
            }
            else {
                accumResult.killedByTap++;
            }

            if (tile.type === TileType.SIMPLE || tile === bombEpicenter) {
                // анимация уничтожения тайла
                killedTiles.push(this.killTileAnim(tile));

            }
            else if (tile.type === TileType.BOMB) {

                // каскадный взрыв бомб
                killedTiles.push(this.killBomb(tile));

            }
        });

        if (audioClip) {
            cc.audioEngine.play(audioClip, false, C.DEFAULT_VOLUME);
        }

        return Promise.all(killedTiles).then((results: (void | TurnResults)[]) => {
            results.forEach(res => {
                if (res instanceof TurnResults) {
                    accumResult.add(res);
                }
            });
            return Promise.resolve(accumResult);
        });
    }

    clickOnTile(tile: Tile) {
        const x = tile.pos.x;
        const y = tile.pos.y;

        if (tile.type === TileType.BOMB) {

            this.killBomb(tile).then((res: TurnResults) => {

                this.afterUserKillGroup(res);

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

                this.killGroupOfTiles(group, clip).then((res: TurnResults) => {

                    // устанавливаем бомбу, если нужно
                    this.afterUserKillGroup(res);

                    if (group.length >= gameConfig.groupSizeForBomb) {

                        let bomb = this.playField.createTile(TileType.BOMB) as Tile;
                        this.playField.setTileOnField(bomb, x, y, { onGenerating: true });

                        const bombNode = bomb.node;
                        bombNode.opacity = 0;
                        bombNode.scale = 0.5;
                        bombNode.angle = -360;

                        return new Promise((resolve, reject) => {
                            cc.tween(bomb.node)
                                .to(0.3, { opacity: 255, scale: 1, angle: 0 })
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
        cc.tween(this.levelCloseBg).to(DARK_BG_FADE_TIME, { opacity: 255 }).start();

        const RESULT_LABEL_APPEAR_TIME = 0.5;
        cc.tween(label).to(RESULT_LABEL_APPEAR_TIME, { opacity: 255 }).start();

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
            .to(TAP_TO_CONTINUE_BLINK_TIME, { opacity: 255 })
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
