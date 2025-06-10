import { Utils as h } from "empress-core";
var c = /* @__PURE__ */ ((o) => (o.Stop = "stop", o.Wait = "wait", o))(c || {});
class E {
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
  constructor(t, e) {
    this._executionController = t, this._currentEnterExecutionId = null, this._currentExitExecutionId = null, this._isTransitioning = !1, this._isExecutingLifecycle = !1, this._pendingUpdates = [], this._name = e.name, this._store = e.store, this._states = /* @__PURE__ */ new Map(), this._hooks = e.hooks, this._currentState = e.initialState, e.states.forEach((i) => {
      this._states.set(i.name, i);
    }), this._store.subscribe(async (i) => {
      const s = () => i, n = this._states.get(this._currentState);
      if (!(!n || !n.transitions || this._isTransitioning)) {
        if (this._isExecutingLifecycle) {
          if (this.getTransitionStrategy(n, "") === c.Stop && this._currentEnterExecutionId) {
            this._executionController.stop(this._currentEnterExecutionId), this._currentEnterExecutionId = null, this._isExecutingLifecycle = !1, await this.applyUpdate(s);
            return;
          }
          this._pendingUpdates.push(s);
          return;
        }
        await this.applyUpdate(s);
      }
    });
  }
  /**
   * @description
   * Получает имя конечного автомата.
   * Имя используется для идентификации и отладки.
   */
  get name() {
    return this._name;
  }
  /**
   * @description
   * Получает Store, связанный с конечным автоматом.
   * Store содержит данные, которые влияют на переходы между состояниями.
   */
  get store() {
    return this._store;
  }
  /**
   * @description
   * Получает текущее состояние конечного автомата.
   */
  get currentState() {
    return this._currentState;
  }
  /**
   * @description
   * Получает карту состояний конечного автомата.
   * Каждое состояние содержит свои хуки, переходы и подсостояния.
   */
  get states() {
    return this._states;
  }
  /**
   * @description
   * Получает глобальные хуки конечного автомата.
   * Глобальные хуки вызываются при всех переходах между состояниями.
   * 
   * @returns Объект с хуками onEnter и onExit
   */
  get hooks() {
    return this._hooks || {};
  }
  /**
   * @description
   * Запускает конечный автомат.
   * Устанавливает начальное состояние и запускает подсостояния, если они есть.
   * 
   * @throws Error если начальное состояние не найдено
   */
  async start() {
    const t = this._states.get(this._currentState);
    if (!t)
      throw new Error(`Initial state '${this._currentState}' not found`);
    const e = h.createProxyDecorator(this._store.cloneState());
    this._lastStateCopy = e;
    const i = this.createStateMethod(this._currentState, "", this._currentState, "onEnter", e);
    if (i)
      try {
        this._currentEnterExecutionId = i, this._isExecutingLifecycle = !0, await this._executionController.run(i);
      } finally {
        this._currentEnterExecutionId = null, this._isExecutingLifecycle = !1, await this.applyPendingUpdates();
      }
    t.subStates && await t.subStates.start();
  }
  /**
   * @description
   * Обновляет состояние Store.
   * После обновления проверяются все возможные переходы.
   * 
   * @param callback - Функция обновления состояния
   */
  update(t) {
    this._store.update(t);
  }
  /**
   * @description
   * Останавливает конечный автомат.
   * Вызывает onExit для текущего состояния, останавливает подсостояния и отписывается от Store.
   */
  async stop() {
    const t = this._states.get(this._currentState);
    if (!t) return;
    const e = this.createStateMethod(this._currentState, this._currentState, "", "onExit", this._lastStateCopy);
    e && await this._executionController.run(e), t.subStates && await t.subStates.stop(), this._store.subscribe(() => {
    });
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
  createStateMethod(t, e, i, s, n) {
    var a;
    const r = this._states.get(t);
    if (!r)
      throw new Error(`State '${t}' not found`);
    if (r[s]) {
      const u = { fsmName: this._name, from: e, to: i, data: n }, _ = `[FSM][${s}] In ${this._name} from ${e} to ${i}`, l = this._executionController.create(r[s], u, _);
      if ((a = this._hooks) != null && a[s]) {
        const p = { fsmName: this._name, from: e, to: i, data: n };
        this._hooks[s](p);
      }
      return l;
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
  getTransitionStrategy(t, e) {
    if (!t.transitionStrategy) return c.Wait;
    if (typeof t.transitionStrategy == "function") {
      const i = {
        from: t.name,
        to: e,
        store: this._store
      };
      return t.transitionStrategy(i);
    }
    return t.transitionStrategy;
  }
  /**
   * @description
   * Применяет отложенные обновления состояния.
   * Используется при режиме Wait для обработки накопленных обновлений.
   */
  async applyPendingUpdates() {
    for (; this._pendingUpdates.length > 0; ) {
      const t = this._pendingUpdates.shift();
      await this.applyUpdate(t);
    }
  }
  /**
   * @description
   * Применяет обновление состояния и проверяет переходы.
   * 
   * @param update - Функция обновления состояния
   */
  async applyUpdate(t) {
    this._store.update(t), await this.checkTransitions();
  }
  /**
   * @description
   * Проверяет возможные переходы из текущего состояния.
   * Если условие перехода выполняется, осуществляет переход в новое состояние.
   */
  async checkTransitions() {
    const t = this._states.get(this._currentState);
    if (!(!t || !t.transitions || this._isTransitioning || this._isExecutingLifecycle)) {
      for (const e of t.transitions)
        if (e.condition(this._store)) {
          this.getTransitionStrategy(t, e.to) === c.Stop && this._currentEnterExecutionId && (this._executionController.stop(this._currentEnterExecutionId), this._currentEnterExecutionId = null, this._isExecutingLifecycle = !1), await this.transition(e.to);
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
  async transition(t) {
    try {
      this._isTransitioning = !0;
      const e = this._states.get(this._currentState), i = this._states.get(t);
      if (!e || !i)
        throw new Error(`Invalid transition from '${this._currentState}' to '${t}'`);
      const s = this._currentState, n = this.createStateMethod(s, s, "", "onExit", this._lastStateCopy);
      n && (this._currentExitExecutionId = n, this._isExecutingLifecycle = !0, await this._executionController.run(n, !1), this._currentExitExecutionId = null, this._isExecutingLifecycle = !1, await this.applyPendingUpdates()), e.subStates && e.subStates.stop(), this._currentState = t;
      const r = h.createProxyDecorator(this._store.cloneState());
      this._lastStateCopy = r;
      const a = this.createStateMethod(t, s, t, "onEnter", r);
      a && (this._currentEnterExecutionId = a, this._isExecutingLifecycle = !0, await this._executionController.run(a), this._currentEnterExecutionId = null, this._isExecutingLifecycle = !1, await this.checkTransitions()), i.subStates && i.subStates.start();
    } finally {
      this._isTransitioning = !1, await this.checkTransitions();
    }
  }
}
export {
  E as FSM,
  c as TransitionStrategy
};
