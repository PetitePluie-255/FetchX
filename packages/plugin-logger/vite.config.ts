import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
      include: ['src/**/*'],
      compilerOptions: {
        declarationMap: false,
      },
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'FetchXLogger',
      formats: ['es', 'cjs'],
      fileName: format => `index.${format === 'es' ? 'js' : 'cjs'}`,
    },
    sourcemap: false,
    minify: 'oxc',
    rolldownOptions: {
      external: ['@petite-pluie/fetchx'],
      output: {
        exports: 'named',
        minify: {
          compress: {
            dropConsole: false,
            dropDebugger: true,
          },
        },
      },
    },
  },
});
