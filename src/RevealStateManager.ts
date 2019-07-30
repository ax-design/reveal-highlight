// interface RevealStyle {
//     color: string;
//     borderStyle: 'full' | 'half' | 'none';
//     borderWidth: number;
//     fillMode: 'relative' | 'absolute' | 'none';
//     fillRadius: number;
//     diffuse: boolean;
//     revealAnimateSpeed: number;
//     revealReleasedAccelerateRate: number;
// }

interface CachedStyle {
    top: number;
    left: number;
    width: number;
    height: number;
    color: string;
    opacity: number;
    trueFillRadius: number[];
    cacheCanvasSize: number;
    borderStyle: string;
    borderWidth: number;
    fillMode: string;
    fillRadius: number;
    diffuse: boolean;
    revealAnimateSpeed: number;
    revealReleasedAccelerateRate: number;
}

interface CanvasConfig {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D | null;
    width: number;
    height: number;
    cachedRevealBitmap: CachedRevealBitmap[];
    mouseUpClientX: number | null;
    mouseUpClientY: number | null;
    mouseDownAnimateStartFrame: number | null;
    mouseDownAnimateCurrentFrame: number | null;
    mouseDownAnimateReleasedFrame: number | null;
    mouseDownAnimateLogicFrame: number | null;
    mousePressed: boolean;
    mouseReleased: boolean;
    cachedStyle: CachedStyle;
    currentFrameId: any;
    cachedFrameId: any;

    getCanvasPaintingStyle(): CachedStyle;
    cacheRevealBitmaps(): void;
    mouseInCanvas(): boolean;
    getAnimateGrd(frame: number, grd: CanvasGradient): void;
}

export interface RevealBoundaryStore extends Partial<CanvasConfig> {
    _currentHashId: number;
    id: number;
    // The current cursor position relative to window.
    clientX: number;
    clientY: number;
    // The cursor position of painted reveal effect.
    paintedClientX: number;
    paintedClientY: number;
    destroy(): void;
    // Add a new reveal effect.
    addReveal($el: HTMLCanvasElement): void;
    removeReveal($el: HTMLCanvasElement): void;
    mouseInBoundary: boolean;
    canvasList: CanvasConfig[];
    onPointerEnterBoundary(): void;
    onPointerLeaveBoundary(): void;
    paintAll(frame?: number, force?: boolean): void;
    resetAll(): void;
    initializeAnimation(): void;
    switchAnimation(): void;
    cleanUpAnimation(config: CanvasConfig): void;
    animationQueue: Set<CanvasConfig>;
    dirty: boolean;
    raf: number | null;
    getRevealAnimationConfig(): CanvasConfig | null;
    revealAnimationConfig: CanvasConfig | null;
}

interface CachedRevealBitmap {
    type: number;
    bitmap: ImageData;
}

class RevealStateManager {
    private _currentHashId = 0;
    private _storage: RevealBoundaryStore[] = [];
    newBoundary = () => {
        const hashId = this._currentHashId++;
        const storage: RevealBoundaryStore = {
            _currentHashId: 0,
            id: hashId,
            clientX: -1000,
            clientY: -1000,
            paintedClientX: -1000,
            paintedClientY: -1000,
            mouseInBoundary: false,
            canvasList: [],
            dirty: false,
            raf: null,
            destroy: () => {
                this._storage.find((sto, idx) => {
                    const answer = sto === storage;

                    this._storage.splice(idx, 1);
                    return answer;
                });
            },
            addReveal: ($el: HTMLCanvasElement) => {
                const canvasConfig: CanvasConfig = {
                    canvas: $el,
                    ctx: $el.getContext('2d'),
                    cachedRevealBitmap: [],
                    width: 0,
                    height: 0,
                    cachedStyle: {
                        top: -1,
                        left: -1,
                        width: -1,
                        height: -1,
                        trueFillRadius: [0, 0],
                        cacheCanvasSize: -1,
                        color: '',
                        opacity: 1,
                        borderStyle: '',
                        borderWidth: 1,
                        fillMode: '',
                        fillRadius: 0,
                        diffuse: true,
                        revealAnimateSpeed: 0,
                        revealReleasedAccelerateRate: 0
                    },
                    currentFrameId: -1,
                    cachedFrameId: -2,

                    getCanvasPaintingStyle: () => {
                        let top, left, width, height
                            , color, opacity, borderStyle, borderWidth
                            , fillMode, fillRadius = 0, diffuse
                            , revealAnimateSpeed, revealReleasedAccelerateRate;
                        if (canvasConfig.currentFrameId !== canvasConfig.cachedFrameId) {
                            const boundingRect = $el.getBoundingClientRect();
                            const computedStyle = $el.computedStyleMap();

                            if (computedStyle.size === 0) return canvasConfig.cachedStyle;

                            const colorStringMatch = computedStyle.get('--reveal-color').toString().match(/\((\d+,\s*\d+,\s*\d+)[\s\S]*?\)/);

                            color = colorStringMatch && colorStringMatch.length > 1 ? colorStringMatch[1] : '0, 0, 0';
                            opacity = computedStyle.get('--reveal-opacity').value as number;
                            borderStyle = computedStyle.get('--reveal-border-style').value as string;
                            borderWidth = computedStyle.get('--reveal-border-width').value as number;
                            fillMode = computedStyle.get('--reveal-fill-mode').value as string;
                            fillRadius = computedStyle.get('--reveal-fill-radius').value as number;
                            diffuse = computedStyle.get('--reveal-diffuse').value === 'true';
                            revealAnimateSpeed = computedStyle.get('--reveal-animate-speed').value as number;
                            revealReleasedAccelerateRate = computedStyle.get('--reveal-released-accelerate-rate').value as number;

                            top = Math.round(boundingRect.top);
                            left = Math.round(boundingRect.left);
                            width = Math.round(boundingRect.width);
                            height = Math.round(boundingRect.height);

                            let trueFillRadius = [0, 0];

                            switch (fillMode) {
                                case 'none':
                                    break;
                                case 'relative':
                                    trueFillRadius = [width, height].sort((a, b) => a - b).map(x => x * fillRadius);
                                    break;
                                case 'absolute':
                                    trueFillRadius = [fillRadius, fillRadius];
                                    break;
                                default:
                                    throw new SyntaxError('The value of `--reveal-border-style` must be `relative`, `absolute` or `none`!');
                            }

                            const cacheCanvasSize = trueFillRadius[1] * 2;

                            canvasConfig.cachedStyle = {
                                top, left, width, height,
                                trueFillRadius, cacheCanvasSize,
                                color, opacity, borderStyle, borderWidth,
                                fillMode, fillRadius, diffuse,
                                revealAnimateSpeed, revealReleasedAccelerateRate
                            };

                            canvasConfig.cachedFrameId = canvasConfig.currentFrameId;
                        }

                        return canvasConfig.cachedStyle;
                    },

                    cacheRevealBitmaps: () => {
                        if (!canvasConfig.ctx) return;
                        const {
                            width,
                            height,
                            trueFillRadius,
                            cacheCanvasSize
                        } = canvasConfig.getCanvasPaintingStyle();

                        const { color, opacity }= canvasConfig.cachedStyle;

                        canvasConfig.width = width;
                        canvasConfig.height = height;
                        canvasConfig.canvas.width = width;
                        canvasConfig.canvas.height = height;
                        canvasConfig.cachedRevealBitmap = [];

                        let fillAlpha, grd, revealCanvas, revealCtx;

                        for (let i of [0, 1]) {
                            // 0 means border, 1 means fill.
                            revealCanvas = document.createElement('canvas');
                            revealCanvas.width = cacheCanvasSize;
                            revealCanvas.height = cacheCanvasSize;

                            revealCtx = revealCanvas.getContext('2d');
                            if (!revealCtx) return;

                            fillAlpha = i === 0 ? opacity : (opacity * 0.5);

                            grd = revealCtx.createRadialGradient(
                                cacheCanvasSize / 2,
                                cacheCanvasSize / 2,
                                0,
                                cacheCanvasSize / 2,
                                cacheCanvasSize / 2,
                                trueFillRadius[i]
                            );

                            grd.addColorStop(0, 'rgba(' + color + ', ' + fillAlpha + ')');
                            grd.addColorStop(1, 'rgba(' + color + ', 0.0)');

                            revealCtx.fillStyle = grd;
                            revealCtx.fillRect(0, 0, cacheCanvasSize, cacheCanvasSize);

                            canvasConfig.cachedRevealBitmap.push({
                                type: i,
                                bitmap: revealCtx.getImageData(0, 0, cacheCanvasSize, cacheCanvasSize)
                            });
                        }
                    },

                    mouseInCanvas: () => {
                        const { top, left, width, height } = canvasConfig.getCanvasPaintingStyle();

                        const relativeX = storage.clientX - left;
                        const relativeY = storage.clientY - top;

                        if (relativeX < 0 || relativeX > width) return false;
                        if (relativeY < 0 || relativeY > height) return false;
                        return true;
                    },

                    getAnimateGrd: (frame: number, grd: CanvasGradient) => {
                        if (!canvasConfig.ctx) return null;

                        const { color, opacity } = canvasConfig.cachedStyle;

                        const _innerAlpha = opacity * (0.2 - frame);
                        const _outerAlpha = opacity * (0.1 - frame * 0.07);
                        const _outerBorder = 0.1 + frame * 0.8;

                        const innerAlpha = _innerAlpha < 0 ? 0 : _innerAlpha;
                        const outerAlpha = _outerAlpha < 0 ? 0 : _outerAlpha;
                        const outerBorder = _outerBorder > 1 ? 1 : _outerBorder;

                        grd.addColorStop(0, `rgba(${color},${innerAlpha})`);
                        grd.addColorStop(outerBorder * 0.55, `rgba(${color},${outerAlpha})`);
                        grd.addColorStop(outerBorder, `rgba(${color}, 0)`);

                        return grd;
                    },

                    mouseUpClientX: null,
                    mouseUpClientY: null,
                    mouseDownAnimateStartFrame: null,
                    mouseDownAnimateCurrentFrame: null,
                    mouseDownAnimateReleasedFrame: null,
                    mouseDownAnimateLogicFrame: null,
                    mousePressed: false,
                    mouseReleased: false
                };

                canvasConfig.cacheRevealBitmaps();
                storage.canvasList.push(canvasConfig);
            },

            removeReveal: ($el: HTMLCanvasElement) => {
                storage.canvasList.find((el, idx) => {
                    if (!el) return false;
                    
                    const answer = $el === el.canvas;

                    storage.canvasList.splice(idx, 1);
                    return answer;
                });
            },

            onPointerEnterBoundary: () => {
                storage.mouseInBoundary = true;

                if (!storage.raf) storage.raf = window.requestAnimationFrame((frame) => storage.paintAll(frame));
            },

            onPointerLeaveBoundary: () => {
                storage.mouseInBoundary = false;
                storage.paintAll(0, true);
            },

            paintAll: (frame?: number, force?: boolean) => {
                if (!force) {
                    if (!storage.mouseInBoundary && storage.animationQueue.size === 0) {
                        return;
                    }
                }

                storage.animationQueue.forEach(config => {
                    if (!frame) return;
                    if (config.currentFrameId === frame) return;

                    config.currentFrameId = frame;

                    if (config.mouseDownAnimateStartFrame === null) config.mouseDownAnimateStartFrame = frame;

                    const relativeFrame = frame - config.mouseDownAnimateStartFrame;
                    config.mouseDownAnimateCurrentFrame = relativeFrame;

                    const speed = config.cachedStyle.revealAnimateSpeed;
                    const accelerateRate = config.cachedStyle.revealReleasedAccelerateRate;

                    config.mouseDownAnimateLogicFrame =
                        !config.mouseReleased || !config.mouseDownAnimateReleasedFrame
                            ? relativeFrame / speed
                            : relativeFrame / speed +
                            ((relativeFrame - config.mouseDownAnimateReleasedFrame) / speed) * accelerateRate;

                    if (config.mouseDownAnimateLogicFrame > 1) storage.cleanUpAnimation(config);
                });

                storage.canvasList.forEach((config, index) => {
                    config.currentFrameId = frame;
                    paintCanvas(config, storage, force);
                });

                storage.dirty = true;
                storage.paintedClientX = storage.clientX;
                storage.paintedClientY = storage.clientY;

                if (storage.mouseInBoundary || storage.animationQueue.size !== 0) {
                    window.requestAnimationFrame(frame => {
                        storage.paintAll(frame);
                    });
                } else {
                    storage.raf = null;
                }
            },

            resetAll: () => {
                storage.canvasList.forEach(config => {
                    paintCanvas(config, storage);
                });
            },

            initializeAnimation: () => {
                const config = storage.canvasList.find(x => x.mouseInCanvas());

                if (!config) return;

                storage.animationQueue.add(config);
                config.mouseDownAnimateStartFrame = null;
                config.mousePressed = true;
                config.mouseReleased = false;
            },

            switchAnimation: () => {
                storage.animationQueue.forEach(config => {
                    if (!config.mouseReleased) {
                        config.mouseReleased = true;
                        config.mouseDownAnimateReleasedFrame = config.mouseDownAnimateCurrentFrame;
                        config.mouseUpClientX = storage.clientX;
                        config.mouseUpClientY = storage.clientY;
                    }
                });
            },

            cleanUpAnimation: (config: CanvasConfig) => {
                config.mouseUpClientX = null;
                config.mouseUpClientY = null;
                config.mouseDownAnimateStartFrame = null;
                config.mouseDownAnimateCurrentFrame = null;
                config.mouseDownAnimateReleasedFrame = null;
                config.mouseDownAnimateLogicFrame = null;
                config.mousePressed = false;
                config.mouseReleased = false;

                storage.animationQueue.delete(config);

                paintCanvas(config, storage, true);
            },

            animationQueue: new Set(),

            getRevealAnimationConfig: () => {
                return storage.canvasList.find(x => x.mouseInCanvas()) || null;
            },

            revealAnimationConfig: null,
            mouseUpClientX: null,
            mouseUpClientY: null,
            mouseDownAnimateStartFrame: null,
            mouseDownAnimateCurrentFrame: null,
            mouseDownAnimateReleasedFrame: null,
            mouseDownAnimateLogicFrame: null,
            mousePressed: false,
            mouseReleased: false
        };

        this._storage.push(storage);

        return storage;
    };
}

const paintCanvas = (config: CanvasConfig, storage: RevealBoundaryStore, force?: boolean, debug?: boolean) => {
    const animationPlaying = storage.animationQueue.has(config);
    if (
        storage.clientX === storage.paintedClientX &&
        storage.clientY === storage.paintedClientY &&
        !animationPlaying &&
        !force
    )
        return;

    if (!config.ctx) return;

    config.ctx.clearRect(0, 0, config.width, config.height);
    storage.dirty = false;

    if (!storage.mouseInBoundary && !animationPlaying) return;
    if (config.cachedRevealBitmap.length < 2) return;

    const { top, left, width, height, cacheCanvasSize, trueFillRadius } = config.getCanvasPaintingStyle();

    if (width !== config.width || height !== config.height) {
        config.cacheRevealBitmaps();
    }

    const borderStyle = config.cachedStyle.borderStyle;
    const borderWidth = config.cachedStyle.borderWidth;
    const fillMode = config.cachedStyle.fillMode;

    const relativeX = storage.clientX - left;
    const relativeY = storage.clientY - top;

    const mouseInCanvas = relativeX > 0 && relativeX < width && (relativeY > 0 && relativeY < height);

    if (!mouseInCanvas && !config.cachedStyle.diffuse && !animationPlaying) return;

    let fillX = 0,
        fillY = 0,
        fillW = 0,
        fillH = 0;

    switch (borderStyle) {
        case 'full':
            fillX = borderWidth;
            fillY = borderWidth;
            fillW = width - 2 * borderWidth;
            fillH = height - 2 * borderWidth;
            break;
        case 'half':
            fillX = 0;
            fillY = borderWidth;
            fillW = width;
            fillH = height - 2 * borderWidth;
            break;
        case 'none':
            fillX = 0;
            fillY = 0;
            fillW = width;
            fillH = height;
            break;
        default:
            throw new SyntaxError('The value of `--reveal-border-style` must be `full`, `half` or `none`!');
    }

    const putX = relativeX - cacheCanvasSize / 2;
    const putY = relativeY - cacheCanvasSize / 2;

    if (isNaN(relativeX) || isNaN(relativeY)) return;

    if (storage.mouseInBoundary) {
        if (borderStyle !== 'none') {
            config.ctx.putImageData(config.cachedRevealBitmap[0].bitmap, putX, putY, -putX, -putY, width, height);
            config.ctx.clearRect(fillX, fillY, fillW, fillH);
        }

        if (fillMode != 'none' && mouseInCanvas)
            config.ctx.putImageData(
                config.cachedRevealBitmap[1].bitmap,
                putX,
                putY,
                fillX - putX,
                fillY - putY,
                fillW,
                fillH
            );
    }

    if (!config.mousePressed || !config.mouseDownAnimateLogicFrame) return;

    let animateGrd;

    if (config.mouseReleased && config.mouseUpClientX && config.mouseUpClientY) {
        animateGrd = config.ctx.createRadialGradient(
            config.mouseUpClientX - left,
            config.mouseUpClientY - top,
            0,
            config.mouseUpClientX - left,
            config.mouseUpClientY - top,
            trueFillRadius[1]
        );
    } else {
        animateGrd = config.ctx.createRadialGradient(relativeX, relativeY, 0, relativeX, relativeY, trueFillRadius[1]);
    }

    config.getAnimateGrd(config.mouseDownAnimateLogicFrame, animateGrd);
    config.ctx.fillStyle = animateGrd;
    config.ctx.fillRect(fillX, fillY, fillW * 1.5, fillH * 1.5);
};

export default RevealStateManager;
