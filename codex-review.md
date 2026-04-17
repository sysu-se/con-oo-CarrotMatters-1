# con-oo-CarrotMatters-1 - Review

## Review 结论

领域对象本身有一定封装、校验和序列化基础，输入与撤销/重做也已经部分接入到 Svelte；但整体仍属于“半接入”状态：Game/Sudoku 还不是前端游戏流程的单一事实源，而且当前领域规则把玩家输入限制为“只能填合法值”，与现有数独界面的业务表达不一致。

## 总体评价

| 维度 | 评价 |
| --- | --- |
| OOP | fair |
| JS Convention | fair |
| Sudoku Business | poor |
| OOD | fair |

## 缺点

### 1. 领域规则禁止冲突输入，和当前数独界面的业务语义相冲突

- 严重程度：core
- 位置：src/domain/sudoku.js:119-132; src/node_modules/@sudoku/stores/history.js:30-37; src/node_modules/@sudoku/stores/grid.js:92-134; src/components/Board/index.svelte:51
- 原因：`Sudoku.guess()` 在发现行/列/宫冲突时直接抛错，`history.guess()` 又把异常吞掉并返回 `false`。但界面仍保留了 `invalidCells` 与 `conflictingNumber` 的高亮路径，说明现有产品语义是“允许填入，再高亮冲突”。接入后玩家无法制造冲突状态，相关 UI 逻辑基本失效，业务建模与真实交互不一致。

### 2. Game/Sudoku 没有成为 Svelte 流程中的单一事实源

- 严重程度：core
- 位置：src/node_modules/@sudoku/game.js:13-34; src/node_modules/@sudoku/stores/history.js:19-23; src/components/Board/index.svelte:4,48-51; src/node_modules/@sudoku/stores/keyboard.js:6-10
- 原因：开始新游戏/载入题目仍然先写旧的 `grid` store，再由 `history.js` 订阅后重建 `currentGame`；棋盘渲染时也同时依赖 `$grid` 和 `$userGrid`，只读格判断、用户数字样式、键盘禁用都继续读取旧 store，而不是从 `Sudoku` 暴露的 givens / view state 获取。这样形成了 `grid`、`userGrid`、`currentGame` 三套状态，领域对象是被动同步者而不是核心模型。

### 3. 面向 UI 的游戏职责仍然分散在多个 store，Game 的聚合度不够

- 严重程度：major
- 位置：src/domain/game.js:24-69; src/node_modules/@sudoku/stores/history.js:50-70,80-83; src/node_modules/@sudoku/stores/game.js:7-19
- 原因：`Game` 目前只封装了 `guess/undo/redo` 和历史，但提示、胜负判定、冲突派生状态都在领域对象之外实现。结果是 UI 相关业务规则散落在 `history.js`、`grid.js`、`game.js` 等多个 store 中，`Game` 没有成为真正的应用服务入口，OOD 上职责边界仍然偏碎。

### 4. 适配层使用裸 `catch` 吞掉异常，不符合良好的 JS 诊断习惯

- 严重程度：minor
- 位置：src/node_modules/@sudoku/stores/history.js:30-37,57-69
- 原因：`guess()` 和 `applyHint()` 都无条件吞掉异常并返回布尔值，调用方拿不到失败原因，也无法区分“业务上不允许”“集成错误”“求解失败”等不同问题。这会让调试和后续演进都变困难。

## 优点

### 1. Sudoku 的输入约束和序列化不变量比较完整

- 位置：src/domain/sudoku.js:12-108
- 原因：对 grid 形状、单元值范围、givens/grid 一致性以及 JSON 结构都做了显式校验，还验证了初始局面不能自相矛盾，这让领域对象边界比直接暴露二维数组更清晰。

### 2. Undo/Redo 被收敛到 Game 内部，而不是继续散落在组件层

- 位置：src/domain/game.js:19-68
- 原因：`Game` 统一持有当前 `Sudoku`、撤销栈和重做栈，并提供 `canUndo/canRedo/toJSON`，说明作者已经把历史管理从 View 侧抽离成独立对象，这是正确的 OOP/OOD 方向。

### 3. 主要输入、撤销、重做流程已经接到了领域对象适配层

- 位置：src/components/Controls/Keyboard.svelte:10-26; src/components/Controls/ActionBar/Actions.svelte:14-32; src/node_modules/@sudoku/stores/history.js:30-48
- 原因：键盘输入不再直接改棋盘数组，而是调用 `history.guess()`；撤销/重做按钮也直接调用 `undo()/redo()`。这说明真实界面的核心交互至少已经开始消费 `Game` 的接口。

### 4. 适配层意识到了 Svelte 响应式边界，并显式把领域状态投影为可订阅状态

- 位置：src/node_modules/@sudoku/stores/history.js:13-28,80-83
- 原因：`currentGame` 本身不是 store，但 `history.js` 通过 `syncUserGrid()` 和 `version`/`derived` 把领域对象变化转成 Svelte 可消费的响应式状态，这是把非响应式领域模型接到 Svelte 3 的一个可行方向。

## 补充说明

- 本次结论严格基于静态阅读，未运行测试，也未实际启动页面验证交互。
- 按要求只审查了 `src/domain/*` 及其关联的 Svelte 接入代码；未扩展评价无关目录。
- 关于“冲突输入是否应该允许”“界面是否会正确刷新”等判断，来自代码路径推断：未通过实际点击或运行时日志验证。
- `src/node_modules/@sudoku/stores/history.js`、`src/node_modules/@sudoku/stores/grid.js`、`src/node_modules/@sudoku/game.js` 虽不在 `src/domain/*`，但它们是当前领域对象接入 Svelte 流程的关键适配层，因此纳入了本次评审。
