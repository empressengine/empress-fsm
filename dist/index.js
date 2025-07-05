import { SystemGroup as E, SystemChain as S, DeferredPromise as _, ServiceContainer as d, GroupsContainer as l, Utils as a, ExecutionController as f } from "empress-core";
import { Store as g } from "empress-store";
var p = /* @__PURE__ */ ((o) => (o.Stop = "stop", o.Wait = "wait", o))(p || {});
class c extends E {
  constructor(t) {
    super(), this.chain = t;
  }
  setup(t, e) {
  }
}
class m extends S {
  clear() {
  }
}
class x {
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
    this._executionController = t, this._currentExecutionId = "", this._storeStates = [], this._transitionPromise = null, this._isRunning = !1, this._name = e.name, this._storeAdapter = e.store, this._states = /* @__PURE__ */ new Map(), this._hooks = e.hooks, this._currentState = e.initialState, e.states.forEach((i) => {
      this._states.set(i.name, i);
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
    var i;
    this._isRunning = !0;
    const t = this._states.get(this._currentState);
    if (!t) throw new Error(`Initial state '${this._currentState}' not found`);
    this.addStoreData(this._storeAdapter), this._transitionPromise = new _();
    const e = this.getStoreData();
    e && (await this.processOnEnter(this._currentState, "", e), t.subStates && await t.subStates.start(), this._currentStateData = e, (i = this._transitionPromise) == null || i.resolve(), await this.processTransition());
  }
  /**
   * @description
   * Останавливает конечный автомат и останавливает текущее выполнение.
   * Вызывает onExit для текущего состояния, останавливает подсостояния и отписывается от Store.
   */
  async stop() {
    var e;
    this._isRunning = !1;
    const t = this._states.get(this._currentState);
    t && (this._executionController.stop(this._currentExecutionId), (e = this._transitionPromise) == null || e.resolve(), this.processOnExit(this._currentState, this._currentStateData), t.subStates && await t.subStates.stop(), this._storeAdapter.unsubscribe());
  }
  /**
   * @description
   * Обновляет состояние Store.
   * После обновления проверяются все возможные переходы.
   * 
   * @param callback - Функция обновления состояния
   */
  async update(t) {
    var i;
    if (!this._isRunning) return;
    const e = this._states.get(this._currentState);
    (e == null ? void 0 : e.transitionStrategy) === p.Stop && this._executionController.stop(this._currentExecutionId), await ((i = this._transitionPromise) == null ? void 0 : i.promise), this._storeAdapter.update(t);
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
  canTransit(t, e, i) {
    if (!this._isRunning) return null;
    const s = this._states.get(t);
    if (!s || !s.transitions) return null;
    for (const n of s.transitions)
      if (n.condition(e, i)) return n.to;
    return null;
  }
  /**
   * @description
   * Обрабатывает переход между состояниями.
   * Проверяет возможность перехода и запускает переход, если он возможен.
   */
  async processTransition() {
    var i;
    if (!this._isRunning) return;
    const t = this.getStoreData();
    if (!t) return;
    const e = this.canTransit(this._currentState, t.current, t.prev);
    e && (this._transitionPromise = new _(), await this.transition(this._currentState, e, this._currentStateData, t), this._currentStateData = t, (i = this._transitionPromise) == null || i.resolve());
  }
  async transition(t, e, i, s) {
    const n = this._states.get(t), r = this._states.get(e);
    if (!n || !r) throw new Error(`State '${t}' or '${e}' not found`);
    this.processOnExit(t, i), await this.processOnEnter(e, t, s), r.subStates && r.subStates.start();
  }
  processOnExit(t, e) {
    var h;
    const i = this._states.get(t);
    if (!i) throw new Error(`State '${t}' not found`);
    if (!i.onExit) return;
    const s = { fsmName: this._name, from: t, to: "", data: e }, n = `[FSM][onExit] In ${this._name} from ${t}}`, r = this.extractGroups(i.onExit, s), u = this._executionController.create(r, s, n);
    (h = this._hooks) != null && h.onExit && this._hooks.onExit(s), this._executionController.run(u, !1);
  }
  async processOnEnter(t, e, i) {
    var h;
    const s = this._states.get(t);
    if (!s) throw new Error(`State '${t}' not found`);
    if (!s.onEnter) return;
    const n = { fsmName: this._name, from: e, to: t, data: i }, r = `[FSM][onEnter] In ${this._name} from ${e} to ${t}`, u = this.extractGroups(s.onEnter, n);
    this._currentExecutionId = this._executionController.create(u, n, r), this._currentState = t, (h = this._hooks) != null && h.onEnter && this._hooks.onEnter(n), await this._executionController.run(this._currentExecutionId);
  }
  extractGroups(t, e) {
    if (typeof t == "function") {
      const i = new m();
      t(i, e);
      const s = new c(i);
      return d.instance.get(l).set(c, s), [c];
    } else
      return t;
  }
}
class w {
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
class G {
  create(t) {
    const e = new g(t);
    return new w(e);
  }
}
class b {
  constructor(t, e) {
    this._name = t, this._store = e, this._config = {
      name: "",
      store: new G().create({}),
      initialState: "",
      states: []
    }, this._onEnterChains = /* @__PURE__ */ new Map(), this._onEnterGroups = /* @__PURE__ */ new Map(), this._onExitChains = /* @__PURE__ */ new Map(), this._onExitGroups = /* @__PURE__ */ new Map(), this._editedState = null, this._config.name = this._name, this._config.store = this._store;
  }
  /**
   * @description
   * Возвращает конфигурацию FSM.
   */
  get config() {
    return this._config;
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
  setInitialState(t) {
    return this._config.initialState = t, this;
  }
  /**
   * @description
   * Добавляет новое состояние в конфигурацию FSM.
   * 
   * @param name Имя состояния.
   */
  addState(t) {
    return this._editedState = {
      name: t,
      onEnter: [],
      onExit: [],
      transitions: []
    }, this._config.states.push(this._editedState), this;
  }
  /**
   * @description
   * Удаляет состояние из конфигурации FSM.
   * 
   * @param state Имя состояния.
   */
  removeState(t) {
    return this._config.states = this._config.states.filter((e) => e.name !== t), this._editedState = null, this._onEnterChains.delete(t), this._onExitChains.delete(t), this._onEnterGroups.delete(t), this._onExitGroups.delete(t), this;
  }
  /**
   * @description
   * Добавляет под-состояния в конфигурацию FSM.
   * 
   * @param fsm Инстанс FSM устанавливаемый в качестве под-состояний.
   */
  addSubStates(t) {
    if (!this._editedState)
      throw new Error("State is not edited");
    return this._editedState.subStates = t, this;
  }
  /**
   * @description
   * Удаляет под-состояния из конфигурации FSM.
   * 
   * @param state Имя состояния.
   */
  removeSubStates(t) {
    return this._config.states = this._config.states.map((e) => (e.name === t && (e.subStates = void 0), e)), this;
  }
  /**
   * @description
   * Заменяет под-состояния в конфигурации FSM.
   * 
   * @param state Имя состояния.
   * @param fsm Инстанс FSM устанавливаемый в качестве под-состояний.
   */
  replaceSubStates(t, e) {
    return this._config.states = this._config.states.map((i) => (i.name === t && (i.subStates = e), i)), this;
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
  addTransition(t, e) {
    var i;
    if (!this._editedState)
      throw new Error("State is not edited");
    return (i = this._editedState.transitions) == null || i.push({
      to: t,
      condition: e
    }), this;
  }
  /**
   * @description
   * Удаляет переход из конфигурации состояния.
   * 
   * @param state Имя состояния, из которого осуществляется переход.
   * @param to Имя состояния, в которое осуществляется переход.
   */
  removeTransition(t, e) {
    return this._config.states = this._config.states.map((i) => {
      var s;
      return i.name === t && (i.transitions = (s = i.transitions) == null ? void 0 : s.filter((n) => n.to !== e)), i;
    }), this;
  }
  /**
   * @description
   * Заменяет переход в конфигурации состояния.
   * 
   * @param state Имя состояния, из которого осуществляется переход.
   * @param to Имя состояния, в которое осуществляется переход.
   * @param condition Новое условие перехода.
   */
  replaceTransition(t, e, i) {
    return this._config.states = this._config.states.map((s) => {
      var n;
      return s.name === t && (s.transitions = (n = s.transitions) == null ? void 0 : n.map((r) => r.to === e ? { to: e, condition: i } : r)), s;
    }), this;
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
  addOnEnterChain(t) {
    if (!this._editedState)
      throw new Error("State is not edited");
    return this._onEnterChains.set(this._editedState.name, t), this;
  }
  /**
   * @description
   * Добавляет действие onExit в конфигурацию состояния.
   * 
   * @param action Действие, которое будет добавлено в конфигурацию состояния.
   */
  addOnExitChain(t) {
    if (!this._editedState)
      throw new Error("State is not edited");
    return this._onExitChains.set(this._editedState.name, t), this;
  }
  /**
   * @description
   * Удаляет действие onEnter из конфигурации состояния.
   * 
   * @param state Имя состояния из которого удаляется дейсвтие.
   */
  removeOnEnterChain(t) {
    return this._onEnterChains.delete(t), this;
  }
  /**
   * @description
   * Удаляет действие onExit из конфигурации состояния.
   * 
   * @param state Имя состояния из которого удаляется дейсвтие.
   */
  removeOnExitChain(t) {
    return this._onExitChains.delete(t), this;
  }
  /**
   * @description
   * Заменяет действие onEnter для указанного состояния в конфигурации состояния.
   * 
   * @param state Имя состояния для которого заменяется дейсвтие.
   * @param action Новое действие, которое будет добавлено в конфигурацию состояния.
   */
  replaceOnEnterChain(t, e) {
    return this._onEnterChains.set(t, e), this;
  }
  /**
   * @description
   * Заменяет действие onExit для указанного состояния в конфигурации состояния.
   * 
   * @param state Имя состояния для которого заменяется дейсвтие.
   * @param action Новое действие, которое будет добавлено в конфигурацию состояния.
   */
  replaceOnExitChain(t, e) {
    return this._onExitChains.set(t, e), this;
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
  addOnEnterGroup(t, e = a.uuid()) {
    if (!this._editedState)
      throw new Error("State is not edited");
    const i = this._onEnterGroups.get(this._editedState.name) || [];
    return i.push({ action: t, id: e }), this._onEnterGroups.set(this._editedState.name, i), this;
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
  addOnEnterGroupToState(t, e, i = a.uuid()) {
    const s = this._onEnterGroups.get(t) || [];
    return s.push({ action: e, id: i }), this._onEnterGroups.set(t, s), this;
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
  addOnEnterGroupBefore(t, e, i, s = a.uuid()) {
    const n = this._onEnterGroups.get(t) || [];
    return n.splice(n.findIndex((r) => r.id === e), 0, { action: i, id: s }), this._onEnterGroups.set(t, n), this;
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
  addOnEnterGroupAfter(t, e, i, s = a.uuid()) {
    const n = this._onEnterGroups.get(t) || [];
    return n.splice(n.findIndex((r) => r.id === e) + 1, 0, { action: i, id: s }), this._onEnterGroups.set(t, n), this;
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
  addOnEnterGroupToStart(t, e, i = a.uuid()) {
    const s = this._onEnterGroups.get(t) || [];
    return s.unshift({ action: e, id: i }), this._onEnterGroups.set(t, s), this;
  }
  /**
   * @description
   * Добавляет группу систем onExit в конфигурацию состояния.
   * 
   * @param action Группа систем, которая будет добавлена в конфигурацию состояния.
   * @param id Уникальный идентификатор группы систем. Необязательный параметр, по-умолчанию
   * генерируется автоматически.
   */
  addOnExitGroup(t, e = a.uuid()) {
    if (!this._editedState)
      throw new Error("State is not edited");
    const i = this._onExitGroups.get(this._editedState.name) || [];
    return i.push({ action: t, id: e }), this._onExitGroups.set(this._editedState.name, i), this;
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
  addOnExitGroupToState(t, e, i = a.uuid()) {
    const s = this._onExitGroups.get(t) || [];
    return s.push({ action: e, id: i }), this._onExitGroups.set(t, s), this;
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
  addOnExitGroupBefore(t, e, i, s = a.uuid()) {
    const n = this._onExitGroups.get(t) || [];
    return n.splice(n.findIndex((r) => r.id === e), 0, { action: i, id: s }), this._onExitGroups.set(t, n), this;
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
  addOnExitGroupAfter(t, e, i, s = a.uuid()) {
    const n = this._onExitGroups.get(t) || [];
    return n.splice(n.findIndex((r) => r.id === e) + 1, 0, { action: i, id: s }), this._onExitGroups.set(t, n), this;
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
  addOnExitGroupToStart(t, e, i = a.uuid()) {
    const s = this._onExitGroups.get(t) || [];
    return s.unshift({ action: e, id: i }), this._onExitGroups.set(t, s), this;
  }
  /**
   * @description
   * Удаляет группу систем onEnter для указанного состояния.
   * 
   * @param state Имя состояния для которого удаляется группа систем.
   * @param id Уникальный идентификатор группы систем.
   */
  removeOnEnterGroup(t, e) {
    let i = this._onEnterGroups.get(t);
    return i ? (i = i.filter((s) => s.id !== e), this._onEnterGroups.set(t, i), this) : this;
  }
  /**
   * @description
   * Удаляет группу систем onExit для указанного состояния.
   * 
   * @param state Имя состояния для которого удаляется группа систем.
   * @param id Уникальный идентификатор группы систем.
   */
  removeOnExitGroup(t, e) {
    let i = this._onExitGroups.get(t);
    return i ? (i = i.filter((s) => s.id !== e), this._onExitGroups.set(t, i), this) : this;
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
  replaceOnEnterGroup(t, e, i) {
    let s = this._onEnterGroups.get(t);
    return s ? (s = s.map((n) => n.id === e ? { action: i, id: e } : n), this._onEnterGroups.set(t, s), this) : this;
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
  replaceOnExitGroup(t, e, i) {
    let s = this._onExitGroups.get(t);
    return s ? (s = s.map((n) => n.id === e ? { action: i, id: e } : n), this._onExitGroups.set(t, s), this) : this;
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
  build() {
    const t = d.instance.get(f);
    return this.validateInitialState(), this.validateTransitions(), this._config.states.forEach((e) => {
      this.buildOnEnterActions(e), this.buildOnExitActions(e);
    }), new x(t, this._config);
  }
  buildOnEnterActions(t) {
    var s;
    t.onEnter = [];
    const e = this._onEnterChains.get(t.name);
    e && (t.onEnter = e);
    const i = (s = this._onEnterGroups.get(t.name)) == null ? void 0 : s.map((n) => n.action);
    if (e && i)
      throw new Error("OnEnter actions for state " + t.name + " has both chains and groups!");
    i && (t.onEnter = i);
  }
  buildOnExitActions(t) {
    var s;
    t.onExit = [];
    const e = this._onExitChains.get(t.name);
    e && (t.onExit = e);
    const i = (s = this._onExitGroups.get(t.name)) == null ? void 0 : s.map((n) => n.action);
    if (e && i)
      throw new Error("OnExit actions for state " + t.name + " has both chains and groups!");
    i && (t.onExit = i);
  }
  validateInitialState() {
    if (!this._config.initialState)
      throw new Error("Initial state is not set!");
    if (!this._config.states.find((t) => t.name === this._config.initialState))
      throw new Error("State " + this._config.initialState + " cannot be initial state, because it does not exist!");
  }
  validateTransitions() {
    for (let t = 0; t < this._config.states.length; t++) {
      const e = this._config.states[t];
      if (e.transitions)
        for (let i = 0; i < e.transitions.length; i++) {
          const s = e.transitions[i];
          if (!this._config.states.find((n) => n.name === s.to))
            throw new Error("Can't transit to " + s.to + " from " + e.name + " because it does not exist!");
        }
    }
  }
}
class v {
  create(t, e) {
    return this._builder = new b(t, e), this.setup(this._builder), this._builder.build();
  }
  getConfig() {
    return this._builder.config;
  }
}
export {
  w as EmpressStoreAdapter,
  G as EmpressStoreFactory,
  x as FSM,
  b as FSMBuilder,
  v as FSMFactory,
  p as TransitionStrategy
};
