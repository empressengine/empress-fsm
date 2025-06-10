module.exports = {
    // Указываем, что у нас TS-проект
    parser: '@typescript-eslint/parser',
    parserOptions: {
        // Показываем, как ESLint находить tsconfig
        project: ['./tsconfig.json'],
        tsconfigRootDir: __dirname,
        sourceType: 'module',
    },
    // Определяем окружение: браузерное, нодовское и т.д.
    env: {
        es6: true,
        browser: true,
        node: true,
    },
    // Подключаем наборы правил
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        // Правила для работы с импортами (включая ES-модули)
        'plugin:import/recommended',
        'plugin:import/typescript',
        // Подключаем Prettier-конфигурации
        'plugin:prettier/recommended',
        'prettier',
    ],
    // Подключаем нужные плагины
    plugins: ['@typescript-eslint', 'import', 'prettier'],
    // Глобальные правила
    rules: {
        // Включаем встроенное правило Prettier (чтобы ESLint ругался, если не отформатировано)
        'prettier/prettier': 'error',

        // Строгие проверки типов
        '@typescript-eslint/strict-boolean-expressions': 'off',
        '@typescript-eslint/no-explicit-any': 'warn',

        // Пример: запрещаем console.log
        'no-console': 'off',

        /**
         * Запрет импорта внутренних модулей (submodules).
         * Вместо "import { X } from '@data/something/inner'",
         * нужно "import { X } from '@data'", если re-exports сделаны в @data/index.
         */
        'import/no-internal-modules': [
            'error',
            {
                forbid: [
                    // Запрещаем любой глубокий импорт из @data, @logic, @execution, @app, @shared
                    '^@data/.+',
                    '^@logic/.+',
                    '^@execution/.+',
                    '^@app/.+',
                    '^@shared/.+',
                ],
                allow: [
                    // Разрешаем импорты напрямую из index (например "@data/index")
                    '^@data/index',
                    '^@logic/index',
                    '^@execution/index',
                    '^@app/index',
                    '^@shared/index',
                ],
            },
        ],
    },
    // Разрешаем ESLint резолвить TS alias
    settings: {
        'import/resolver': {
            typescript: {
                project: ['./tsconfig.json'],
            },
        },
    },
};
