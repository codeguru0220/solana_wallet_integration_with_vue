import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
const path = require('path')

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  define: {
    'process.env': {}
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'solana-wallets-vue',
    },
    rollupOptions: {
      external: ['vue-demi', '@solana/web3.js', '@solana/wallet-adapter-base'],
      output: {
        exports: 'named',
        globals: {
          // vue: 'Vue',
          'vue-demi': 'VueDemi',
          '@solana/web3.js': 'SolanaWeb3',
          '@solana/wallet-adapter-base': 'SolanaWalletAdapterBase',
        },
      },
    },
  },
  optimizeDeps: {
    exclude: ['vue-demi'],
  },
})
