import { ExecutionController } from 'empress-core';
import { GroupType } from 'empress-core';
import { Store } from 'empress-store';

/**
 * Тип функции-условия перехода.
 * @template T - Тип данных состояния
 */
export declare type Condition<T extends object> = (store: Store<T>) => boolean;

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
export declare class FSM<T extends object> implements IFSM<T> {
    private _executionController;
    /**
     * @description
     * Получает имя конечного автомата.
     * Имя используется для идентификации и отладки.
     */
    get name(): string;
    /**
     * @description
     * Получает Store, связанный с конечным автоматом.
     * Store содержит данные, которые влияют на переходы между состояниями.
     */
    get store(): Store<T>;
    /**
     * @description
     * Получает текущее состояние конечного автомата.
     */
    get currentState(): string;
    /**
     * @description
     * Получает карту состояний конечного автомата.
     * Каждое состояние содержит свои хуки, переходы и подсостояния.
     */
    get states(): Map<string, IStateConfig<T>>;
    /**
     * @description
     * Получает глобальные хуки конечного автомата.
     * Глобальные хуки вызываются при всех переходах между состояниями.
     *
     * @returns Объект с хуками onEnter и onExit
     */
    get hooks(): IHooksConfig<T>;
    private _name;
    private _store;
    private _states;
    private _currentState;
    private _currentEnterExecutionId;
    private _currentExitExecutionId;
    private _isTransitioning;
    private _isExecutingLifecycle;
    private _pendingUpdates;
    private _lastStateCopy;
    private _hooks?;
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
    constructor(_executionController: ExecutionController, config: IFSMConfig<T>);
    /**
     * @description
     * Запускает конечный автомат.
     * Устанавливает начальное состояние и запускает подсостояния, если они есть.
     *
     * @throws Error если начальное состояние не найдено
     */
    start(): Promise<void>;
    /**
     * @description
     * Обновляет состояние Store.
     * После обновления проверяются все возможные переходы.
     *
     * @param callback - Функция обновления состояния
     */
    update(callback: (state: T) => Partial<T>): void;
    /**
     * @description
     * Останавливает конечный автомат.
     * Вызывает onExit для текущего состояния, останавливает подсостояния и отписывается от Store.
     */
    stop(): Promise<void>;
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
    private createStateMethod;
    /**
     * @description
     * Получает стратегию перехода для состояния.
     * Если стратегия не указана, используется Wait.
     *
     * @param state - Конфигурация состояния
     * @param to - Целевое состояние
     * @returns Стратегия перехода (Stop или Wait)
     */
    private getTransitionStrategy;
    /**
     * @description
     * Применяет отложенные обновления состояния.
     * Используется при режиме Wait для обработки накопленных обновлений.
     */
    private applyPendingUpdates;
    /**
     * @description
     * Применяет обновление состояния и проверяет переходы.
     *
     * @param update - Функция обновления состояния
     */
    private applyUpdate;
    /**
     * @description
     * Проверяет возможные переходы из текущего состояния.
     * Если условие перехода выполняется, осуществляет переход в новое состояние.
     */
    private checkTransitions;
    /**
     * @description
     * Осуществляет переход в новое состояние.
     * Выполняет выход из текущего состояния и вход в новое.
     *
     * @param newStateName - Имя нового состояния
     */
    private transition;
}

/**
 * Тип, представляющий состояние конечного автомата.
 * @template T - Тип данных состояния
 */
export declare type FSMState<T extends object> = IStateConfig<T>;

/**
 * Основной интерфейс конечного автомата.
 * @template T - Тип данных состояния
 */
export declare interface IFSM<T extends object> {
    name: string;
    store: Store<T>;
    currentState: string;
    states: Map<string, IStateConfig<T>>;
    hooks: IHooksConfig<T>;
    start(): void;
    stop(): void;
    update(callback: (state: T) => Partial<T>): void;
}

/**
 * Конфигурация конечного автомата (FSM).
 * @template T - Тип данных состояния
 */
export declare interface IFSMConfig<T extends object> {
    name: string;
    store: Store<T>;
    initialState: string;
    states: IStateConfig<T>[];
    hooks?: {
        onEnter?: StateLifecycle<T>;
        onExit?: StateLifecycle<T>;
    };
}

/**
 * Конфигурация глобальных хуков автомата.
 * @template T - Тип данных состояния
 */
export declare interface IHooksConfig<T extends object> {
    onEnter?: StateLifecycle<T>;
    onExit?: StateLifecycle<T>;
}

/**
 * Конфигурация отдельного состояния автомата.
 * @template T - Тип данных состояния
 */
export declare interface IStateConfig<T extends object> {
    name: string;
    transitions?: TransitionConfig<T>[];
    subStates?: IFSM<any>;
    onEnter?: GroupType<IStateLifeCycleData<T>>[];
    onExit?: GroupType<IStateLifeCycleData<T>>[];
    /**
     * Strategy for handling transitions during state execution.
     * - Stop: Immediately stops current state execution when transitioning
     * - Wait: Waits for current state execution to complete before transitioning
     * Can be either a TransitionStrategy enum value or a function that returns TransitionStrategy
     * based on transition context.
     * @default TransitionStrategy.Wait
     */
    transitionStrategy?: TransitionStrategy | ((context: TransitionContext<T>) => TransitionStrategy);
}

/**
 * Интерфейс, описывающий данные жизненного цикла состояния.
 * @template T - Тип данных состояния
 */
export declare interface IStateLifeCycleData<T extends object> {
    fsmName: string;
    from: string;
    to: string;
    data: T;
}

/**
 * Тип функции жизненного цикла состояния.
 * @template T - Тип данных состояния
 */
export declare type StateLifecycle<T extends object> = (data: IStateLifeCycleData<T>) => void;

/**
 * Конфигурация перехода между состояниями.
 * @template T - Тип данных состояния
 */
export declare interface TransitionConfig<T extends object> {
    to: string;
    condition: (store: Store<T>) => boolean;
}

/**
 * Контекст перехода между состояниями.
 * @template T - Тип данных состояния
 */
export declare interface TransitionContext<T extends object> {
    from: string;
    to: string;
    store: Store<T>;
}

export declare enum TransitionStrategy {
    /**
     * Stop current state execution immediately when transitioning
     */
    Stop = "stop",
    /**
     * Wait for current state execution to complete before transitioning
     */
    Wait = "wait"
}

export { }
