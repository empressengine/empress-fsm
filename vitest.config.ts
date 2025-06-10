import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
            '@fsm': fileURLToPath(new URL('./src/fsm', import.meta.url)),
        },
    },

    test: {
        globals: true,
        coverage: {
            reporter: ['text', 'html'],
        },
    },
});
