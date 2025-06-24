import { IStoreAdapter } from "../../store-adapter";

export interface IStoreFactory {
    create<T extends object>(initialState: T): IStoreAdapter<T>;
}