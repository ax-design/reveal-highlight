// Press handling and the ripple timeline, shared by the canvas and SVG reveal layers. Same
// semantics as the legacy RevealBoundaryStore: a press on the element starts the ripple, a mouse
// release accelerates it (switchAnimation), a touch release or a cancel clears it (clearAll).
import type { LocalPointer } from '@ax-design/surface';
import { advancePressAnimation } from './painter.js';
import type { PressState, PressTimeline, RevealStyle } from './painter.js';

export class RevealInteraction implements PressTimeline {
    mouseDownAnimateStartFrame: number | null = null;
    mouseDownAnimateCurrentFrame: number | null = null;
    mouseDownAnimateReleasedFrame: number | null = null;
    mouseDownAnimateLogicFrame: number | null = null;
    mouseReleased = false;
    pressed = false;
    private upX = 0;
    private upY = 0;
    private hasUp = false;
    private wasPressed = false;

    reset(): void {
        this.mouseDownAnimateStartFrame = null;
        this.mouseDownAnimateCurrentFrame = null;
        this.mouseDownAnimateReleasedFrame = null;
        this.mouseDownAnimateLogicFrame = null;
        this.mouseReleased = false;
        this.pressed = false;
        this.hasUp = false;
    }

    // Applies press edges and advances the ripple. Returns true while the ripple plays, and
    // `cleared` when a touch release or cancel dropped it this frame.
    update(pointer: LocalPointer | null, now: number, style: RevealStyle | null): { playing: boolean; cleared: boolean } {
        let cleared = false;
        const pressed = !!pointer && pointer.pressed;
        if (pressed && !this.wasPressed && pointer!.inside) {
            this.reset();
            this.pressed = true;
        } else if (!pressed && this.wasPressed && this.pressed) {
            if (pointer && pointer.pointerType === 'mouse') {
                this.mouseReleased = true;
                this.mouseDownAnimateReleasedFrame = this.mouseDownAnimateCurrentFrame;
                this.upX = pointer.x;
                this.upY = pointer.y;
                this.hasUp = true;
            } else {
                this.reset();
                cleared = true;
            }
        }
        this.wasPressed = pressed;

        let playing = !!style && this.pressed && style.pressAnimation;
        if (playing && style && advancePressAnimation(this, now, style.pressAnimationSpeed, style.releaseAnimationAccelerateRate)) {
            // From cleanUpAnimationUnit: the ripple finished.
            this.reset();
            playing = false;
        }
        return { playing, cleared };
    }

    get press(): PressState {
        return {
            mousePressed: this.pressed,
            mouseReleased: this.mouseReleased,
            hasMouseUp: this.hasUp,
            mouseUpX: this.upX,
            mouseUpY: this.upY,
            mouseDownAnimateLogicFrame: this.mouseDownAnimateLogicFrame,
        };
    }
}
