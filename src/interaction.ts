// Press handling and the ripple timeline, shared by the canvas and SVG reveal layers. Same
// semantics as the legacy RevealBoundaryStore: a press on the element starts the ripple, a mouse
// release accelerates it (switchAnimation), a touch release or a cancel clears it (clearAll).
// Presses from press() (keyboard and api) release like a mouse press: their click is delayed by
// pressRemaining, so the ripple must play out after the release.
import type { LocalPointer } from '@ax-design/surface';
import { advancePressAnimation } from './painter.js';
import type { PressState, PressTimeline, RevealStyle } from './painter.js';

// Pointer types whose release lets the ripple play out, accelerated.
function releasesWithRipple(pointerType: string): boolean {
    return pointerType === 'mouse' || pointerType === 'keyboard' || pointerType === 'api';
}

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
            if (pointer && releasesWithRipple(pointer.pointerType)) {
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

    // Milliseconds from `now` (performance.now(), like the frames) until the ripple has finished.
    // Mirrors advancePressAnimation: a release accelerates the progress after it. A press still
    // held counts as released now, because its click is the release. `style` is null while the
    // layer draws nothing (fallback), and then there is no ripple to wait for.
    pressRemaining(now: number, style: RevealStyle | null): number {
        if (!style || !style.pressAnimation || !this.pressed || !(style.pressAnimationSpeed > 0)) return 0;
        const speed = style.pressAnimationSpeed;
        // The ripple starts with the first frame after the press; before that it starts now.
        const start = this.mouseDownAnimateStartFrame === null ? now : this.mouseDownAnimateStartFrame;
        const elapsed = now - start;
        // Same condition as advancePressAnimation, which needs a non-zero release frame.
        const releasedAt = this.mouseReleased ? this.mouseDownAnimateReleasedFrame : null;
        const progress = releasedAt
            ? (elapsed + (elapsed - releasedAt) * style.releaseAnimationAccelerateRate) / speed
            : elapsed / speed;
        // After the release the progress grows at (1 + rate) / speed per ms.
        return Math.max(0, ((1 - progress) * speed) / (1 + style.releaseAnimationAccelerateRate));
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
