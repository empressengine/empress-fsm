import { DeferredPromise as h } from "empress-core";
var c = /* @__PURE__ */ ((a) => (a.Stop = "stop", a.Wait = "wait", a))(c || {});
class _ {
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
    this._executionController = t, this._currentExecutionId = "", this._storeStates = [], this._transitionPromise = null, this._name = s.name, this._store = s.store, this._states = /* @__PURE__ */ new Map(), this._hooks = s.hooks, this._currentState = s.initialState, s.states.forEach((e) => {
      this._states.set(e.name, e);
    }), this._store.subscribe(async () => {
      this.addStoreData(this._store), this.processTransition();
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
    var e;
    const t = this._states.get(this._currentState);
    if (!t) throw new Error(`Initial state '${this._currentState}' not found`);
    this.addStoreData(this._store), this._transitionPromise = new h();
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
    const t = this._states.get(this._currentState);
    t && (this._executionController.stop(this._currentExecutionId), (s = this._transitionPromise) == null || s.resolve(), this.processOnExit(this._currentState, this._currentStateData), t.subStates && await t.subStates.stop(), this._store.subscribe(() => {
    }));
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
    const s = this._states.get(this._currentState);
    (s == null ? void 0 : s.transitionStrategy) === c.Stop && this._executionController.stop(this._currentExecutionId), await ((e = this._transitionPromise) == null ? void 0 : e.promise), this._store.update(t);
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
      current: t.cloneState(),
      prev: t.clonePrevState()
    });
  }
  getStoreData(t = !1) {
    return t ? this._storeStates.pop() : this._storeStates.shift();
  }
  canTransit(t, s, e) {
    const r = this._states.get(t);
    if (!r || !r.transitions) return null;
    for (const i of r.transitions)
      if (i.condition(s, e)) return i.to;
    return null;
  }
  /**
   * @description
   * Обрабатывает переход между состояниями.
   * Проверяет возможность перехода и запускает переход, если он возможен.
   */
  async processTransition() {
    var e;
    const t = this.getStoreData();
    if (!t) return;
    const s = this.canTransit(this._currentState, t.current, t.prev);
    s && (this._transitionPromise = new h(), await this.transition(this._currentState, s, this._currentStateData, t), this._currentStateData = t, (e = this._transitionPromise) == null || e.resolve());
  }
  async transition(t, s, e, r) {
    const i = this._states.get(t), n = this._states.get(s);
    if (!i || !n) throw new Error(`State '${t}' or '${s}' not found`);
    this.processOnExit(t, e), await this.processOnEnter(s, t, r), n.subStates && n.subStates.start();
  }
  processOnExit(t, s) {
    var o;
    const e = this._states.get(t);
    if (!e) throw new Error(`State '${t}' not found`);
    if (!e.onExit) return;
    const r = { fsmName: this._name, from: t, to: "", data: s }, i = `[FSM][onExit] In ${this._name} from ${t}}`, n = this._executionController.create(e.onExit, r, i);
    (o = this._hooks) != null && o.onExit && this._hooks.onExit(r), this._executionController.run(n, !1);
  }
  async processOnEnter(t, s, e) {
    var o;
    const r = this._states.get(t);
    if (!r) throw new Error(`State '${t}' not found`);
    if (!r.onEnter) return;
    const i = { fsmName: this._name, from: s, to: t, data: e }, n = `[FSM][onEnter] In ${this._name} from ${s} to ${t}`;
    this._currentExecutionId = this._executionController.create(r.onEnter, i, n), this._currentState = t, (o = this._hooks) != null && o.onEnter && this._hooks.onEnter(i), await this._executionController.run(this._currentExecutionId);
  }
}
export {
  _ as FSM,
  c as TransitionStrategy
};
