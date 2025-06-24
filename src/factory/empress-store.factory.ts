import { Store } from "empress-store";
import { IStoreAdapter, EmpressStoreAdapter } from "../store-adapter";
import { IStoreFactory } from "./models";

export class EmpressStoreFactory implements IStoreFactory {
    public create<T extends object>(initialState: T): IStoreAdapter<T> {
        const store = new Store<T>(initialState);
        return new EmpressStoreAdapter<T>(store);
    }
}
