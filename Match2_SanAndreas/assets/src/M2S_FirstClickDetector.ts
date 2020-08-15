/** firstClickDetected - флаг того,
 *  что юзер хотя-бы один раз кликнул по интерфейсу одной из сцен.
 *  Флаг используется для корректного воиспроизведения звуков в браузере.
 */
var g: {firstClickDetected: boolean};
if (window) {
    g = window as any;
}
else {
    g = { firstClickDetected: true };
}

export default g;