import { 
    ExecutionController, 
    GroupType, 
    ServiceContainer, 
    SystemChain, 
    Utils 
} from "empress-core";

import { 
    FSM, 
    IFSM, 
    IFSMConfig, 
    IStateConfig, 
    IStateLifeCycleData, 
    StateAction 
} from "../fsm/";

import { EmpressStoreFactory } from "../factory/";
import { IStoreAdapter } from "../store-adapter/";

/**
 * @description
 * Билдер для создания конфигурации FSM. 
 * Позволяет в fluent-стиле настроить конфигурацию FSM.
 * 
 * Также позвоялет гибко переопределять конфигурации состояний 
 * и переходов уже существубщих конфигураций.
 * 
 * @example
 * 
 * ```typescript
 * const builder = new FSMBuilder<IGlobalStore>('global', store);
 * 
 * builder
 *     .setInitialState('connection')
 *     .addState('connection')
 *       .addTransition('loading', state => state.connected)
 *     .addState('loading')
 *       .addTransition('main', state => state.loaded)
 *       .addOnEnterGroup(LoadAssetsGroup, 'LoadAssetsGroup')
 *     .addState('main')
 *       .addOnEnterChain((chain, data) => {
 *         chain
 *             .add(ScenesChangeSceneSystem,{ scene: MainScene }, { canExecute: () => data.to === 'main' })
 *       })
 *     .build();
 * ```
 */
export class FSMBuilder<T extends object> {

    /**
     * @description
     * Возвращает конфигурацию FSM.
     */
    public get config(): IFSMConfig<T> {
        return this._config;
    }

    private _config: IFSMConfig<T> = {
        name: '',
        store: new EmpressStoreFactory().create<T>({} as T),
        initialState: '',
        states: []
    };

    private _onEnterChains: Map<string, (chain: SystemChain, data: IStateLifeCycleData<T>) => void> = new Map();
    private _onEnterGroups: Map<string, {action: GroupType<T>, id: string}[]> = new Map();
    private _onExitChains: Map<string, (chain: SystemChain, data: IStateLifeCycleData<T>) => void> = new Map();
    private _onExitGroups: Map<string, {action: GroupType<T>, id: string}[]> = new Map();

    private _editedState: IStateConfig<T> | null = null;

    constructor(protected _name: string, protected _store: IStoreAdapter<T>) {
        this._config.name = this._name;
        this._config.store = this._store;
    }

    // ==================================== //
    //             STATES AREA              //
    // ==================================== //

    /**
     * @description
     * Устанавливает начальное состояние FSM.
     * 
     * @param value Начальное состояние FSM.
     */
    public setInitialState(value: string): this {
        this._config.initialState = value;
        return this;
    }

    /**
     * @description
     * Добавляет новое состояние в конфигурацию FSM.
     * 
     * @param name Имя состояния.
     */
    public addState(name: string): this {
        this._editedState = {
            name,
            onEnter: [],
            onExit: [],
            transitions: []
        };

        this._config.states.push(this._editedState);
        return this;
    }

    /**
     * @description
     * Удаляет состояние из конфигурации FSM.
     * 
     * @param state Имя состояния.
     */
    public removeState(state: string): this {
        this._config.states = this._config.states.filter(s => s.name !== state);
        this._editedState = null;
        this._onEnterChains.delete(state);
        this._onExitChains.delete(state);
        this._onEnterGroups.delete(state);
        this._onExitGroups.delete(state);
        return this;
    }

    /**
     * @description
     * Добавляет под-состояния в конфигурацию FSM.
     * 
     * @param fsm Инстанс FSM устанавливаемый в качестве под-состояний.
     */
    public addSubStates(fsm: IFSM<T>): this {
        if(!this._editedState) {
            throw new Error('State is not edited');
        }

        this._editedState.subStates = fsm;
        return this;
    }

    /**
     * @description
     * Удаляет под-состояния из конфигурации FSM.
     * 
     * @param state Имя состояния.
     */
    public removeSubStates(state: string): this {
        this._config.states = this._config.states.map(s => {
            if(s.name === state) { s.subStates = undefined; }
            return s;
        });

        return this;
    }

    /**
     * @description
     * Заменяет под-состояния в конфигурации FSM.
     * 
     * @param state Имя состояния.
     * @param fsm Инстанс FSM устанавливаемый в качестве под-состояний.
     */
    public replaceSubStates(state: string, fsm: IFSM<T>): this {
        this._config.states = this._config.states.map(s => {
            if(s.name === state) { s.subStates = fsm; }
            return s;
        });

        return this;
    }

    // ==================================== //
    //             TRANSITIONS              //
    // ==================================== //

    /**
     * @description
     * Добавляет переход в конфигурацию состояния.
     * 
     * @param to Имя состояния, в которое осуществляется переход.
     * @param condition Условие перехода.
     */
    public addTransition(to: string, condition: (state: T) => boolean): this {
        if(!this._editedState) {
            throw new Error('State is not edited');
        }

        this._editedState.transitions?.push({
            to,
            condition
        });

        return this;
    }

    /**
     * @description
     * Удаляет переход из конфигурации состояния.
     * 
     * @param state Имя состояния, из которого осуществляется переход.
     * @param to Имя состояния, в которое осуществляется переход.
     */
    public removeTransition(state: string, to: string): this {
        this._config.states = this._config.states.map(s => {
            if(s.name === state) { s.transitions = s.transitions?.filter(t => t.to !== to); }
            return s;
        });

        return this;
    }

    /**
     * @description
     * Заменяет переход в конфигурации состояния.
     * 
     * @param state Имя состояния, из которого осуществляется переход.
     * @param to Имя состояния, в которое осуществляется переход.
     * @param condition Новое условие перехода.
     */
    public replaceTransition(state: string, to: string, condition: (state: T) => boolean): this {
        this._config.states = this._config.states.map(s => {
            if(s.name === state) { s.transitions = s.transitions?.map(t => t.to === to ? { to, condition } : t); }
            return s;
        });

        return this;
    }

    // ==================================== //
    //             CHAINS                   //
    // ==================================== //

    /**
     * @description
     * Добавляет действие onEnter в конфигурацию состояния.
     * 
     * @param action Действие, которое будет добавлено в конфигурацию состояния.
     */
    public addOnEnterChain(
        action: (chain: SystemChain, data: IStateLifeCycleData<T>) => void
    ): this {
        if(!this._editedState) {
            throw new Error('State is not edited');
        }

        this._onEnterChains.set(this._editedState.name, action);
        return this;
    }

    /**
     * @description
     * Добавляет действие onExit в конфигурацию состояния.
     * 
     * @param action Действие, которое будет добавлено в конфигурацию состояния.
     */
    public addOnExitChain(
        action: (chain: SystemChain, data: IStateLifeCycleData<T>) => void
    ): this {
        if(!this._editedState) {
            throw new Error('State is not edited');
        }

        this._onExitChains.set(this._editedState.name, action);
        return this;
    }

    /**
     * @description
     * Удаляет действие onEnter из конфигурации состояния.
     * 
     * @param state Имя состояния из которого удаляется дейсвтие.
     */
    public removeOnEnterChain(state: string): this {
        this._onEnterChains.delete(state);
        return this;
    }

    /**
     * @description
     * Удаляет действие onExit из конфигурации состояния.
     * 
     * @param state Имя состояния из которого удаляется дейсвтие.
     */
    public removeOnExitChain(state: string): this {
        this._onExitChains.delete(state);
        return this;
    }

    /**
     * @description
     * Заменяет действие onEnter для указанного состояния в конфигурации состояния.
     * 
     * @param state Имя состояния для которого заменяется дейсвтие.
     * @param action Новое действие, которое будет добавлено в конфигурацию состояния.
     */
    public replaceOnEnterChain(state: string, action: (chain: SystemChain, data: IStateLifeCycleData<T>) => void): this {
        this._onEnterChains.set(state, action);
        return this;
    }

    /**
     * @description
     * Заменяет действие onExit для указанного состояния в конфигурации состояния.
     * 
     * @param state Имя состояния для которого заменяется дейсвтие.
     * @param action Новое действие, которое будет добавлено в конфигурацию состояния.
     */
    public replaceOnExitChain(state: string, action: (chain: SystemChain, data: IStateLifeCycleData<T>) => void): this {
        this._onExitChains.set(state, action);
        return this;
    }

    // ==================================== //
    //             GROUPS                   //
    // ==================================== //

    /**
     * @description
     * Добавляет группу систем onEnter в конфигурацию состояния.
     * 
     * @param action Группа систем, которая будет добавлена в конфигурацию состояния.
     * @param id Уникальный идентификатор группы систем. Необязательный параметр, по-умолчанию
     * генерируется автоматически.
     */
    public addOnEnterGroup(action: GroupType<T>, id: string = Utils.uuid()): this {
        if(!this._editedState) {
            throw new Error('State is not edited');
        }

        const item = this._onEnterGroups.get(this._editedState.name) || [];
        item.push({action, id});
        this._onEnterGroups.set(this._editedState.name, item);

        return this;
    }

    /**
     * @description
     * Добавляет группу систем onEnter для указанного состояния в конфигурацию состояния.
     * 
     * @param state Имя состояния для которого добавляется группа систем.
     * @param action Группа систем, которая будет добавлена в конфигурацию состояния.
     * @param id Уникальный идентификатор группы систем. Необязательный параметр, по-умолчанию
     * генерируется автоматически.
     */
    public addOnEnterGroupToState(state: string, action: GroupType<T>, id: string = Utils.uuid()): this {
        const item = this._onEnterGroups.get(state) || [];
        item.push({action, id});
        this._onEnterGroups.set(state, item);

        return this;
    }

    /**
     * @description
     * Добавляет группу систем onEnter для указанного состояния перед указанной группой.
     * 
     * @param state Имя состояния для которого добавляется группа систем.
     * @param groupId Уникальный идентификатор группы систем, перед которой будет добавлена новая группа.
     * @param action Группа систем, которая будет добавлена в конфигурацию состояния.
     * @param id Уникальный идентификатор группы систем. Необязательный параметр, по-умолчанию
     * генерируется автоматически.
     */
    public addOnEnterGroupBefore(state: string, groupId: string, action: GroupType<T>, id: string = Utils.uuid()): this {
        const item = this._onEnterGroups.get(state) || [];
        item.splice(item.findIndex(g => g.id === groupId), 0, {action, id});
        this._onEnterGroups.set(state, item);

        return this;
    }

    /**
     * @description
     * Добавляет группу систем onEnter для указанного состояния после указанной группы.
     * 
     * @param state Имя состояния для которого добавляется группа систем.
     * @param groupId Уникальный идентификатор группы систем, после которой будет добавлена новая группа.
     * @param action Группа систем, которая будет добавлена в конфигурацию состояния.
     * @param id Уникальный идентификатор группы систем. Необязательный параметр, по-умолчанию
     * генерируется автоматически.
     */
    public addOnEnterGroupAfter(state: string, groupId: string, action: GroupType<T>, id: string = Utils.uuid()): this {
        const item = this._onEnterGroups.get(state) || [];
        item.splice(item.findIndex(g => g.id === groupId) + 1, 0, {action, id});
        this._onEnterGroups.set(state, item);

        return this;
    }

    /**
     * @description
     * Добавляет группу систем onEnter для указанного состояния в начало списка групп.
     * 
     * @param state Имя состояния для которого добавляется группа систем.
     * @param action Группа систем, которая будет добавлена в конфигурацию состояния.
     * @param id Уникальный идентификатор группы систем. Необязательный параметр, по-умолчанию
     * генерируется автоматически.
     */
    public addOnEnterGroupToStart(state: string, action: GroupType<T>, id: string = Utils.uuid()): this {
        const item = this._onEnterGroups.get(state) || [];
        item.unshift({action, id});
        this._onEnterGroups.set(state, item);

        return this;
    }

    /**
     * @description
     * Добавляет группу систем onExit в конфигурацию состояния.
     * 
     * @param action Группа систем, которая будет добавлена в конфигурацию состояния.
     * @param id Уникальный идентификатор группы систем. Необязательный параметр, по-умолчанию
     * генерируется автоматически.
     */
    public addOnExitGroup(action: GroupType<T>, id: string = Utils.uuid()): this {
        if(!this._editedState) {
            throw new Error('State is not edited');
        }

        const item = this._onExitGroups.get(this._editedState.name) || [];
        item.push({action, id});
        this._onExitGroups.set(this._editedState.name, item);

        return this;
    }

    /**
     * @description
     * Добавляет группу систем onExit для указанного состояния в конфигурацию состояния.
     * 
     * @param state Имя состояния для которого добавляется группа систем.
     * @param action Группа систем, которая будет добавлена в конфигурацию состояния.
     * @param id Уникальный идентификатор группы систем. Необязательный параметр, по-умолчанию
     * генерируется автоматически.
     */
    public addOnExitGroupToState(state: string, action: GroupType<T>, id: string = Utils.uuid()): this {
        const item = this._onExitGroups.get(state) || [];
        item.push({action, id});
        this._onExitGroups.set(state, item);

        return this;
    }

    /**
     * @description
     * Добавляет группу систем onExit для указанного состояния перед указанной группой.
     * 
     * @param state Имя состояния для которого добавляется группа систем.
     * @param groupId Уникальный идентификатор группы систем, перед которой будет добавлена новая группа.
     * @param action Группа систем, которая будет добавлена в конфигурацию состояния.
     * @param id Уникальный идентификатор группы систем. Необязательный параметр, по-умолчанию
     * генерируется автоматически.
     */
    public addOnExitGroupBefore(state: string, groupId: string, action: GroupType<T>, id: string = Utils.uuid()): this {
        const item = this._onExitGroups.get(state) || [];
        item.splice(item.findIndex(g => g.id === groupId), 0, {action, id});
        this._onExitGroups.set(state, item);

        return this;
    }

    /**
     * @description
     * Добавляет группу действий onExit для указанного состояния после указанной группы.
     * 
     * @param state Имя состояния для которого добавляется группа систем.
     * @param groupId Уникальный идентификатор группы систем, после которой будет добавлена новая группа.
     * @param action Группа систем, которая будет добавлена в конфигурацию состояния.
     * @param id Уникальный идентификатор группы систем. Необязательный параметр, по-умолчанию
     * генерируется автоматически.
     */
    public addOnExitGroupAfter(state: string, groupId: string, action: GroupType<T>, id: string = Utils.uuid()): this {
        const item = this._onExitGroups.get(state) || [];
        item.splice(item.findIndex(g => g.id === groupId) + 1, 0, {action, id});
        this._onExitGroups.set(state, item);

        return this;
    }

    /**
     * @description
     * Добавляет группу систем onExit для указанного состояния в начало списка групп.
     * 
     * @param state Имя состояния для которого добавляется группа систем.
     * @param action Группа систем, которая будет добавлена в конфигурацию состояния.
     * @param id Уникальный идентификатор группы систем. Необязательный параметр, по-умолчанию
     * генерируется автоматически.
     */
    public addOnExitGroupToStart(state: string, action: GroupType<T>, id: string = Utils.uuid()): this {
        const item = this._onExitGroups.get(state) || [];
        item.unshift({action, id});
        this._onExitGroups.set(state, item);

        return this;
    }

    /**
     * @description
     * Удаляет группу систем onEnter для указанного состояния.
     * 
     * @param state Имя состояния для которого удаляется группа систем.
     * @param id Уникальный идентификатор группы систем.
     */
    public removeOnEnterGroup(state: string, id: string): this {
        let groups = this._onEnterGroups.get(state);
        if(!groups) return this;

        groups = groups.filter(g => g.id !== id);
        this._onEnterGroups.set(state, groups);
        return this;
    }

    /**
     * @description
     * Удаляет группу систем onExit для указанного состояния.
     * 
     * @param state Имя состояния для которого удаляется группа систем.
     * @param id Уникальный идентификатор группы систем.
     */
    public removeOnExitGroup(state: string, id: string): this {
        let groups = this._onExitGroups.get(state);
        if(!groups) return this;

        groups = groups.filter(g => g.id !== id);
        this._onExitGroups.set(state, groups);
        return this;
    }

    /**
     * @description
     * Заменяет указанную группу систем onEnter для указанного состояния новой группой.
     * 
     * @param state Имя состояния для которого заменяется группа систем.
     * @param id Уникальный идентификатор заменяемой группы систем. 
     * После замены группы, идентификатор остается прежним.
     * @param action Новая группа систем.
     */
    public replaceOnEnterGroup(state: string, id: string, action: GroupType<T>): this {
        let groups = this._onEnterGroups.get(state);
        if(!groups) return this;

        groups = groups.map(g => g.id === id ? {action, id} : g);
        this._onEnterGroups.set(state, groups);
        return this;
    }

    /**
     * @description
     * Заменяет указанную группу систем onExit для указанного состояния новой группой.
     * 
     * @param state Имя состояния для которого заменяется группа систем.
     * @param id Уникальный идентификатор заменяемой группы систем. 
     * После замены группы, идентификатор остается прежним.
     * @param action Новая группа систем.
     */
    public replaceOnExitGroup(state: string, id: string, action: GroupType<T>): this {
        let groups = this._onExitGroups.get(state);
        if(!groups) return this;

        groups = groups.map(g => g.id === id ? {action, id} : g);
        this._onExitGroups.set(state, groups);
        return this;
    }

    // ==================================== //
    //             BUILD                    //
    // ==================================== //

    /**
     * @description
     * Строит конфигурацию FSM.
     * 
     * @returns Инстанс FSM.
     */
    public build(): IFSM<T> {
        const executionController = ServiceContainer.instance.get(ExecutionController);

        this.validateInitialState();
        this.validateTransitions();

        this._config.states.forEach(state => {
            this.buildOnEnterActions(state);
            this.buildOnExitActions(state);
        });

        return new FSM(executionController, this._config);
    }

    private buildOnEnterActions(state: IStateConfig<T>): void {
        state.onEnter = [];

        const chain = this._onEnterChains.get(state.name);
        if(chain) state.onEnter = chain;

        const groups = this._onEnterGroups.get(state.name)?.map(item => item.action);

        if(chain && groups) {
            throw new Error('OnEnter actions for state ' + state.name + ' has both chains and groups!');
        }

        if(groups) state.onEnter = groups as StateAction<T>;
    }

    private buildOnExitActions(state: IStateConfig<T>): void {
        state.onExit = [];

        const chain = this._onExitChains.get(state.name);
        if(chain) state.onExit = chain;

        const groups = this._onExitGroups.get(state.name)?.map(item => item.action);

        if(chain && groups) {
            throw new Error('OnExit actions for state ' + state.name + ' has both chains and groups!');
        }

        if(groups) state.onExit = groups as StateAction<T>;
    }

    private validateInitialState(): void {
        if(!this._config.initialState) {
            throw new Error('Initial state is not set!');
        }

        if(!this._config.states.find(state => state.name === this._config.initialState)) {
            throw new Error('State ' + this._config.initialState + ' cannot be initial state, because it does not exist!');
        }
    }

    private validateTransitions(): void {

        for(let i = 0; i < this._config.states.length; i++) {
            const state = this._config.states[i];
            if(!state.transitions) continue;

            for(let j = 0; j < state.transitions.length; j++) {
                const transition = state.transitions[j];
                if(!this._config.states.find(s => s.name === transition.to)) {
                    throw new Error('Can\'t transit to ' + transition.to + ' from ' + state.name + ' because it does not exist!');
                }
            }
        }
    }
}