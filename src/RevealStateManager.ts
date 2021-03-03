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

    removeBoundary = (store: RevealBoundaryStore) => {
        this._storage = this._storage.filter(x => x !== store);
    };
}
