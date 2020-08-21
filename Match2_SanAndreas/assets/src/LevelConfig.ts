import { FieldProps } from "./BasePlayField";

export interface LevelConfig {
    name: string;
    fieldProps: FieldProps;
    field: number[][];
}
