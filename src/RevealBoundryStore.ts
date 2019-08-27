import { CanvasConfig } from './CanvasConfig.js';

export class RevealBoundaryStore {
    id: number;

    // The current cursor position relative to window.
    clientX = -1000;
    clientY = -1000;

    // The cursor position of painted reveal effect.
    paintedClientX = -1000;
    paintedClientY = -1000;

    mouseInBoundary = false;
    canvasList: CanvasConfig[] = [];

    animationQueue = new Set<CanvasConfig>();
    animationFrame: number | null = null;
    dirty = false;

    mouseUpClientX = null;
    mouseUpClientY = null;
    mouseDownAnimateStartFrame = null;
    mouseDownAnimateCurrentFrame = null;
    mouseDownAnimateReleasedFrame = null;
    mouseDownAnimateLogicFrame = null;
    mousePressed = false;
    mouseReleased = false;

    constructor(id: number) {
        this.id = id;
    }

    addReveal = ($el: HTMLCanvasElement) => {
        const canvasConfig = new CanvasConfig(this, $el);

        canvasConfig.cacheCanvasPaintingStyle();
        canvasConfig.cacheRevealBitmaps();

        this.canvasList.push(canvasConfig);
    };

    removeReveal = ($el: HTMLCanvasElement) => {
        this.canvasList.find((config, idx) => {
            if (config && $el === config.canvas) {
                this.canvasList.splice(idx, 1);
                return true;
            }

            return false;
        });
    };

    onPointerEnterBoundary = () => {
        this.mouseInBoundary = true;

        if (!this.animationFrame) {
            this.animationFrame = window.requestAnimationFrame((frame) => this.paintAll(frame));
        }
    };

    onPointerLeaveBoundary = () => {
        this.mouseInBoundary = false;
        this.paintAll(0, true);
    };

    paintAll = (frame?: number, force?: boolean) => {
        if (!force) {
            if (!this.mouseInBoundary && this.animationQueue.size === 0) {
                return;
            }
        }

        this.animationQueue.forEach(config => {
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

            if (config.mouseDownAnimateLogicFrame > 1) this.cleanUpAnimation(config);
        });

        this.canvasList.forEach((config, index) => {
            config.currentFrameId = frame;
            paintCanvas(config, this, force);
        });

        this.dirty = true;
        this.paintedClientX = this.clientX;
        this.paintedClientY = this.clientY;

        if (this.mouseInBoundary || this.animationQueue.size !== 0) {
            window.requestAnimationFrame(frame => {
                this.paintAll(frame);
            });
        } else {
            this.animationFrame = null;
        }
    };

    resetAll = () => {
        this.canvasList.forEach(config => {
            paintCanvas(config, this);
        });
    };

    initializeAnimation = () => {
        const config = this.canvasList.find(x => x.mouseInCanvas());

        if (!config) return;

        this.animationQueue.add(config);
        config.mouseDownAnimateStartFrame = null;
        config.mousePressed = true;
        config.mouseReleased = false;
    };

    switchAnimation = () => {
        this.animationQueue.forEach(config => {
            if (!config.mouseReleased) {
                config.mouseReleased = true;
                config.mouseDownAnimateReleasedFrame = config.mouseDownAnimateCurrentFrame;
                config.mouseUpClientX = this.clientX;
                config.mouseUpClientY = this.clientY;
            }
        });
    };

    cleanUpAnimation = (config: CanvasConfig) => {
        config.mouseUpClientX = null;
        config.mouseUpClientY = null;
        config.mouseDownAnimateStartFrame = null;
        config.mouseDownAnimateCurrentFrame = null;
        config.mouseDownAnimateReleasedFrame = null;
        config.mouseDownAnimateLogicFrame = null;
        config.mousePressed = false;
        config.mouseReleased = false;

        this.animationQueue.delete(config);

        paintCanvas(config, this, true);
    };

    getRevealAnimationConfig = () => {
        return this.canvasList.find(x => x.mouseInCanvas()) || null;
    };
}

const paintCanvas = (config: CanvasConfig, storage: RevealBoundaryStore, force?: boolean, debug?: boolean) => {
    const animationPlaying = storage.animationQueue.has(config);
    const samePosition = storage.clientX === storage.paintedClientX && storage.clientY === storage.paintedClientY;

    if (samePosition && !animationPlaying && !force) {
        return;
    }

    if (!config.ctx) {
        return;
    }

    config.ctx.clearRect(0, 0, config.width, config.height);
    storage.dirty = false;

    if (!storage.mouseInBoundary && !animationPlaying) {
        return;
    }

    if (config.cachedRevealBitmap.bitmaps.length < 2) {
        return;
    }

    config.cacheCanvasPaintingStyle();
    config.cacheRevealBitmaps();

    const { top, left, width, height, cacheCanvasSize, trueFillRadius } = config.cachedStyle;

    const borderStyle = config.cachedStyle.borderStyle;
    const borderWidth = config.cachedStyle.borderWidth;
    const fillMode = config.cachedStyle.fillMode;

    const relativeX = storage.clientX - left;
    const relativeY = storage.clientY - top;

    const mouseInCanvas = relativeX > 0 && relativeX < width && (relativeY > 0 && relativeY < height);

    if (!mouseInCanvas && !config.cachedStyle.diffuse && !animationPlaying) {
        return;
    }

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

    if (isNaN(relativeX) || isNaN(relativeY)) {
        return;
    }

    if (storage.mouseInBoundary) {
        if (borderStyle !== 'none') {
            config.ctx.putImageData(
                config.cachedRevealBitmap.bitmaps[0],
                putX,
                putY,
                -putX,
                -putY,
                width,
                height,
            );
            config.ctx.clearRect(fillX, fillY, fillW, fillH);
        }

        if (fillMode !== 'none' && mouseInCanvas) {
            config.ctx.putImageData(
                config.cachedRevealBitmap.bitmaps[1],
                putX,
                putY,
                fillX - putX,
                fillY - putY,
                fillW,
                fillH,
            );
        }
    }

    if (!config.mousePressed || !config.mouseDownAnimateLogicFrame) {
        return;
    }

    let animateGrd;

    if (config.mouseReleased && config.mouseUpClientX && config.mouseUpClientY) {
        animateGrd = config.ctx.createRadialGradient(
            config.mouseUpClientX - left,
            config.mouseUpClientY - top,
            0,
            config.mouseUpClientX - left,
            config.mouseUpClientY - top,
            trueFillRadius[1],
        );
    } else {
        animateGrd = config.ctx.createRadialGradient(
            relativeX,
            relativeY,
            0,
            relativeX,
            relativeY,
            trueFillRadius[1],
        );
    }

    config.getAnimateGrd(config.mouseDownAnimateLogicFrame, animateGrd);

    config.ctx.fillStyle = animateGrd;
    config.ctx.fillRect(fillX, fillY, fillW * 1.5, fillH * 1.5);
};
