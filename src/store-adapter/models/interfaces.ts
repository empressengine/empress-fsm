export interface IStoreAdapter<T extends object, K = any> {
    store: K;
    getState(): T;
    getPrevState(): T;
    update(updater: (state: T) => Partial<T>): void;
    subscribe(listener: (state: T, prev: T) => void): () => void;
    unsubscribe(): void;
}