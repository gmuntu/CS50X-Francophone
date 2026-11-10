// Tests automatiques (npm test). Ils n'utilisent JAMAIS la vraie base de données :
// chaque test remplace « prisma » par une fausse base en mémoire.
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('.', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Ceinture et bretelles : aucune adresse de base réelle pendant les tests.
    env: { DATABASE_URL: '', CRON_SECRET: 'secret-de-test', SAVOIRIA_LOCAL: '' },
  },
});
