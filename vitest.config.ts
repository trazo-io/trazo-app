import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';

export default defineConfig({
  // 🔴 2026-08-19: this config previously listed only `react()`. Because a vitest.config.ts
  // REPLACES vite.config.ts rather than extending it, the app's own resolution setup —
  // notably `vite-tsconfig-paths`, which is what makes the codebase's bare specifiers
  // resolve — was absent under test. Modules it could not resolve fell through to Node,
  // whose ESM resolver rejects a directory import, so `import ... from '../../config'`
  // (a directory with an index.ts) threw ERR_UNSUPPORTED_DIR_IMPORT and took out every test
  // touching the auth / product / history / review / user API slices: 33 tests across 9
  // files, including all of AppSignUp and ConsumerSignIn — the two flows a pilot farmer
  // meets first.
  plugins: [react(), tsconfigPaths()],
  test: {
    globals: true,
    // 🔴 2026-08-20: the suite ran with no TZ pin, and CI runners are UTC. Every assertion
    // about a date rendered in the viewer's timezone therefore passed VACUOUSLY — including
    // the one date test in the repo, which additionally used a noon timestamp and a regex
    // that accepted both candidate days, so it could not fail in any zone.
    //
    // America/Los_Angeles is the zone the ICP actually farms in (UTC-7/-8), and it is west of
    // UTC, which is the direction that exposes the "midnight UTC renders as yesterday" class.
    env: { TZ: 'America/Los_Angeles' },
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/test/', '**/*.d.ts', '**/*.config.*', 'dist/', 'build/'],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        }
      }
    }
  },
  resolve: {
    // Array form, not the object form: alias keys are matched as PREFIXES, so a single
    // `config` entry cannot distinguish the bare specifier `from 'config'` (which must land
    // on the barrel file) from `from 'config/events/enums'` (which must land on the
    // directory). Ordered — the exact match has to come first.
    //
    // 🔴 2026-08-19: `config` resolved to the DIRECTORY, and directory imports are not
    // resolvable as ES modules, so every test touching authApi/productApi/historyApi died at
    // import time with ERR_UNSUPPORTED_DIR_IMPORT. That killed 33 tests across 9 files —
    // including all 16 AppSignUp and all 15 ConsumerSignIn tests, i.e. the signup and sign-in
    // flows a pilot farmer hits first were covered by tests that had not run in some time.
    alias: [
      { find: /^config$/, replacement: path.resolve(__dirname, './src/config/index.ts') },
      { find: /^src\/config$/, replacement: path.resolve(__dirname, './src/config/index.ts') },
      { find: '@', replacement: path.resolve(__dirname, './src') },
      // vite.config.ts aliases bare `src/...` imports, which app code uses widely
      // (e.g. `import { useFormFields } from 'src/hooks/useFormFields'`). Without the
      // same alias here, any test that mounts a real view fails to resolve at import
      // time — which is why no test had ever rendered a form component.
      { find: 'src', replacement: path.resolve(__dirname, './src') },
      { find: 'components', replacement: path.resolve(__dirname, './src/components') },
      { find: 'views', replacement: path.resolve(__dirname, './src/views') },
      { find: 'utils', replacement: path.resolve(__dirname, './src/utils') },
      { find: 'hooks', replacement: path.resolve(__dirname, './src/hooks') },
      { find: 'store', replacement: path.resolve(__dirname, './src/store') },
      { find: 'config', replacement: path.resolve(__dirname, './src/config') },
      // `theme/...` is a real app specifier (src/index.tsx imports `theme/theme`) that this
      // list was missing. It only surfaced when a component started importing a theme module
      // — `StandardComponents` -> `theme/components/alert` — because until then nothing under
      // test crossed that boundary. Same class as the `src` gap documented above.
      { find: 'theme', replacement: path.resolve(__dirname, './src/theme') }
    ]
  }
});
