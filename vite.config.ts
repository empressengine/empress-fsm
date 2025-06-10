import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

export default defineConfig({
    base: './',
    plugins: [dts({ rollupTypes: true })],

    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
            '@fsm': fileURLToPath(new URL('./src/fsm', import.meta.url)),
        },
    },

    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'EmpressFSM',
            fileName: 'index',
        },
        rollupOptions: {
            external: ['empress-core', 'empress-store'],
        },
    },
});
