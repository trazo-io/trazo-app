import { defineConfig } from 'vite';
import { splitVendorChunkPlugin } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import tsconfigPaths from 'vite-tsconfig-paths';

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
} catch (e) {
  // vitest not available - this is expected in production builds
  console.log('Vitest not available, skipping test configuration');
}

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  plugins: [
    react({
      // Ensure proper emotion configuration for Chakra UI
      jsxImportSource: '@emotion/react',
      babel: {
        plugins: ['@emotion/babel-plugin']
      }
    }),
    tsconfigPaths(),
    // Temporarily remove splitVendorChunkPlugin to fix initialization issue
    // splitVendorChunkPlugin(),
    visualizer({
      open: false,
      gzipSize: true,
      brotliSize: true,
      filename: 'dist/bundle-analysis.html'
    })
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
      '@reduxjs/toolkit/query/react'
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
        additionalData: `@import "src/theme/styles.js";`
      }
    }
  },
  build: {
    // Enhanced mobile performance optimization - updated for import.meta support
    target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari13.1'],
    chunkSizeWarningLimit: 500, // Stricter limit for mobile
    reportCompressedSize: false, // Faster builds
    cssCodeSplit: true, // Enable CSS code splitting for better caching
    rollupOptions: {
      output: {
        // Simplified chunking strategy to avoid initialization conflicts
        manualChunks: {
          // Group vendor libraries together to avoid circular dependencies
          vendor: ['react', 'react-dom', '@chakra-ui/react', '@emotion/react', '@emotion/styled'],
          recharts: ['recharts']
        }
      }
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        passes: 2, // Multiple passes for better optimization
        pure_funcs: ['console.log'], // Remove console.log calls
        unsafe_arrows: true, // Convert arrow functions for smaller size
        unsafe_methods: true // Optimize method calls
      },
      mangle: {
        properties: {
          regex: /^_/ // Mangle private properties
        }
      },
      format: {
        comments: false // Remove all comments
      }
    },
    sourcemap: false, // No sourcemaps in production for smaller size
    // Image optimization settings
    assetsInlineLimit: 4096 // Inline small assets (4KB)
  },
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        }
      }
    }
  },
  // Add performance measurements
  define: {
    __PERFORMANCE_METRICS__: true
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
