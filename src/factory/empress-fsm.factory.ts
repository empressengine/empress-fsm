import { FSMBuilder } from "../builder";
import { IFSM, IFSMConfig } from "../fsm";
import { IStoreAdapter } from "../store-adapter";

export abstract class FSMFactory<T extends Object> {

    protected _builder!: FSMBuilder<T>;

    public abstract setup(builder: FSMBuilder<T>): void;

    public create(name: string, store: IStoreAdapter<T>): IFSM<T> {
        this._builder = new FSMBuilder<T>(name, store);
        this.setup(this._builder);
        return this._builder.build();
    }

    public getConfig(): IFSMConfig<T> {
        return this._builder.config;
    }
}