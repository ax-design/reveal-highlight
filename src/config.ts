let borderDetectionMode: 'strictEdge' | 'experimentalAutoFit' = 'strictEdge';

let borderDetectionModeInitialized = false;

class InitializedError extends Error {
    name = 'InitializedError';

    constructor() {
        super('Border detection mode has already been initialized.')
    }
}

export const config = {
    get borderDetectionMode() {
        return borderDetectionMode
    },
    set borderDetectionMode(x) {
        if (borderDetectionModeInitialized) {
            throw new InitializedError;
        }

        borderDetectionMode = x;
        borderDetectionModeInitialized = true;
    }
}