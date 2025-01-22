import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import rollupNodePolyFill from 'rollup-plugin-polyfill-node';
import inject from '@rollup/plugin-inject';

export default defineConfig({
  plugins: [
    react(),
    wasm(),
    topLevelAwait(),
    rollupNodePolyFill(),
    inject({
      Buffer: ['buffer', 'Buffer'],
      process: 'process',
    }),
  ],
  resolve: {
    alias: {
      buffer: 'buffer/',
      crypto: 'crypto-browserify',
      stream: 'stream-browserify',
      util: 'util/',
      assert: 'assert/',
      process: 'process/browser',
      events: 'events/',
      path: 'path-browserify',
    }
  },
  define: {
    'process.env': {},
    global: 'window',
  },
  build: {
    target: 'esnext',
    commonjsOptions: {
      transformMixedEsModules: true
    },
    rollupOptions: {
      plugins: [rollupNodePolyFill()]
    }
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis'
      }
    },
    include: [
      'buffer',
      'process',
      'util',
      'stream',
      'crypto',
      'events',
      'assert'
    ]
  }
});