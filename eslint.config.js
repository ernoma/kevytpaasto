// @ts-check
const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

module.exports = defineConfig([
  globalIgnores([
    '**/node_modules/',
    '**/.expo/',
    '**/dist/',
    '**/coverage/',
    'app/android/',
    'app/ios/',
    'app/src/db/migrations/',
    'app/expo-env.d.ts',
  ]),
  expoConfig,
  {
    settings: {
      'import/resolver': {
        typescript: {
          project: ['app/tsconfig.json', 'proxy/tsconfig.json', 'scripts/tsconfig.json'],
        },
      },
    },
  },
  {
    // The domain layer is pure TypeScript: no React, React Native, Expo, database or other layers.
    files: ['app/src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'react',
                'react-*',
                'expo',
                'expo-*',
                '@expo/*',
                'drizzle-orm',
                'drizzle-orm/*',
                'better-sqlite3',
                '@/db/*',
                '@/services/*',
                '@/integrations/*',
                '@/ui/*',
                '@/app/*',
              ],
              message: 'src/domain must stay pure TypeScript (see CLAUDE.md).',
            },
          ],
        },
      ],
    },
  },
  prettierConfig,
]);
