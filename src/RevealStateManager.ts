interface RevealStyle {
    color: string;
    borderStyle: 'full' | 'half' | 'none';
    borderWidth: number;
    fillMode: 'relative' | 'absolute' | 'none';
    fillRadius: number;
    revealAnimateSpeed: number;
    revealReleasedAccelerateRate: number;
    borderWhileNotHover: boolean;
}
interface CanvasConfig {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D | null;
    width: number;
    height: number;
    style: RevealStyle;
    cachedRevealBitmap: CachedRevealBitmap[];
    mouseUpClientX: number | null;
    mouseUpClientY: number | null;
    mouseDownAnimateStartFrame: number | null;
    mouseDownAnimateCurrentFrame: number | null;
    mouseDownAnimateReleasedFrame: number | null;
    mouseDownAnimateLogicFrame: number | null;
    mousePressed: boolean;
    mouseReleased: boolean;

    getCanvasPaintingStyle(): {
        top: number;
        left: number;
        width: number;
        height: number;
        trueFillRadius: number[];
        cacheCanvasSize: number;
    };
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
    addReveal($el: HTMLCanvasElement, style: RevealStyle): void;
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
            addReveal: ($el: HTMLCanvasElement, style: RevealStyle) => {
                const canvasConfig: CanvasConfig = {
                    canvas: $el,
                    ctx: $el.getContext('2d'),
                    cachedRevealBitmap: [],
                    width: 0,
                    height: 0,
                    style,

                    getCanvasPaintingStyle: () => {
                        let { top, left, width, height } = $el.getBoundingClientRect();

                        top = Math.round(top);
                        left = Math.round(left);
                        width = Math.round(width);
                        height = Math.round(height);

                        let trueFillRadius;

                        if (canvasConfig.style.fillMode === 'none') {
                            trueFillRadius = [0, 0];
                        } else {
                            trueFillRadius =
                                canvasConfig.style.fillMode === 'relative'
                                    ? [width, height].sort((a, b) => a - b).map(x => x * canvasConfig.style.fillRadius)
                                    : [canvasConfig.style.fillRadius];
                        }
                        const cacheCanvasSize = trueFillRadius[1] * 2;
                        return { top, left, width, height, trueFillRadius, cacheCanvasSize };
                    },

                    cacheRevealBitmaps: () => {
                        if (!canvasConfig.ctx) return;
                        const {
                            width,
                            height,
                            trueFillRadius,
                            cacheCanvasSize
                        } = canvasConfig.getCanvasPaintingStyle();
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

                            fillAlpha = i === 0 ? ', 0.6)' : ', 0.3)';

                            grd = revealCtx.createRadialGradient(
                                cacheCanvasSize / 2,
                                cacheCanvasSize / 2,
                                0,
                                cacheCanvasSize / 2,
                                cacheCanvasSize / 2,
                                trueFillRadius[i]
                            );

                            grd.addColorStop(0, 'rgba(' + canvasConfig.style.color + fillAlpha);
                            grd.addColorStop(1, 'rgba(' + canvasConfig.style.color + ', 0.0)');

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

                        const _innerAlpha = 0.2 - frame;
                        const _outerAlpha = 0.1 - frame * 0.07;
                        const _outerBorder = 0.1 + frame * 0.8;

                        const innerAlpha = _innerAlpha < 0 ? 0 : _innerAlpha;
                        const outerAlpha = _outerAlpha < 0 ? 0 : _outerAlpha;
                        const outerBorder = _outerBorder > 1 ? 1 : _outerBorder;

                        grd.addColorStop(0, `rgba(0,0,0,${innerAlpha})`);
                        grd.addColorStop(outerBorder * 0.55, `rgba(${canvasConfig.style.color} ,${outerAlpha})`);
                        grd.addColorStop(outerBorder, `rgba(${canvasConfig.style.color}, 0)`);

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
                    const answer = $el === el.canvas;

                    storage.canvasList.splice(idx, 1);
                    return answer;
                });
            },

            onPointerEnterBoundary: () => {
                storage.mouseInBoundary = true;

                if (!storage.raf) storage.raf = window.requestAnimationFrame(() => storage.paintAll());
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

                    if (config.mouseDownAnimateStartFrame === null) config.mouseDownAnimateStartFrame = frame;

                    const relativeFrame = frame - config.mouseDownAnimateStartFrame;
                    config.mouseDownAnimateCurrentFrame = relativeFrame;

                    const speed = config.style.revealAnimateSpeed;
                    const accelerateRate = config.style.revealReleasedAccelerateRate;

                    config.mouseDownAnimateLogicFrame =
                        !config.mouseReleased || !config.mouseDownAnimateReleasedFrame
                            ? relativeFrame / speed
                            : relativeFrame / speed +
                              ((relativeFrame - config.mouseDownAnimateReleasedFrame) / speed) * accelerateRate;

                    if (config.mouseDownAnimateLogicFrame > 1) storage.cleanUpAnimation(config);
                });

                storage.canvasList.forEach((config, index) => {
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

                storage.paintAll(0, true);
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

    const { borderStyle, borderWidth, fillMode } = config.style;

    const relativeX = storage.clientX - left;
    const relativeY = storage.clientY - top;

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
    }

    const putX = relativeX - cacheCanvasSize / 2;
    const putY = relativeY - cacheCanvasSize / 2;

    if (isNaN(relativeX) || isNaN(relativeY)) return;

    if (storage.mouseInBoundary) {
        const mouseInCanvas = relativeX > 0 && relativeX < width && (relativeY > 0 && relativeY < height);

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
