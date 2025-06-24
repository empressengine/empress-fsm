![Empress Logo](https://empressengine.github.io/empress-documentation/assets/images/empress_logo_big_fsm-5d73b41dab10e209faaa578b5d4c3273.png)

# Empress FSM

[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)]()
[![License](https://img.shields.io/badge/License-MIT-green.svg)]()

Empress FSM - это конечный автомат, разработанный специально для работы с Empress. Он позволяет управлять состояниями приложения на основе данных и выполнять Группы Систем в определенном порядке.

## Содержание

- [Особенности](#особенности)
- [Установка](#установка)
- [Принцип работы](#принцип-работы)
  - [Инициализация](#инициализация)
  - [Выполнение](#выполнение)
- [Пример использования](#пример-использования)
- [Использование с другими Store](#использование-с-другими-store)
- [Лицензия](#лицензия)


## Особенности

- Интеграция с Empress Store для управления данными
- Возможность подключения к любому Store (включая Redux, Zustand, Pinia, etc), через IStoreAdapter
- Интеграция с Empress Core для выполнения SystemGroup в стейтах
- Выполнение Групп Систем в порядке их добавления
- Два режима перехода между состояниями:
  - Stop: немедленный переход с прерыванием текущего состояния
  - Wait: ожидание завершения текущего состояния
- Система хуков для обработки входа/выхода из состояний
- Поддержка вложенных состояний

## Документация

Вся техническая документация доступна по ссылке [Empress Engine](https://empressengine.github.io/empress-documentation/intro).

## Установка

```bash
npm install empress-fsm empress-store empress-core
```

## Принцип работы

1. **Инициализация**
   - Создание StoreAdapter через StoreFactory
   - Определение состояний и их переходов
   - Настройка Групп Систем для каждого состояния

2. **Выполнение**
   - При входе в состояние выполняются его Группы Систем
   - При изменении Store проверяются условия переходов
   - При выполнении условия происходит переход в новое состояние

## Пример использования

```typescript
import { FSM } from 'empress-fsm';
import { EmpressStoreFactory } from 'empress-fsm/factory';
import { ExecutionController } from 'empress-core';

// Определяем интерфейс данных
interface GameState {
  score: number;
  level: number;
}

// Создаем StoreAdapter через Factory
const store = new EmpressStoreFactory().create<GameState>({
  score: 0,
  level: 1
});

// Создаем ExecutionController
const executionController = new ExecutionController();

// Настраиваем FSM
const gameFSM = new FSM(executionController, {
  name: 'game',
  storeAdapter: store,
  initialState: 'playing',
  states: [
    {
      name: 'playing',
      onEnter: [PlayingOnEnterGroup],
      transitionStrategy: TransitionStrategy.Stop, // Немедленный переход при проигрыше
      transitions: [
        {
          to: 'gameOver',
          condition: (store) => store.getState().score < 0
        }
      ],
    },
    {
      name: 'gameOver',
      onEnter: [GameOverOnEnterGroup],
    }
  ]
});

// Запускаем FSM
await gameFSM.start();

// Обновляем состояние, дожидаясь выполнения всех Групп Систем в текущем состоянии
await gameFSM.update(state => ({
  score: state.score - 10
}));
```

## Использование с другими Store

Для использования Empress FSM с другими Store, вам нужно создать StoreAdapter, реализующий интерфейс IStoreAdapter.

```typescript
import { IStoreAdapter } from 'empress-fsm/store-adapter';

class CustomStoreAdapter implements IStoreAdapter {
  getState(): any {
    // Получение состояния
  }

  getPrevState(): any {
    // Получение предыдущего состояния
  }

  update(updater: (state: any) => Partial<any>): void {
    // Обновление состояния
  }

  subscribe(listener: (state: any, prev: any) => void): () => void {
    // Подписка на изменения
    return () => {};
  }

  unsubscribe(): void {
    // Отписка от изменений
  }
}
```

Далее при необходимости создайте StoreFactory, реализующий интерфейс IStoreFactory.

```typescript
import { IStoreFactory } from 'empress-fsm/factory/models';

class CustomStoreFactory implements IStoreFactory {
  create<T extends object>(initialState: T): IStoreAdapter<T> {
    // Создание StoreAdapter
    return new CustomStoreAdapter();
  }
}
```

Подключите StoreFactory к FSM:

```typescript
// Создаем StoreAdapter через Factory
const store = new CustomStoreFactory().create<GameState>({
  score: 0,
  level: 1
});

const fsm = new FSM(executionController, {
  name: 'game',
  storeAdapter: store,
  initialState: 'playing',
  states: [
    {
      name: 'playing',
      onEnter: [PlayingOnEnterGroup],
      transitionStrategy: TransitionStrategy.Stop,
      transitions: [
        {
          to: 'gameOver',
          condition: (store) => store.getState().score < 0
        }
      ],
    },
    {
      name: 'gameOver',
      onEnter: [GameOverOnEnterGroup],
    }
  ]
});
```

## Лицензия

EmpressApp распространяется под лицензией MIT.

```text
MIT License

Copyright (c) 2025 EmpressApp Game Framework

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```