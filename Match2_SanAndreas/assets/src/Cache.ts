/**
 * @class
 * @classdesc Менеджер загрузки удаленных ресурсов проекта
 */
class Cache {
    /** Флаг того, что звуки загружены с сервера */
    sounds = false;

    /** Флаг того, спрайты банд San Andreas загружены с сервера*/
    gangs = false;

    loadAll(): Promise<void> {
        // сначала загружаем спрайты бандитов из GTA: San Andreas
        return new Promise((resolve, reject) => {

            if (cache.gangs) {
                return resolve();
            }

            cc.loader.loadResDir('gangs', cc.SpriteFrame, function (err: Error, frames: cc.SpriteFrame[]) {
                cache.gangs = true;
                resolve();
            });

        })
        // потом звуки оружия из GTA: San Andreas
        .then(_ => {

            if (cache.sounds) {
                return Promise.resolve();
            }

            return new Promise((resolve, reject) => {
                cc.loader.loadResDir('sounds', cc.AudioClip, function (err: Error, frames: cc.SpriteFrame[]) {
                    cache.sounds = true;
                    resolve();
                });
            });
        });
    }
}

var cache = new Cache();
export default cache;