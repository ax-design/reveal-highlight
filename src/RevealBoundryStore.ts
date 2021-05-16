import { CanvasConfig } from './CanvasConfig.js';

export class RevealBoundaryStore {
    id: number;
    container: HTMLElement;

    // The current cursor position relative to window.
    clientX = -1000;
    clientY = -1000;

    // The cursor position of painted reveal effect.
    paintedClientX = -1000;
    paintedClientY = -1000;

    mouseInBoundary = false;
    canvasList: CanvasConfig[] = [];

    animationQueue: CanvasConfig[] = [];
    animationFrame: number | null = null;

    mouseUpClientX = null;
    mouseUpClientY = null;
    mouseDownAnimateStartFrame = null;
    mouseDownAnimateCurrentFrame = null;
    mouseDownAnimateReleasedFrame = null;
    mouseDownAnimateLogicFrame = null;
    mousePressed = false;
    mouseReleased = false;

    maxRadius = -1;

    requestedAnimationFrame = false;

    constructor(id: number, $el: HTMLElement) {
        this.id = id;
        this.container = $el;
    }

    addReveal = ($canvas: HTMLCanvasElement, $container: HTMLElement) => {
        const canvasConfig = new CanvasConfig(this, $canvas, $container);

        canvasConfig.cacheBoundingRect();
        canvasConfig.cacheCanvasPaintingStyle();
        canvasConfig.updateCachedBitmap();

        this.canvasList.push(canvasConfig);
    };

    removeReveal = ($el: HTMLCanvasElement) => {
        this.canvasList = this.canvasList.filter((config) => {
            return config && config.canvas !== $el;
        });
    };

    updateMaxRadius = (x: number) => {
        this.maxRadius = Math.max(x, this.maxRadius);
    };

    requestPaintAll = () => {
        if (this.requestedAnimationFrame) return;
        this.requestedAnimationFrame = true;

        this.animationFrame = window.requestAnimationFrame((frame) => {
            this.requestedAnimationFrame = false;
            this.paintAll(frame);
        });
    };

    onPointerMoveOnScreen = (x: number, y: number) => {
        const boundingBox = this.container.getBoundingClientRect();

        if (x < boundingBox.left - this.maxRadius) return false;
        if (x > boundingBox.right + this.maxRadius) return false;
        if (y < boundingBox.top - this.maxRadius) return false;
        if (y > boundingBox.bottom + this.maxRadius) return false;
        this.mouseInBoundary = true;

        this.clientX = x;
        this.clientY = y;

        this.requestPaintAll();
        return true;
    };

    onPointerEnterBoundary = () => {
        this.mouseInBoundary = true;

        if (!this.animationFrame) {
            this.requestPaintAll();
        }
    };

    onPointerLeaveBoundary = () => {
        this.mouseInBoundary = false;
        this.paintAll(0, true);
    };

    paintAll = (frame: number, skipSamePointerPositionCheck?: boolean) => {
        if (!skipSamePointerPositionCheck && !this.mouseInBoundary && this.animationQueue.length === 0) {
            return;
        }

        for (let i = 0; i < this.animationQueue.length; i++) {
            const config = this.animationQueue[i];

            if (!frame || config.currentFrameId === frame) {
                continue;
            }

            config.currentFrameId = frame;

            if (config.mouseDownAnimateStartFrame === null) {
                config.mouseDownAnimateStartFrame = frame;
            }

            const relativeFrame = frame - config.mouseDownAnimateStartFrame;
            config.mouseDownAnimateCurrentFrame = relativeFrame;

            const speed = config.cachedStyle.pressAnimationSpeed;
            const accelerateRate = config.cachedStyle.releaseAnimationAccelerateRate;

            let unitLogicFrame = relativeFrame;
            if (config.mouseReleased && config.mouseDownAnimateReleasedFrame) {
                unitLogicFrame += (relativeFrame - config.mouseDownAnimateReleasedFrame) * accelerateRate;
            }
            config.mouseDownAnimateLogicFrame = unitLogicFrame / speed;

            if (config.mouseDownAnimateLogicFrame > 1) {
                this.cleanUpAnimation(config);
            }
        }

        for (let i = 0; i < this.canvasList.length; i++) {
            const config = this.canvasList[i];
            config.currentFrameId = frame;

            if (this.mouseInBoundary) {
                config.paint(skipSamePointerPositionCheck);
            } else {
                if (this.animationQueue.indexOf(config) === -1) {
                    config.clear();
                } else {
                    config.paint(skipSamePointerPositionCheck);
                }
            }
        }

        this.paintedClientX = this.clientX;
        this.paintedClientY = this.clientY;

        if (this.mouseInBoundary || this.animationQueue.length !== 0) {
            this.requestPaintAll();
        } else {
            this.animationFrame = null;
        }
    };

    clearAll = () => {
        for (let i = 0; i < this.canvasList.length; i++) {
            const config = this.canvasList[i];
            config.clear();
        }
    };

    initializeAnimation = () => {
        const config = this.canvasList.find((x) => x.mouseInCanvas());

        if (!config) return;

        if (!this.animationQueue.includes(config)) {
            this.animationQueue.push(config);
        }

        config.mouseDownAnimateStartFrame = null;
        config.mousePressed = true;
        config.mouseReleased = false;
    };

    switchAnimation = () => {
        for (let i = 0; i < this.animationQueue.length; i++) {
            const config = this.animationQueue[i];

            if (!config.mouseReleased) {
                config.mouseReleased = true;
                config.mouseDownAnimateReleasedFrame = config.mouseDownAnimateCurrentFrame;
                config.mouseUpClientX = this.clientX;
                config.mouseUpClientY = this.clientY;
            }
        }
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

        const configIdx = this.animationQueue.indexOf(config);
        if (configIdx > -1) {
            this.animationQueue.splice(configIdx, 1);
        }

        config.paint(true);
    };

    getRevealAnimationConfig = () => {
        return this.canvasList.find((x) => x.mouseInCanvas()) || null;
    };
}
