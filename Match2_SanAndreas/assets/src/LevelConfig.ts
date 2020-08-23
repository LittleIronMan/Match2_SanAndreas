import { FieldProps } from "./BasePlayField";

export default interface LevelConfig {
    /** Название уровня */
    name: string;

    /** Конфигурация уровня */
    fieldProps: FieldProps;

    /** Контент поля */
    field: number[][];
}
