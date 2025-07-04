import { SystemChain, SystemGroup } from "empress-core";
import { IStateLifeCycleData } from "./models";

export class WrapperGroup<T extends object> extends SystemGroup<IStateLifeCycleData<T>> {

    constructor(chain: SystemChain) {
        super();
        this.chain = chain;
    }

    public setup(_: SystemChain, __: IStateLifeCycleData<T>): void {}
    
}
