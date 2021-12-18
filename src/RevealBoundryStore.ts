import { CanvasConfig } from './CanvasConfig.js';
import { SvgConfig } from './SvgConfig.js';

type Config = CanvasConfig | SvgConfig;

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
    canvasList: Config[] = [];

    animationQueue: Config[] = [];
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

    addReveal = ($element: HTMLCanvasElement | SVGElement, $container: HTMLElement) => {
        let config: Config;
        const elementType = Object.prototype.toString.call($element);

        if (elementType === '[object HTMLCanvasElement]') {
            config = new CanvasConfig(this, $element as HTMLCanvasElement, $container);
        } else if (elementType === '[object SVGSVGElement]') {
            config = new SvgConfig(this, $element as SVGSVGElement, $container);
        } else {
            throw new TypeError(`Unknown element type, got: ${elementType}, Canvas or SVG element expected.`)
        }

        config.cacheBoundingRect();
        config.cacheCanvasPaintingStyle();
        config.updateCachedBitmap();

        this.canvasList.push(config);
    };

    removeReveal = ($el: HTMLCanvasElement | SVGElement) => {
        this.canvasList = this.canvasList.filter((config) => {
            return config && config.element !== $el;
        });
    };

    updateMaxRadius = (x: number) => {
        this.maxRadius = Math.max(x, this.maxRadius);
    };

    requestPaintAll = (cleanup?: boolean) => {
        if (this.requestedAnimationFrame) return;
        this.requestedAnimationFrame = true;

        this.animationFrame = window.requestAnimationFrame((frame) => {
            this.requestedAnimationFrame = false;
            this.paintAll(cleanup ? -1 : frame, true);
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

    /**
     * Repaint all canvas while user's pointer has entered the boundary.
     */
    onPointerEnterBoundary = () => {
        this.mouseInBoundary = true;

        if (!this.animationFrame) {
            this.requestPaintAll();
        }
    };

    /**
     * Clear all canvas while user's pointer leave the bounary.
     */
    onPointerLeaveBoundary = () => {
        this.mouseInBoundary = false;
        this.requestPaintAll(true);
    };

    /**
     * The painting method that draw everything on your screen.
     * @param frame current frame index, if this value is 0, it means all canvas
     *  should be cleaned.
     * @param skipSamePointerPositionCheck Literally. 
     */
    private paintAll = (frame: number, skipSamePointerPositionCheck?: boolean) => {
        if (!skipSamePointerPositionCheck && !this.mouseInBoundary && this.animationQueue.length === 0) {
            return;
        }

        // Animation duration checkup
        for (let i = 0; i < this.animationQueue.length; i++) {
            const config = this.animationQueue[i];

            if (!frame || config.currentFrameId === frame) {
                continue;
            }

            config.currentFrameId = frame;

            // Initialize the animation parameter
            if (config.mouseDownAnimateStartFrame === null) {
                config.mouseDownAnimateStartFrame = frame;
            }

            // Calculate how long the animation has been playing
            const relativeFrame = frame - config.mouseDownAnimateStartFrame;
            config.mouseDownAnimateCurrentFrame = relativeFrame;

            const speed = config.cachedStyle.pressAnimationSpeed;
            const accelerateRate = config.cachedStyle.releaseAnimationAccelerateRate;

            // We assume that Ripple is a one-way linear process from
            // no diffusion to fully diffused, 
            // and Logic Frame represents the progress of the animation
            // in this process.
            let unitLogicFrame = relativeFrame;
            if (config.mouseReleased && config.mouseDownAnimateReleasedFrame) {
                unitLogicFrame += (relativeFrame - config.mouseDownAnimateReleasedFrame) * accelerateRate;
            }
            config.mouseDownAnimateLogicFrame = unitLogicFrame / speed;

            if (config.mouseDownAnimateLogicFrame > 1) {
                // It will be cleaned later
                config.cleanedUpForAnimation = true;
            }
        }

        // Paint the canvas one by one
        for (let i = 0; i < this.canvasList.length; i++) {
            const config = this.canvasList[i];
            config.currentFrameId = frame;

            if (config.cleanedUpForAnimation) {
                this.cleanUpAnimationUnit(config, false);
                config.cleanedUpForAnimation = false;
            } else {
                const isPlayingAnimation = this.animationQueue.indexOf(config) === -1;

                if (this.mouseInBoundary || isPlayingAnimation) {
                    config.paint(skipSamePointerPositionCheck);
                } else {
                    config.clear(false);
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

    /**
     * Clear all canvas.
     */
    clearAll = (forAnimation: boolean) => {
        this.cleanupAnimation(forAnimation, true);
    };

    /**
     * This is the effect while user pressed on the reveal highlight,
     * the ripple start to spread slowly.
     */
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

    /**
     * This is the effect while user released it's pointer, the spreading
     * ripple animation will start to accelerate.
     */
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

    /**
     * Cleanup all animations.
     * @param skipPaint Only cleanup data or also clean up the canvas
     * @param forceClean Clean the canvas or not
     */
    cleanupAnimation = (skipPaint?: boolean, forceClean?: boolean) => {
        for (let i = 0; i < this.animationQueue.length; i++) {
            const config = this.animationQueue[i];

            this.cleanUpAnimationUnit(config, skipPaint, forceClean);
        }
    }

    /**
     * Clean up the config of an animation, but the canvas won't cleaned up.
     * @param config The config to be cleaned up.
     * @param skipPaint Skip painting.
     * @param forceClean Force clear the painting.
     */
    cleanUpAnimationUnit = (config: Config, skipPaint?: boolean, forceClean?: boolean) => {
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

        if (!skipPaint) {
            if (forceClean) {
                config.clear(false);
            } else if (this.mouseInBoundary) {
                config.paint(true);
            } else {
                config.clear(true);
            }
        }
    };

    getRevealAnimationConfig = () => {
        return this.canvasList.find((x) => x.mouseInCanvas()) || null;
    };
}
