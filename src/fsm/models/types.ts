import { Store } from "empress-store";
import { IStateLifeCycleData, IStateConfig } from './interfaces';
import { GroupType, SystemChain } from "empress-core";

/**
 * Тип, представляющий состояние конечного автомата.
 * @template T - Тип данных состояния
 */
export type FSMState<T extends object> = IStateConfig<T>;

export enum TransitionStrategy {
    /**
     * Stop current state execution immediately when transitioning
     */
    Stop = 'stop',

    /**
     * Wait for current state execution to complete before transitioning
     */
    Wait = 'wait'
}

/**
 * Контекст перехода между состояниями.
 * @template T - Тип данных состояния
 */
export interface TransitionContext<T extends object> {
    from: string;
    to: string;
    store: Store<T>;
}

/**
 * Тип функции жизненного цикла состояния.
 * @template T - Тип данных состояния
 */
export type StateLifecycle<T extends object> = (
    data: IStateLifeCycleData<T>
) => void;

/**
 * Конфигурация перехода между состояниями.
 * @template T - Тип данных состояния
 */
export interface TransitionConfig<T extends object> {
    to: string;
    condition: (state: T, prev: T) => boolean;
};

/**
 * Тип функции-условия перехода.
 * @template T - Тип данных состояния
 */
export type Condition<T extends object> = (store: Store<T>) => boolean;

/**
 * Тип действия состояния.
 * @template T - Тип данных состояния
 */
export type StateAction<T extends object> = GroupType<IStateLifeCycleData<T>>[] | ((chain: SystemChain, data: IStateLifeCycleData<T>) => void);