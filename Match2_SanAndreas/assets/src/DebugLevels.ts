import { EMPTY_CELL, ANY_COLOR, BLOCKED_CELL } from "./Constants";
import { LevelConfig } from "./LevelConfig";

const _ = EMPTY_CELL;
const A = ANY_COLOR;
const BB = BLOCKED_CELL;

export const debugLevels: LevelConfig[] = [
    {
        name: "#1 Diagonal Fallings",
        fieldProps: {
            width: 8,
            height: 8,
            countColors: 3
        },
        field: [
            [ A,BB, A,BB, A,BB, A,BB],
            [BB, _,BB, _,BB, _,BB, _],
            [ _,BB, _,BB, _,BB, _,BB],
            [ _, _, _, _, _, _, _, _],
            [BB, _,BB, _,BB, _,BB, _],
            [ _,BB, _,BB, _,BB, _,BB],
            [ _, _, _, _, _, _, _, _],
            [ A, A, A, A, A, A, A, A],
        ]
    },
    {
        name: "#2 2x2 field",
        fieldProps: {
            width: 2,
            height: 2,
            countColors: 3
        },
        field: [
            [ A, A],
            [ A, A],
        ]
    }
];