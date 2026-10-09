import { defineConfig } from 'vite';
import { splitVendorChunkPlugin } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import tsconfigPaths from 'vite-tsconfig-paths';

// Conditionally import visualizer plugin only if available
let visualizer: any = null;
try {
  const visualizerModule = require('rollup-plugin-visualizer');
  visualizer = visualizerModule.visualizer;
  console.log('rollup-plugin-visualizer loaded successfully - bundle analysis enabled');
} catch (e) {
  // visualizer not available - this is expected in production builds
  console.log(
    'rollup-plugin-visualizer not available, skipping bundle analysis (expected in production)'
  );
}

// Check if vitest is available
let vitestConfig = {};
try {
  // Try to import vitest config - this will fail in production builds where vitest is not installed
  const { defineConfig: defineVitestConfig } = require('vitest/config');
  vitestConfig = {
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/setupTests.ts',
      css: true,
      reporters: ['verbose'],
      coverage: {
        provider: 'istanbul',
        reporter: ['text', 'json', 'html'],
        include: ['src/**/*'],
        exclude: []
      }
    }
  };
  console.log('vitest configuration loaded successfully - testing enabled');
} catch (e) {
  // vitest not available - this is expected in production builds
  console.log('vitest not available, skipping test configuration (expected in production)');
}

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  // Worktrees symlink node_modules to the main checkout, so the default
  // node_modules/.vite cache is shared between dev servers. Two servers then
  // overwrite each other's pre-bundled chunks and the page loads two copies of
  // React ("Cannot read properties of null (reading 'useRef')"). Keep the cache
  // per checkout.
  cacheDir: '.vite',
  plugins: [
    react({
      // Ensure proper emotion configuration for Chakra UI
      jsxImportSource: '@emotion/react',
      babel: {
        plugins: ['@emotion/babel-plugin']
      }
    }),
    tsconfigPaths(),
    // Note: splitVendorChunkPlugin() disabled due to manual chunks configuration below
    // Only add visualizer plugin if it's available
    ...(visualizer
      ? [
          visualizer({
            open: false,
            gzipSize: true,
            brotliSize: true,
            filename: 'dist/bundle-analysis.html'
          })
        ]
      : [])
  ],
  ...vitestConfig,
  optimizeDeps: {
    exclude: ['date-fns'],
    include: [
      // Pre-bundle critical dependencies for faster mobile loading
      'react',
      'react-dom',
      '@chakra-ui/react',
      '@emotion/react',
      '@emotion/styled',
      '@reduxjs/toolkit/query/react',
      // Dashboard-specific optimizations
      'react-icons/fa',
      'react-icons/md'
    ]
  },
  resolve: {
    alias: {
      src: resolve(__dirname, 'src')
    }
  },
  css: {
    devSourcemap: true,
    // Ensure proper CSS-in-JS processing
    preprocessorOptions: {
      scss: {
        // Remove invalid JS import - styles.js should be imported in components directly
        // additionalData: `@import "src/theme/styles.js";`
      }
    }
  },
  build: {
    // Enhanced mobile performance optimization - updated for import.meta support
    target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari13.1'],
    chunkSizeWarningLimit: 200, // More aggressive limit for mobile (was 300KB)
    reportCompressedSize: false, // Faster builds
    cssCodeSplit: true, // Enable CSS code splitting for better caching
    // Mobile-specific optimizations
    modulePreload: {
      polyfill: false // Remove module preload polyfill for smaller bundle
    },
    rollupOptions: {
      output: {
        // Aggressive chunking strategy for 3G networks
        manualChunks: {
          // Core React bundle - loaded first
          react: ['react', 'react-dom'],
          // UI framework - loaded for dashboard
          chakra: ['@chakra-ui/react', '@emotion/react', '@emotion/styled'],
          // Charts - loaded only when needed
          charts: ['recharts'],
          // Redux/API - loaded for authenticated routes
          redux: ['@reduxjs/toolkit', 'react-redux'],
          // Forms - loaded for form-heavy pages
          forms: ['react-hook-form'],
          // Icons - loaded progressively
          icons: ['react-icons'],
          // Utils - shared utilities
          utils: ['date-fns']
        }
      }
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        passes: 2,
        pure_funcs: ['console.log', 'console.info', 'console.debug']
      },
      format: {
        comments: false
      }
    },
    sourcemap: false, // No sourcemaps in production for smaller size
    // Mobile-optimized asset handling
    assetsInlineLimit: 2048, // Smaller inline limit for mobile (2KB vs 4KB)
    // Enable asset optimization
    assetsDir: 'assets',
    // Optimize asset file names for caching
    assetFileNames: (assetInfo) => {
      const info = assetInfo.name.split('.');
      const ext = info[info.length - 1];
      if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
        return `img/[name]-[hash][extname]`;
      }
      if (/woff2?|eot|ttf|otf/i.test(ext)) {
        return `fonts/[name]-[hash][extname]`;
      }
      return `assets/[name]-[hash][extname]`;
    }
  },
  server: {
    port: 3000,
    open: true,
    // Proxy API requests through Vite so cookies stay on the same origin
    // This avoids cross-origin cookie issues with .localhost in Chromium
    proxy: {
      '/api': {
        /*
         * Overridable so a second backend can be run beside the default one. This repo routinely
         * has several worktrees checked out at once, and until this was a variable the only way to
         * point the app at a branch's own backend was to edit this shared file, which is how an
         * unrelated session ends up committing somebody else's proxy target. The default is
         * unchanged, so nothing about the ordinary `npm run start` moves.
         *
         * NOTE: a non-default PORT for Vite itself is a different matter. `CSRF_TRUSTED_ORIGINS`
         * in `backend/settings/dev.py` enumerates 3000, 3001 and 4173, so serving on any other
         * port makes every POST fail with "Origin checking failed" while GETs keep working, which
         * reads like a broken login rather than a config gap.
         */
        target: process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:8000',
        changeOrigin: true
      }
    }
  },
  // Enhanced mobile performance settings
  define: {
    __PERFORMANCE_METRICS__: true,
    __MOBILE_OPTIMIZATIONS__: true
    // __DEV__ define removed (2026-06): nothing in src/ referenced it, and
    // the token replacement corrupted @chakra-ui/utils' ESM source —
    // `import { __DEV__ } from ...` became `import { false }`, a rollup
    // parse error that broke `npm run build`.
  },
  // Mobile-specific esbuild optimizations
  esbuild: {
    // More aggressive dead code elimination
    treeShaking: true,
    // Remove unused imports
    ignoreAnnotations: false,
    // Optimize for mobile devices
    target: 'es2020',
    // Remove development helpers in production
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
    // Minify identifiers for smaller bundle
    minifyIdentifiers: process.env.NODE_ENV === 'production',
    minifyWhitespace: process.env.NODE_ENV === 'production',
    minifySyntax: process.env.NODE_ENV === 'production'
  }
});

// Helper function to check if a module exists
function checkModuleExists(moduleName: string): boolean {
  try {
    require.resolve(moduleName);
    return true;
  } catch (e) {
    return false;
  }
}
