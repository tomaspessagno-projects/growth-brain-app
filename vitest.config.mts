import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Tests del MOTOR (lógica pura en src/lib): no hay componentes React → entorno 'node', sin jsdom.
// Alias '@' → ./src para resolver los imports '@/...' igual que tsconfig (paths).
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
