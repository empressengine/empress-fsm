import { ExecutionController, Utils } from 'empress-core';
import { Store } from 'empress-store';
import { IFSM, IFSMConfig, IHooksConfig, IStateConfig } from './models/interfaces';
import { StateLifecycle, TransitionStrategy, TransitionContext } from './models/types';

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
     * Получает Store, связанный с конечным автоматом.
     * Store содержит данные, которые влияют на переходы между состояниями.
     */
    public get store(): Store<T> {
        return this._store;
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
    private _store: Store<T>;
    private _states: Map<string, IStateConfig<T>>;
    private _currentState: string;
    private _currentEnterExecutionId: string | null = null;
    private _currentExitExecutionId: string | null = null;
    private _isTransitioning: boolean = false;
    private _isExecutingLifecycle: boolean = false;
    private _pendingUpdates: Array<(state: T) => Partial<T>> = [];
    private _lastStateCopy!: T;
    
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
        this._store = config.store;
        this._states = new Map();
        this._hooks = config.hooks;
        this._currentState = config.initialState;

        config.states.forEach(state => {
            this._states.set(state.name, state);
        });

        this._store.subscribe(async (data) => {
            const update = () => this._store.cloneState();
            const currentState = this._states.get(this._currentState);
            
            if (!currentState || !currentState.transitions || this._isTransitioning) return;

            if (this._isExecutingLifecycle) {
                const strategy = this.getTransitionStrategy(currentState, '');

                if (strategy === TransitionStrategy.Stop && this._currentEnterExecutionId) {
                    this._executionController.stop(this._currentEnterExecutionId);
                    this._currentEnterExecutionId = null;
                    this._isExecutingLifecycle = false;

                    await this.checkTransitions();
                    return;
                }

                this._pendingUpdates.push(update);
                return;
            }

            await this.checkTransitions();
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
        if (!initialState) {
            throw new Error(`Initial state '${this._currentState}' not found`);
        }

        const stateCopy = Utils.createProxyDecorator(this._store.cloneState());
        this._lastStateCopy = stateCopy;
        const executionId = this.createStateMethod(this._currentState, '', this._currentState, 'onEnter', stateCopy);
        if (executionId) {
            try {
                this._currentEnterExecutionId = executionId;
                this._isExecutingLifecycle = true;
                await this._executionController.run(executionId);
            } finally {
                this._currentEnterExecutionId = null;
                this._isExecutingLifecycle = false;
                await this.applyPendingUpdates();
            }
        }

        initialState.subStates && await initialState.subStates.start();
    }

    /**
     * @description
     * Обновляет состояние Store.
     * После обновления проверяются все возможные переходы.
     * 
     * @param callback - Функция обновления состояния
     */
    public update(callback: (state: T) => Partial<T>): void {
        this._store.update(callback);
    }

    /**
     * @description
     * Останавливает конечный автомат.
     * Вызывает onExit для текущего состояния, останавливает подсостояния и отписывается от Store.
     */
    public async stop(): Promise<void> {
        const currentState = this._states.get(this._currentState);
        if (!currentState) return;

        const executionId = this.createStateMethod(this._currentState, this._currentState, '', 'onExit', this._lastStateCopy);
        executionId && await this._executionController.run(executionId);

        currentState.subStates && await currentState.subStates.stop();
        this._store.subscribe(() => {});
    }

    /**
     * @description
     * Создает метод состояния для выполнения входа/выхода.
     * 
     * @param state - Имя состояния
     * @param from - Исходное состояние
     * @param to - Целевое состояние
     * @param method - Метод ('onEnter' или 'onExit')
     * @param stateCopy - Копия данных состояния
     * @returns ID выполнения или undefined
     */
    private createStateMethod(
        state: string, 
        from: string, 
        to: string, 
        method: 'onEnter' | 'onExit',
        stateCopy: T
    ): string | undefined {
        const stateConfig = this._states.get(state);

        if (!stateConfig) {
            throw new Error(`State '${state}' not found`);
        }

        if(stateConfig[method]) {
            const data = { fsmName: this._name, from, to, data: stateCopy };
            const name = `[FSM][${method}] In ${this._name} from ${from} to ${to}`;
            const executionId = this._executionController.create(stateConfig[method], data, name);

            if(this._hooks?.[method]) {
                const data = { fsmName: this._name, from, to, data: stateCopy };
                this._hooks[method](data);
            }

            return executionId;
        }      
    }
    
    /**
     * @description
     * Получает стратегию перехода для состояния.
     * Если стратегия не указана, используется Wait.
     * 
     * @param state - Конфигурация состояния
     * @param to - Целевое состояние
     * @returns Стратегия перехода (Stop или Wait)
     */
    private getTransitionStrategy(state: IStateConfig<T>, to: string): TransitionStrategy {
        if (!state.transitionStrategy) return TransitionStrategy.Wait;

        if (typeof state.transitionStrategy === 'function') {
            const context: TransitionContext<T> = {
                from: state.name,
                to,
                store: this._store
            };
            return state.transitionStrategy(context);
        }

        return state.transitionStrategy;
    }

    /**
     * @description
     * Применяет отложенные обновления состояния.
     * Используется при режиме Wait для обработки накопленных обновлений.
     */
    private async applyPendingUpdates(): Promise<void> {
        while (this._pendingUpdates.length > 0) {
            this._pendingUpdates.shift()!;
            await this.checkTransitions();
        }
    }

    /**
     * @description
     * Проверяет возможные переходы из текущего состояния.
     * Если условие перехода выполняется, осуществляет переход в новое состояние.
     */
    private async checkTransitions(): Promise<void> {
        const currentState = this._states.get(this._currentState);
        if (!currentState || !currentState.transitions || this._isTransitioning || this._isExecutingLifecycle) return;

        for (const transition of currentState.transitions) {
            const canTransit = transition.condition(this._store.state, this._store.prev);

            if (canTransit) {
                const strategy = this.getTransitionStrategy(currentState, transition.to);

                if (strategy === TransitionStrategy.Stop && this._currentEnterExecutionId) {
                    this._executionController.stop(this._currentEnterExecutionId);
                    this._currentEnterExecutionId = null;
                    this._isExecutingLifecycle = false;
                }

                await this.transition(transition.to);
                break;
            }
        }
    }

    /**
     * @description
     * Осуществляет переход в новое состояние.
     * Выполняет выход из текущего состояния и вход в новое.
     * 
     * @param newStateName - Имя нового состояния
     */
    private async transition(newStateName: string): Promise<void> {
        try {
            this._isTransitioning = true;
            const currentState = this._states.get(this._currentState);
            const newState = this._states.get(newStateName);

            if (!currentState || !newState) {
                throw new Error(`Invalid transition from '${this._currentState}' to '${newStateName}'`);
            }

            const fromState = this._currentState;
            const onExitExecutionId = this.createStateMethod(fromState, fromState, '', 'onExit', this._lastStateCopy);

            if (onExitExecutionId) {
                this._currentExitExecutionId = onExitExecutionId;
                this._isExecutingLifecycle = true;
                await this._executionController.run(onExitExecutionId, false);

                this._currentExitExecutionId = null;
                this._isExecutingLifecycle = false;
                await this.applyPendingUpdates();
            }

            currentState.subStates && currentState.subStates.stop();
            this._currentState = newStateName;

            const stateCopy = Utils.createProxyDecorator(this._store.cloneState());
            this._lastStateCopy = stateCopy;
            const onEnterExecutionId = this.createStateMethod(newStateName, fromState, newStateName, 'onEnter', stateCopy);
            if (onEnterExecutionId) {
                this._currentEnterExecutionId = onEnterExecutionId;
                this._isExecutingLifecycle = true;
                await this._executionController.run(onEnterExecutionId);
                this._currentEnterExecutionId = null;
                this._isExecutingLifecycle = false;

                await this.checkTransitions();
            }

            newState.subStates && newState.subStates.start();
        } finally {
            this._isTransitioning = false;
            await this.checkTransitions();
        }
    }

}