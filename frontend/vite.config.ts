import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html'),
        dino: resolve(__dirname, 'dino.html'),
        stacker: resolve(__dirname, 'stacker.html'),
        snake: resolve(__dirname, 'snake.html'),
        memory: resolve(__dirname, 'memory.html'),
        wordchase: resolve(__dirname, 'wordchase.html'),
        minesweeper: resolve(__dirname, 'minesweeper.html'),
        clicker: resolve(__dirname, 'clicker.html'),
        tictactoe: resolve(__dirname, 'tictactoe.html'),
        pong: resolve(__dirname, 'pong.html'),
        ludo: resolve(__dirname, 'ludo.html'),
        snakeladder: resolve(__dirname, 'snakeladder.html'),
        nutsbolts: resolve(__dirname, 'nutsbolts.html'),
        sudoku: resolve(__dirname, 'sudoku.html'),
      }
    }
  }
})
