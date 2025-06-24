import { Store } from "empress-store";
import { IStoreAdapter } from "./models";

export class EmpressStoreAdapter<T extends object> implements IStoreAdapter<T> {

    private _unsubscribeFn: () => void = () => {};

    constructor(private store: Store<T>) {}
    
    /**
     * @description
     * Получает текущее состояние Store.
     */
    public getState(): T {
      return this.store.cloneState();
    }
    
    /**
     * @description
     * Получает предыдущее состояние Store.
     */
    public getPrevState(): T {
      return this.store.clonePrevState();
    }
    
    /**
     * @description
     * Обновляет состояние Store.
     */
    public update(updater: (state: T) => Partial<T>): void {
      this.store.update(updater);
    }
    
    /**
     * @description
     * Подписывается на изменения Store.
     */
    public subscribe(listener: (state: T, prev: T) => void): () => void {
      this._unsubscribeFn = this.store.subscribe(listener);
      return this._unsubscribeFn;
    }
    
    /**
     * @description
     * Отписывается от Store.
     */
    public unsubscribe(): void {
      this._unsubscribeFn();
    }
  }