import { DeferredPromise, ExecutionController } from 'empress-core';
import { IStoreAdapter } from 'store-adapter';
import { 
    IFSM, 
    IFSMConfig, 
    IHooksConfig, 
    IStateConfig, 
    IStoreState, 
    StateLifecycle, 
    TransitionStrategy 
} from './models';

/**
 * @description
 * Конечный автомат (Finite State Machine), управляемый данными для Empress.
 * Автомат меняет свои состояния на основе условий переходов, которые зависят от данных в Store.
 * При смене состояния выполняются Группы Системы в порядке их добавления.
 * 
 * Особенности:
 * - Выполянет Группы Системы в порядке их добавления
 * - Поддерживает два режима перехода между состояниями: немедленный (Stop) и отложенный (Wait)
 * - Имеет систему хуков для обработки входа/выхода из состояний
 * - Поддерживает вложенные состояния
 * - Управляется через Store, который хранит данные, влияющие на переходы
 * 
 * @template T - Тип данных состояния
 */
export class FSM<T extends object> implements IFSM<T> {
    
    /**
     * @description
     * Получает имя конечного автомата.
     * Имя используется для идентификации и отладки.
     */
    public get name(): string {
        return this._name;
    }
    
    /**
     * @description
     * Получает StoreAdapter, связанный с конечным автоматом.
     * StoreAdapter содержит данные, которые влияют на переходы между состояниями.
     */
    public get storeAdapter(): IStoreAdapter<T> {
        return this._storeAdapter;
    }

    /**
     * @description
     * Получает Store, связанный с конечным автоматом.
     * Store содержит данные, которые влияют на переходы между состояниями.
     * @deprecated Используйте storeAdapter вместо store.
     */
    public get store(): any {
        console.warn('FSM.store is deprecated. Use FSM.storeAdapter instead.');
        return {
            cloneState: () => this._storeAdapter.getState(),
            clonePrevState: () => this._storeAdapter.getPrevState(),
            update: (callback: (state: T) => Partial<T>) => this._storeAdapter.update(callback)
        };
    }

    /**
     * @description
     * Получает текущее состояние конечного автомата.
     */
    public get currentState(): string {
        return this._currentState;
    }
    
    /**
     * @description
     * Получает карту состояний конечного автомата.
     * Каждое состояние содержит свои хуки, переходы и подсостояния.
     */
    public get states(): Map<string, IStateConfig<T>> {
        return this._states;
    }
    
    /**
     * @description
     * Получает глобальные хуки конечного автомата.
     * Глобальные хуки вызываются при всех переходах между состояниями.
     * 
     * @returns Объект с хуками onEnter и onExit
     */
    public get hooks(): IHooksConfig<T> {
        return this._hooks || {};
    }

    private _name: string;
    private _storeAdapter!: IStoreAdapter<T>;
    private _states: Map<string, IStateConfig<T>>;
    private _currentState: string;
    private _currentStateData!: IStoreState<T>;
    private _currentExecutionId: string = '';
    private _storeStates: IStoreState<T>[] = [];
    private _transitionPromise: DeferredPromise<void> | null = null;


    private _hooks?: {
        onEnter?: StateLifecycle<T>;
        onExit?: StateLifecycle<T>;
    };

    /**
     * @description
     * Создает новый экземпляр конечного автомата.
     * 
     * @param executionController - Экземпляр ExecutionController для управления выполнением состояний
     * @param config - Конфигурация конечного автомата
     * @param config.name - Имя автомата
     * @param config.store - Store для управления данными
     * @param config.initialState - Начальное состояние
     * @param config.states - Массив состояний
     * @param config.hooks - Глобальные хуки (опционально)
     */
    constructor(
        private _executionController: ExecutionController,
        config: IFSMConfig<T>,
    ) {
        this._name = config.name;
        this._storeAdapter = config.store;
        this._states = new Map();
        this._hooks = config.hooks;
        this._currentState = config.initialState;

        config.states.forEach(state => {
            this._states.set(state.name, state);
        });

        this._storeAdapter.subscribe(async () => {
            this.addStoreData(this._storeAdapter);
            this.processTransition();
        });
    }

    /**
     * @description
     * Запускает конечный автомат.
     * Устанавливает начальное состояние и запускает подсостояния, если они есть.
     * 
     * @throws Error если начальное состояние не найдено
     */
    public async start(): Promise<void> {
        const initialState = this._states.get(this._currentState);
        if (!initialState) throw new Error(`Initial state '${this._currentState}' not found`);

        this.addStoreData(this._storeAdapter);
        this._transitionPromise = new DeferredPromise<void>();

        const data = this.getStoreData();
        if(!data) return;

        await this.processOnEnter(this._currentState, '', data);
        initialState.subStates && await initialState.subStates.start();

        this._currentStateData = data;
        this._transitionPromise?.resolve();

        await this.processTransition();
    }

    /**
     * @description
     * Останавливает конечный автомат и останавливает текущее выполнение.
     * Вызывает onExit для текущего состояния, останавливает подсостояния и отписывается от Store.
     */
    public async stop(): Promise<void> {
        const currentState = this._states.get(this._currentState);
        if (!currentState) return;

        this._executionController.stop(this._currentExecutionId);
        this._transitionPromise?.resolve();
        this.processOnExit(this._currentState, this._currentStateData);

        currentState.subStates && await currentState.subStates.stop();
        this._storeAdapter.unsubscribe()
    }

    /**
     * @description
     * Обновляет состояние Store.
     * После обновления проверяются все возможные переходы.
     * 
     * @param callback - Функция обновления состояния
     */
    public async update(callback: (state: T) => Partial<T>): Promise<void> {
        const stateConfig = this._states.get(this._currentState);

        if(stateConfig?.transitionStrategy === TransitionStrategy.Stop) {
            this._executionController.stop(this._currentExecutionId);
        }

        await this._transitionPromise?.promise;
        this._storeAdapter.update(callback);
    }

    /**
     * @description
     * Ожидает завершения текущего перехода.
     */
    public async waitForTransition(): Promise<void> {
        await this._transitionPromise?.promise;
    }

    private addStoreData(store: IStoreAdapter<T>) {
        this._storeStates.push({
            current: store.getState(),
            prev: store.getPrevState()
        });
    }

    private getStoreData(last: boolean = false): IStoreState<T> | undefined {
        return last ? this._storeStates.pop() : this._storeStates.shift();
    }
   
    private canTransit(currentStateName: string, current: T, prev: T): string | null {
        const currentState = this._states.get(currentStateName);
        if (!currentState || !currentState.transitions) return null;

        for (const transition of currentState.transitions) {
            const canTransit = transition.condition(current, prev);
            if (canTransit) return transition.to;
        }

        return null;
    }

    /**
     * @description
     * Обрабатывает переход между состояниями.
     * Проверяет возможность перехода и запускает переход, если он возможен.
     */
    private async processTransition(): Promise<void> {
        const data = this.getStoreData();
        if(!data) return;

        const toState = this.canTransit(this._currentState, data.current, data.prev);
        if(toState) {
            this._transitionPromise = new DeferredPromise<void>();
            await this.transition(this._currentState, toState, this._currentStateData, data);
            this._currentStateData = data;
            this._transitionPromise?.resolve();
        }
    }

    private async transition(
        currentStateName: string, 
        newStateName: string, 
        currentData: IStoreState<T>, 
        nextData: IStoreState<T>
    ): Promise<void> {
        const currentState = this._states.get(currentStateName);
        const newState = this._states.get(newStateName);

        if(!currentState || !newState) throw new Error(`State '${currentStateName}' or '${newStateName}' not found`);

        this.processOnExit(currentStateName, currentData);
        await this.processOnEnter(newStateName, currentStateName, nextData);

        newState.subStates && newState.subStates.start();
    }

    private processOnExit(from: string, storeData: IStoreState<T>): void {
        const stateConfig = this._states.get(from);

        if (!stateConfig) throw new Error(`State '${from}' not found`);
        if(!stateConfig.onExit) return;

        const data = { fsmName: this._name, from, to: '', data: storeData };
        const name = `[FSM][onExit] In ${this._name} from ${from}}`;
        const executionId = this._executionController.create(stateConfig.onExit, data, name);

        this._hooks?.onExit && this._hooks.onExit(data);
        this._executionController.run(executionId, false);
    }

    private async processOnEnter(to: string, from: string, storeData: IStoreState<T>): Promise<void> {
        const stateConfig = this._states.get(to);

        if (!stateConfig) throw new Error(`State '${to}' not found`);
        if(!stateConfig.onEnter) return;

        const data = { fsmName: this._name, from, to, data: storeData };
        const name = `[FSM][onEnter] In ${this._name} from ${from} to ${to}`;
        this._currentExecutionId = this._executionController.create(stateConfig.onEnter, data, name);

        this._currentState = to;

        this._hooks?.onEnter && this._hooks.onEnter(data);
        await this._executionController.run(this._currentExecutionId);
    }
    
}