import { RevealBoundaryStore } from './RevealBoundryStore.js';

export class RevealStateManager {
    private _currentHashId = 0;

    private _storage: RevealBoundaryStore[] = [];

    newBoundary = () => {
        const hashId = this._currentHashId++;

        const store = new RevealBoundaryStore(hashId);
        this._storage.push(store);

        return store;
    };

    removeBoundary = (storeToRemove: RevealBoundaryStore) => {
        this._storage.find((store, idx) => {
            if (store === storeToRemove) {
                this._storage.splice(idx, 1);
                return true;
            }

            return false;
        });
    };
}
