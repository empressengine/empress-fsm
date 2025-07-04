import { SystemGroup as p, DeferredPromise as c, SystemChain as S, ServiceContainer as d, GroupsContainer as l } from "empress-core";
import { Store as f } from "empress-store";
var _ = /* @__PURE__ */ ((a) => (a.Stop = "stop", a.Wait = "wait", a))(_ || {});
class u extends p {
  constructor(t) {
    super(), this.chain = t;
  }
  setup(t, s) {
  }
}
class w {
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
  constructor(t, s) {
    this._executionController = t, this._currentExecutionId = "", this._storeStates = [], this._transitionPromise = null, this._isRunning = !1, this._name = s.name, this._storeAdapter = s.store, this._states = /* @__PURE__ */ new Map(), this._hooks = s.hooks, this._currentState = s.initialState, s.states.forEach((e) => {
      this._states.set(e.name, e);
    }), this._storeAdapter.subscribe(async () => {
      this._isRunning && (this.addStoreData(this._storeAdapter), this.processTransition());
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
   * Получает StoreAdapter, связанный с конечным автоматом.
   * StoreAdapter содержит данные, которые влияют на переходы между состояниями.
   */
  get storeAdapter() {
    return this._storeAdapter;
  }
  /**
   * @description
   * Получает Store, связанный с конечным автоматом.
   * Store содержит данные, которые влияют на переходы между состояниями.
   * @deprecated Используйте storeAdapter вместо store.
   */
  get store() {
    return console.warn("FSM.store is deprecated. Use FSM.storeAdapter instead."), {
      cloneState: () => this._storeAdapter.getState(),
      clonePrevState: () => this._storeAdapter.getPrevState(),
      update: (t) => this._storeAdapter.update(t)
    };
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
    var e;
    this._isRunning = !0;
    const t = this._states.get(this._currentState);
    if (!t) throw new Error(`Initial state '${this._currentState}' not found`);
    this.addStoreData(this._storeAdapter), this._transitionPromise = new c();
    const s = this.getStoreData();
    s && (await this.processOnEnter(this._currentState, "", s), t.subStates && await t.subStates.start(), this._currentStateData = s, (e = this._transitionPromise) == null || e.resolve(), await this.processTransition());
  }
  /**
   * @description
   * Останавливает конечный автомат и останавливает текущее выполнение.
   * Вызывает onExit для текущего состояния, останавливает подсостояния и отписывается от Store.
   */
  async stop() {
    var s;
    this._isRunning = !1;
    const t = this._states.get(this._currentState);
    t && (this._executionController.stop(this._currentExecutionId), (s = this._transitionPromise) == null || s.resolve(), this.processOnExit(this._currentState, this._currentStateData), t.subStates && await t.subStates.stop(), this._storeAdapter.unsubscribe());
  }
  /**
   * @description
   * Обновляет состояние Store.
   * После обновления проверяются все возможные переходы.
   * 
   * @param callback - Функция обновления состояния
   */
  async update(t) {
    var e;
    if (!this._isRunning) return;
    const s = this._states.get(this._currentState);
    (s == null ? void 0 : s.transitionStrategy) === _.Stop && this._executionController.stop(this._currentExecutionId), await ((e = this._transitionPromise) == null ? void 0 : e.promise), this._storeAdapter.update(t);
  }
  /**
   * @description
   * Ожидает завершения текущего перехода.
   */
  async waitForTransition() {
    var t;
    await ((t = this._transitionPromise) == null ? void 0 : t.promise);
  }
  addStoreData(t) {
    this._storeStates.push({
      current: t.getState(),
      prev: t.getPrevState()
    });
  }
  getStoreData(t = !1) {
    return t ? this._storeStates.pop() : this._storeStates.shift();
  }
  canTransit(t, s, e) {
    if (!this._isRunning) return null;
    const r = this._states.get(t);
    if (!r || !r.transitions) return null;
    for (const n of r.transitions)
      if (n.condition(s, e)) return n.to;
    return null;
  }
  /**
   * @description
   * Обрабатывает переход между состояниями.
   * Проверяет возможность перехода и запускает переход, если он возможен.
   */
  async processTransition() {
    var e;
    if (!this._isRunning) return;
    const t = this.getStoreData();
    if (!t) return;
    const s = this.canTransit(this._currentState, t.current, t.prev);
    s && (this._transitionPromise = new c(), await this.transition(this._currentState, s, this._currentStateData, t), this._currentStateData = t, (e = this._transitionPromise) == null || e.resolve());
  }
  async transition(t, s, e, r) {
    const n = this._states.get(t), i = this._states.get(s);
    if (!n || !i) throw new Error(`State '${t}' or '${s}' not found`);
    this.processOnExit(t, e), await this.processOnEnter(s, t, r), i.subStates && i.subStates.start();
  }
  processOnExit(t, s) {
    var o;
    const e = this._states.get(t);
    if (!e) throw new Error(`State '${t}' not found`);
    if (!e.onExit) return;
    const r = { fsmName: this._name, from: t, to: "", data: s }, n = `[FSM][onExit] In ${this._name} from ${t}}`, i = this.extractGroups(e.onExit, r), h = this._executionController.create(i, r, n);
    (o = this._hooks) != null && o.onExit && this._hooks.onExit(r), this._executionController.run(h, !1);
  }
  async processOnEnter(t, s, e) {
    var o;
    const r = this._states.get(t);
    if (!r) throw new Error(`State '${t}' not found`);
    if (!r.onEnter) return;
    const n = { fsmName: this._name, from: s, to: t, data: e }, i = `[FSM][onEnter] In ${this._name} from ${s} to ${t}`, h = this.extractGroups(r.onEnter, n);
    this._currentExecutionId = this._executionController.create(h, n, i), this._currentState = t, (o = this._hooks) != null && o.onEnter && this._hooks.onEnter(n), await this._executionController.run(this._currentExecutionId);
  }
  extractGroups(t, s) {
    if (typeof t == "function") {
      const e = new S();
      t(e, s);
      const r = new u(e);
      return d.instance.get(l).set(u, r), [u];
    } else
      return t;
  }
}
class g {
  constructor(t) {
    this._store = t, this._unsubscribeFn = () => {
    };
  }
  get store() {
    return this._store;
  }
  /**
   * @description
   * Получает текущее состояние Store.
   */
  getState() {
    return this._store.cloneState();
  }
  /**
   * @description
   * Получает предыдущее состояние Store.
   */
  getPrevState() {
    return this._store.clonePrevState();
  }
  /**
   * @description
   * Обновляет состояние Store.
   */
  update(t) {
    this._store.update(t);
  }
  /**
   * @description
   * Подписывается на изменения Store.
   */
  subscribe(t) {
    return this._unsubscribeFn = this._store.subscribe(t), this._unsubscribeFn;
  }
  /**
   * @description
   * Отписывается от Store.
   */
  unsubscribe() {
    this._unsubscribeFn();
  }
}
class x {
  create(t) {
    const s = new f(t);
    return new g(s);
  }
}
export {
  g as EmpressStoreAdapter,
  x as EmpressStoreFactory,
  w as FSM,
  _ as TransitionStrategy
};
