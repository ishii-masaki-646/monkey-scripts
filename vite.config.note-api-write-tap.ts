import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/note-api-write-tap.ts',
      userscript: {
        name: 'note-api-write-tap',
        namespace: 'https://github.com/ishii-masaki-646/monkey-scripts',
        match: ['https://note.com/*', 'https://editor.note.com/*'],
        version: '0.1.0',
        description: 'note の書込系 API (POST/PUT/PATCH/DELETE) を url/method/headers/body 付きで localStorage に蓄積する観察 hook',
        author: 'ishii-masaki-646',
        'run-at': 'document-start',
        grant: 'none',
        downloadURL: 'https://raw.githubusercontent.com/ishii-masaki-646/monkey-scripts/main/dist/note-api-write-tap.user.js',
        updateURL: 'https://raw.githubusercontent.com/ishii-masaki-646/monkey-scripts/main/dist/note-api-write-tap.user.js',
      },
      build: {
        fileName: 'note-api-write-tap.user.js',
      },
    }),
  ],
  build: {
    // build を直列実行する関係上、後発のビルドは dist を空にしないこと
    emptyOutDir: false,
  },
});
