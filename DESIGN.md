DESIGN

A. 领域对象如何被消费

1. View 层直接消费的是什么？

我的 View 层直接消费的不是 Game 或 Sudoku 本体，而是一个面向 Svelte 的 store 和 adapter。

核心桥接层是：

src/node_modules/@sudoku/stores/history.js

它在内部持有当前 Game，并向外暴露两类内容：

1）可被 Svelte 订阅的响应式状态
2）可被 UI 事件直接调用的方法

因此，View 层直接消费的是：

1）userGrid
2）historyState
3）invalidCells
4）gameWon
5）gamePaused
6）以及 history.js 暴露的 guess、undo、redo、applyHint

而不是直接消费可变的 Game 或 Sudoku 对象。

2. View 层拿到的数据是什么？

View 层拿到的主要数据包括：

1）userGrid：当前需要渲染的盘面
2）invalidCells：冲突高亮所需的数据
3）historyState.canUndo：是否可以撤销
4）historyState.canRedo：是否可以重做
5）gameWon：当前是否获胜
6）gamePaused：当前是否暂停
7）cursor、hints、notes 等界面状态

例如：

1）棋盘组件 src/components/Board/index.svelte 渲染的是 userGrid
2）Undo 和 Redo 按钮依赖 historyState.canUndo 和 historyState.canRedo
3）获胜判断来自 src/node_modules/@sudoku/stores/game.js 中的 gameWon

所以，UI 中看到的状态并不是直接读取 Game 内部字段，而是读取领域对象同步出来的响应式视图状态。

3. 用户操作如何进入领域对象？

1）开始一局游戏

开始新游戏或加载题目时，原始 puzzle 会先进入 grid store。

然后 history.js 订阅 grid，在题面变化时重新创建：

Sudoku
Game

具体逻辑在：

src/node_modules/@sudoku/stores/history.js

也就是说，真实游戏会话是通过领域对象建立的。

2）用户输入如何进入 guess

在：

src/components/Controls/Keyboard.svelte

键盘输入不会再直接修改旧二维数组，而是调用 guess。

然后调用链是：

Keyboard.svelte 到 history.js 到 Game.guess 到 Sudoku.guess

所以用户输入现在必须通过领域对象完成。

3）Undo 和 Redo 如何进入 Game

在：

src/components/Controls/ActionBar/Actions.svelte

Undo 和 Redo 按钮调用的是：

undo
redo

这两个方法由 history.js 暴露，内部再调用：

Game.undo
Game.redo

因此，界面中的撤销和重做已经真正接入 Game 的历史逻辑。

4. 领域对象变化后，Svelte 为什么会更新？

因为我的方案不是让 Svelte 直接观察 Game 或 Sudoku 的内部字段，而是通过 adapter 把领域对象的变化转换成 store 更新。

具体做法是：

1）Game 或 Sudoku 状态变化
2）history.js 读取最新盘面，也就是 currentGame.getSudoku().getGrid()
3）history.js 把这个结果写回 userGrid.replace
4）同时更新内部 version store，使 historyState 重新计算

因此，Svelte 刷新的原因是：

1）组件订阅的是 store
2）adapter 在领域对象变化后主动更新 store

而不是因为 Svelte 会自动追踪普通对象内部字段。

B. 响应式机制说明

1. 你依赖的是 store、响应式语句、重新赋值，还是其他机制？

我的方案主要依赖以下机制：

1）Svelte 的 writable 和 derived store
2）组件中的 store 订阅语法
3）adapter 中对 store 的显式更新
4）必要时用一个 version store 触发派生状态重新计算

我没有让 Game 或 Sudoku 本身成为响应式对象，也没有依赖 Svelte 5 的 runes。

2. 哪些数据是响应式暴露给 UI 的？

响应式暴露给 UI 的主要数据有：

1）userGrid
2）historyState
3）invalidCells
4）gameWon
5）gamePaused
6）cursor
7）hints
8）notes

这些数据都可以被组件直接消费。

3. 哪些状态留在领域对象内部？

以下状态留在领域对象内部，不直接把可变引用暴露给 UI：

1）Game 当前持有的真实 Sudoku
2）Game 的 undoStack
3）Game 的 redoStack
4）Sudoku 内部的 givens
5）Sudoku 内部的当前 grid

另外，history.js 内部的 currentGame 也是 adapter 自己管理的内部状态，View 层不会直接操作它。

4. 如果不用你的方案，而是直接 mutate 内部对象，会出现什么问题？

如果不用 adapter，而是直接 mutate 内部对象，会有两个问题。

1）界面不一定会更新

Game 和 Sudoku 是普通 JavaScript 对象，Svelte 不会深度追踪它们内部字段变化。

所以像下面这种写法：

currentGame.guess(move)

如果后面没有同步到 store，UI 不一定会刷新。

2）会绕过领域对象的边界

如果组件直接改二维数组，或者直接改 Game 内部对象，就会带来：

1）Undo 和 Redo 可能失效
2）校验逻辑可能被绕过
3）固定 givens 保护可能被绕过
4）历史状态和界面状态可能不一致

所以我的方案必须通过 adapter 把领域变化和响应式刷新绑定在一起。

C. 改进说明

1. 相比 HW1，你改进了什么？

相比 HW1，我的改进主要有以下几点。

1）改进了 Game 对 Sudoku 的暴露方式

在 HW1 中，Game.getSudoku 可能直接暴露内部可变对象，外部代码可以绕过 Game 自己改盘面。

现在我把它改成返回 clone，这样真实会话状态不会被外部直接破坏。

2）改进了 Sudoku 的建模

HW1 中更接近一个二维数字数组。

现在 Sudoku 同时持有：

givens
当前 grid

这样它能够表达哪些格子是题面固定值，哪些格子是玩家输入。

3）改进了 move 校验

现在 Sudoku.guess 会校验：

1）坐标是否合法
2）数值是否合法
3）是否在修改 givens
4）是否违反行、列、九宫格规则

因此，Sudoku 更像一个真正的领域对象，而不是只会改数组的包装器。

4）改进了序列化与恢复方式

现在 Sudoku.toJSON 不只保存当前盘面，还保存 givens 和 grid。

同时 createGameFromJSON 不再复制整套 Game 实现，而是走统一的状态构造路径，避免新建游戏和恢复游戏的逻辑分叉。

5）真正把领域对象接入了 Svelte

这是本次最重要的改进。

在 HW1 中，领域对象可能只在测试里有用；现在真实界面的主要操作，也就是输入、Undo、Redo、Hint，都通过 history.js 进入 Game 和 Sudoku。

2. 为什么 HW1 中的做法不足以支撑真实接入？

因为 HW1 的主要问题不是没有领域对象，而是领域对象没有真正成为 UI 的入口。

如果组件仍然直接操作旧二维数组，那么：

1）Game 和 Sudoku 只是在旁边存在
2）测试里能用，但真实页面里不一定在用
3）Undo、Redo、校验、序列化边界都可能被 UI 绕过

这就不满足本次作业真实接入的要求。

3. 你的新设计有哪些 trade-off？

我的设计有明显优点，但也有 trade-off。

优点：

1）领域层仍然独立，不依赖 Svelte
2）真实 UI 现在确实由领域对象驱动
3）Undo 和 Redo 集中在 Game
4）校验逻辑集中在 Sudoku
5）响应式边界清晰，便于解释和维护

代价：

1）需要额外增加一层 adapter，也就是 history.js
2）领域状态与视图状态之间需要做一次同步
3）某些偏 UI 的派生状态，例如 invalidCells、gameWon，仍然放在 store 层，而不是完全并入领域层

我认为这个 trade-off 是合理的，因为本次作业的重点不是把领域对象本身做成响应式框架，而是让领域对象在 Svelte 3 工程里真正进入实际流程。对当前项目来说，Store Adapter 是最清楚、也最稳定的接入方式。