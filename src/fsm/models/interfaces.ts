import { GroupType, SystemChain } from 'empress-core';
import { StateLifecycle, TransitionConfig, TransitionStrategy, TransitionContext } from './types';
import { IStoreAdapter } from 'store-adapter';

/**
 * Интерфейс, описывающий состояние Store на момент перехода или выхода из стейта.
 * @template T - Тип данных состояния
 */
export interface IStoreState<T extends object> {
    current: T;
    prev: T;
}

/**
 * Интерфейс, описывающий данные жизненного цикла состояния.
 * @template T - Тип данных состояния
 */
export interface IStateLifeCycleData<T extends object> {
    fsmName: string,
    from: string,
    to: string,
    data: IStoreState<T>
}

/**
 * Конфигурация конечного автомата (FSM).
 * @template T - Тип данных состояния
 */
export interface IFSMConfig<T extends object> {
    name: string;
    store: IStoreAdapter<T>;
    initialState: string;
    states: IStateConfig<T>[];
    hooks?: {
        onEnter?: StateLifecycle<T>;
        onExit?: StateLifecycle<T>;
    };
}

/**
 * Конфигурация отдельного состояния автомата.
 * @template T - Тип данных состояния
 */
export interface IStateConfig<T extends object> {
    name: string;
    transitions?: TransitionConfig<T>[];
    subStates?: IFSM<any>;
    onEnter?: GroupType<IStateLifeCycleData<T>>[] | ((chain: SystemChain, data: IStateLifeCycleData<T>) => void);
    onExit?: GroupType<IStateLifeCycleData<T>>[] | ((chain: SystemChain, data: IStateLifeCycleData<T>) => void);
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
 * Конфигурация глобальных хуков автомата.
 * @template T - Тип данных состояния
 */
export interface IHooksConfig<T extends object> {
    onEnter?: StateLifecycle<T>;
    onExit?: StateLifecycle<T>;
}

/**
 * Основной интерфейс конечного автомата.
 * @template T - Тип данных состояния
 */
export interface IFSM<T extends object> {
    name: string;
    store: any;
    storeAdapter: IStoreAdapter<T>;
    currentState: string;
    states: Map<string, IStateConfig<T>>;
    hooks: IHooksConfig<T>;
    start(): void;
    stop(): void;
    update(callback: (state: T) => Partial<T>): void;
}