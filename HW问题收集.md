## HW 问题收集

列举在HW 1、HW1.1过程里，你所遇到的2~3个通过自己学习已经解决的问题，和2~3个尚未解决的问题与挑战

### 已解决

1. 为什么直接修改 Game / Sudoku 内部状态后，Svelte 界面不一定会刷新？为什么 Game.getSudoku() 不能直接返回内部真实对象？
   1. **上下文**：在 `src/node_modules/@sudoku/stores/history.js` 里，即使 `currentGame.guess(...)` 已经执行了，后面仍然要把最新盘面同步回 `userGrid`；同时在 `src/domain/game.js` 中，`getSudoku()` 返回的是 clone，而不是内部真实的 `currentSudoku`。
   2. **解决手段**：结合 CA 的解释，理解到普通对象变化不会自动触发 Svelte 更新，必须通过 store 更新界面；同时如果外部直接拿到内部对象并修改，就会绕过 `Game` 的边界，Undo / Redo 也可能失效。

2. 为什么使用 history 存快照？
   1. **上下文**：在 `src/domain/game.js` 中，`undoStack` 和 `redoStack` 存的是 `Sudoku` 的快照，而不是只记录一步操作。
   2. **解决手段**：结合 CA 的解释和与上一次实验的更改部分，理解到如果只保存引用或者直接改当前对象，历史状态会被污染；存快照可以保证每一步都对应一个独立状态。

3. 为什么当前实现会保留冲突高亮，而不是直接把界面里的错误状态全部禁止掉？
   1. **上下文**：界面中仍然保留了 `invalidCells` 和 `conflictingNumber` 这种冲突高亮路径，说明至少在界面表达上，错误状态本身也是一个需要被展示的内容。
   2. **解决手段**：结合 CA 的解释和review，理解到有些数独交互不是“完全禁止错误输入”，而是“允许输入，再通过高亮提示错误”，这样用户的尝试过程也能被保留下来。

### 未解决

1. 当前这个 repo 里，领域规则和界面交互语义到底应该怎样统一？
   1. **上下文**：`Sudoku.guess()` 目前会拒绝冲突输入，但界面又保留了 `invalidCells` 和冲突高亮逻辑。这说明领域层和现有 UI 的交互语义还没有完全统一。
   2. **尝试解决手段**：重新看了 `src/domain/sudoku.js`、`src/node_modules/@sudoku/stores/history.js` 和 `src/node_modules/@sudoku/stores/grid.js`，但目前还没完全确定这个作业里更合理的业务语义应该是哪一种。

2. 现在的接入方式算“真正单一事实源”吗？
   1. **上下文**：开始游戏时还是先写 `grid`，棋盘渲染和键盘禁用等逻辑也还会同时依赖 `grid`、`userGrid`、`currentGame`。这说明虽然领域对象已经接入流程，但 `grid`、`userGrid`、`currentGame` 三套状态仍然同时存在。
   2. **尝试解决手段**：重新对照了 `src/node_modules/@sudoku/game.js`、`src/node_modules/@sudoku/stores/history.js`、`src/components/Board/index.svelte`、`src/node_modules/@sudoku/stores/keyboard.js` 这些文件，但目前还没完全理顺应该怎样继续收敛状态，才能真正只保留一套核心模型。

3. 哪些面向 UI 的职责应该继续留在 store 里，哪些应该进一步收进 Game？
   1. **上下文**：`invalidCells`、胜负判定、提示这些逻辑目前仍然分散在 `history.js`、`grid.js`、`game.js` 等多个 store 中，这说明 `Game` 还没有成为完整的应用服务入口。
   2. **尝试解决手段**：看了 `src/domain/game.js`、`src/node_modules/@sudoku/stores/history.js` 和 `src/node_modules/@sudoku/stores/game.js` 的职责分布，但目前还没完全想清楚哪些逻辑应该继续留在 store，哪些应该进一步收进 `Game`。
