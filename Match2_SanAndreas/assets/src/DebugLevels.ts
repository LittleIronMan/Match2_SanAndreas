import { EMPTY_CELL, ANY_COLOR, BLOCKED_CELL, BOMB_TAG } from "./Constants";
import { LevelConfig } from "./LevelConfig";

const _ = EMPTY_CELL;
const A = ANY_COLOR;
const BB = BLOCKED_CELL;
const G = BOMB_TAG;

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
    {
        name: "#3 Cascade of bombs",
        fieldProps: {
            width: 8,
            height: 8,
            countColors: 3
        },
        field: [
            [ A, G, A, G, A, G, A, G],
            [ A, A, A, A, A, A, A, A],
            [ A, G, A, G, A, G, A, G],
            [ A, A, A, A, A, A, A, A],
            [ A, G, A, G, A, G, A, G],
            [ A, A, A, A, A, A, A, A],
            [ A, G, A, G, A, G, A, G],
            [ A, A, A, A, A, A, A, A],
        ]
    },
];