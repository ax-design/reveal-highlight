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
        canvasConfig.updateCachedBitmap();

        this.canvasList.push(canvasConfig);
    };

    removeReveal = ($el: HTMLCanvasElement) => {
        this.canvasList = this.canvasList.filter((config) => {
            return config && config.canvas === $el;
        });
    };

    onPointerEnterBoundary = () => {
        this.mouseInBoundary = true;

        if (!this.animationFrame) {
            this.animationFrame = window.requestAnimationFrame(this.paintAll);
        }
    };

    onPointerLeaveBoundary = () => {
        this.mouseInBoundary = false;
        this.paintAll(0, true);
    };

    paintAll = (frame?: number, force?: boolean) => {
        if (!force && !this.mouseInBoundary && this.animationQueue.size === 0) {
            return;
        }

        this.animationQueue.forEach(config => {
            if (!frame || config.currentFrameId === frame) {
                return;
            }

            config.currentFrameId = frame;

            if (config.mouseDownAnimateStartFrame === null) {
                config.mouseDownAnimateStartFrame = frame;
            }

            const relativeFrame = frame - config.mouseDownAnimateStartFrame;
            config.mouseDownAnimateCurrentFrame = relativeFrame;

            const speed = config.cachedStyle.revealAnimateSpeed;
            const accelerateRate = config.cachedStyle.revealReleasedAccelerateRate;

            let unitLogicFrame = relativeFrame;
            if (config.mouseReleased && config.mouseDownAnimateReleasedFrame) {
                unitLogicFrame += (relativeFrame - config.mouseDownAnimateReleasedFrame) * accelerateRate;
            }
            config.mouseDownAnimateLogicFrame = unitLogicFrame / speed;

            if (config.mouseDownAnimateLogicFrame > 1) {
                this.cleanUpAnimation(config);
            }
        });

        for (let i = 0; i < this.canvasList.length; i++) {
            const config = this.canvasList[i];
            config.currentFrameId = frame;
            config.paint(force);
        }

        this.dirty = true;
        this.paintedClientX = this.clientX;
        this.paintedClientY = this.clientY;

        if (this.mouseInBoundary || this.animationQueue.size !== 0) {
            this.animationFrame = window.requestAnimationFrame(this.paintAll);
        } else {
            this.animationFrame = null;
        }
    };

    resetAll = () => {
        for (let i = 0; i < this.canvasList.length; i++) {
            const config = this.canvasList[i];
            config.paint();
        }
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

        config.paint(true);
    };

    getRevealAnimationConfig = () => {
        return this.canvasList.find(x => x.mouseInCanvas()) || null;
    };
}
