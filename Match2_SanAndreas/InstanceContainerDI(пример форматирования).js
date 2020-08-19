import {InstanceBuilderDI} from './InstanceBuilderDI.js';
import {InstanceRawDI} from './InstanceRawDI.js';

/**
 * @class
 * @classdesc Контейнер для создания инстанса
 */
export class InstanceContainerDI {
    /**
     * @param {DI} di
     * @param {string} key
     * @param {number} level
     * @constructor
     */
    constructor(di, key, level = 0) {
        /**
         * @description Ссылка на DI-контейнер
         * @type {DI}
         * @private
         */
        this._di = di;

        /**
         * @description Ключ из которого создается инстанс в конфигурации
         * @type {string}
         * @private
         */
        this._key = key;

        /**
         * @description Объект с контекстными инстансами
         * @type {Object.<string, Object>}
         * @private
         */
        this._ctx = {};

        /**
         * @description Объект с контекстными билдерами
         * @type {Object.<string, InstanceBuilderDI>}
         * @private
         */
        this._rawCtx = {};

        /**
         * @description Объект с билдерами
         * @type {Object.<string, InstanceBuilderDI>}
         * @private
         */
        this._builders = {};

        /**
         * @description Текущий уровень вложенности
         * @type {number}
         * @private
         */
        this._level = level;
    }

    /**
     * @description Возвращает созданный инстанс на основе переданного билдера
     * @param {InstanceBuilderDI} builder
     * @returns {Object}
     * @public
     */
    createInstance(builder) {
        // Дебаг-информация
        //console.log(`${'---'.repeat(this._level)} ${this._key}`);
        const ref = builder.getRef();
        const builders = builder.getBuilders();
        const context = builder.getCtx();

        // Объединяет билдеры из текущей конфигурации с переданной в конструкторе
        if (builders) {
            Object.assign(this._builders, builders);
        }

        // Объединяет контекст из текущей конфигурации с переданной в конструкторе
        if (context) {
            Object.assign(this._rawCtx, context);

            for (const key of Object.keys(context)) {
                this._ctx[key] = this._processParam(context[key], `ctx:${key}`);
            }
        }

        // Берется инстанс из рефа, если он есть
        if (ref) {
            if (ref.absolute) {
                if (!ref.key) {
                    // Если нет ключа, то возвращаем весь DI
                    return this._di;
                }
            } else {
                return this._ctx[ref.key];
            }
        }

        builder = this._processBuilder(builder);

        // Создаем конфигурацию для инстанса
        const instanceCfg = builder.create();

        // Рекурсивно процессим аргументы
        const processedArgs = instanceCfg.args.map((value, index) => this._processParam(value, `arg:${index}`));

        // Если это синглтон, то ищем в DI
        if (instanceCfg.singleton) {
            const instance = this._di.getSingleton(this._key);

            if (instance) {
                return instance;
            }
        }

        // Cоздание инстанс
        const instance = new instanceCfg.ctor(...processedArgs);

        // Если это синглтон, то добавляем в DI
        if (instanceCfg.singleton) {
            this._di.setSingleton(this._key, instance);
        }

        return instance;
    }

    /**
     * @description Рекурсивный процессинг билдера (обходит ref и from)
     * @param {InstanceBuilderDI} builder
     * @private
     */
    _processBuilder(builder) {
        const ref = builder.getRef();
        const from = builder.getFrom();

        if (ref && ref.absolute && ref.key) {
            // Подменяем ключ
            this._key = ref.key;

            return this._processBuilder(this._di.getConfig(ref.key));
        }

        if (from) {
            return this._processBuilder(this._processFrom(from, builder.getFromType()).snapshot().applyBuilder(builder));
        }

        return builder;
    }

    /**
     * @description Обработка from
     * @param {string} key
     * @param {string} type
     * @returns {InstanceBuilderDI}
     * @private
     */
    _processFrom(key, type) {
        let builder = null;

        switch (type) {
            case InstanceBuilderDI.FROM_BUILDER: {
                // Берем билдер из списка билдеров
                builder = this._builders[key].snapshot();

                break;
            }

            case InstanceBuilderDI.FROM_CTX: {
                // Берем билдер из чистого контекста
                builder = this._rawCtx[key].snapshot();

                break;
            }

            case InstanceBuilderDI.FROM_DI: {
                // Берем билдер из DI-контейнера и убираем у него синглтон
                builder = this._di.getConfig(key).snapshot().singleton(false);

                break;
            }

            default: {
                throw new Error(`Unknown 'fromType' ${type} of ${key}`);
            }
        }

        return builder;
    }

    /**
     * @description Процессинг аргументов переданной конфигурации
     * @param {InstanceContainerDI | [] | Object | *} param
     * @param {string} key
     * @returns {InstanceContainerDI | [] | Object | *}
     * @private
     */
    _processParam(param, key) {
        if (param instanceof InstanceRawDI) {
            return param.value;
        }

        if (param instanceof InstanceBuilderDI) {
            if (!param.getLazy()) {
                return new InstanceContainerDI(this._di, key, this._level + 1)
                    .configure({
                        ctx: this._ctx,
                        rawCtx: this._rawCtx,
                        builders: this._builders
                    })
                    .createInstance(param);

            } else {
                return param;

            }
        }

        if (Array.isArray(param)) {
            return this._processArrayParam(param);
        }

        if (typeof param === 'object' && param) {
            return this._processObjectParam(param);
        }

        return param;
    }

    /**
     * @description Процессинг объектов
     * @param {Object} value
     * @private
     */
    _processObjectParam(value) {
        const result = {};

        for (const key of Object.keys(value)) {
            result[key] = this._processParam(value[key], key);
        }

        return result;
    }

    /**
     * @description Процессинг массивов
     * @param {Array} values
     * @returns {Array}
     * @private
     */
    _processArrayParam(values) {
        const result = [];

        let counter = 0;

        for (const param of values) {
            result.push(this._processParam(param, counter++));
        }

        return result;
    }

    /**
     * @description Конфигурирование инстанс-контейнера
     * @param {Object} options
     * @param {Object} options.ctx
     * @param {Object} options.rawCtx
     * @param {Object} options.builders
     * @returns {InstanceContainerDI}
     * @public
     */
    configure({ctx = {}, rawCtx = {}, builders = {}}) {
        this._ctx = ctx;
        this._rawCtx = rawCtx;
        this._builders = builders;

        return this;
    }
}