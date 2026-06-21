# PageSubstateAdapter 设计说明

## 目标

给每个手动页面的子状态机补一个“桥接层”，专门负责两件事：

1. 把子状态切换同步到 `classList`
2. 把某个具体子状态的切换动作封装成独立方法

这样以后，`capsule-interaction.ts` 这类全局鼠标处理函数里，只保留“判断当前页面 + 调用对应方法”的逻辑，不再直接拼接 class，也不再手写每个页面的特殊转移规则。

## 命名建议

接口建议命名为 `PageSubstateAdapter`。

原因：

- `render` 不合适，因为这里不只是“画 UI”，还会修改状态和触发转移
- `translation` 不合适，语义太偏“翻译”，和状态机不贴
- `Adapter` 比较准确，表示它负责把“状态机语义”适配到“DOM class / 交互行为”

如果后面想更强调“协调器”的味道，也可以改成 `PageSubstateController`，但当前更推荐 `Adapter`。

## 职责边界

### 这个接口负责

- `expand()`：进入该页面的展开态
- `collapse()`：退出该页面的展开态
- 页面特定状态切换，例如：
  - `seeking()`
  - `thinking()`
  - `generating()`
  - `dragging()`
  - `downloading()`
  - `idlePanel()`
  - `mirroring()`
- 在方法内部完成：
  - `classList` 增删
  - 当前子状态记录
  - 必要的副作用同步

### 这个接口不负责

- 全局页面切换决策
- 鼠标事件是否命中某个按钮
- 动画时机判断
- 后端 `invoke(...)` 的具体调用位置
- 纯展示组件渲染模板

## 设计原则

### 1. 一个页面一个适配器

每个手动页面都应该有自己的子状态适配器。

例如：

- `TimePageSubstateAdapter`
- `LyricPageSubstateAdapter`
- `AgentPageSubstateAdapter`
- `SadbPageSubstateAdapter`
- `EmailPageSubstateAdapter`
- `DownloaderPageSubstateAdapter`

### 2. 只暴露明确的转移方法

不要再写这种“全局函数里判断一堆 if/else 再改 class”的模式。

应该变成：

- 全局事件层只负责识别“用户想做什么”
- 子状态适配器负责执行“这个页面应该怎么变”

### 3. 特殊状态用状态名命名

比如歌词页的 `seeking`，就应该直接叫 `seeking()`，不要起成：

- `renderSeeking`
- `translationSeeking`
- `updateProgressSeeking`

因为这里的动作不是单纯渲染，而是“进入 seeking 这个子状态”。

## 接口草案

```ts
export interface PageSubstateAdapter {
  readonly kind: PageSubstateKind;

  expand(): void;
  collapse(): void;

  // 可选：每个页面按需扩展
  seeking?(): void;
  thinking?(): void;
  generating?(): void;
  dragging?(): void;
  downloading?(): void;
  idlePanel?(): void;
  mirroring?(): void;
}
```

## 方法语义

### `expand()`

表示当前页面进入展开态。

典型工作：

- 给 `capsule.classList` 加上页面对应的展开 class
- 更新当前子状态机
- 如果需要，补充展开时的 UI 初始化

### `collapse()`

表示当前页面退出展开态，回到收起态。

典型工作：

- 移除页面对应的展开 class
- 回写当前子状态
- 清理展开态遗留的临时 class

### 页面特定状态方法

比如歌词页的 `seeking()`：

- 加上 `seeking` 对应的 class
- 让子状态机进入 `Seeking`
- 由这个方法负责和 `classList` 对接

再比如 Agent 页的 `thinking()` / `generating()`：

- 这些方法只应该由 Agent 自己实现
- 不要让全局事件层知道它们怎么切 class

## 和现有代码的关系

### `page-substates.ts`

这里负责“状态定义”：

- 这个页面有哪些子状态
- 初始状态是什么

### `page-submachines.ts`

这里负责“状态机实例”和“当前状态快照”：

- 保存当前页的子状态
- 保存当前页的 class 快照
- 恢复 / 同步页面状态

### 新的 `PageSubstateAdapter`

这里负责“动作封装”：

- 把 `expand / collapse / seeking / ...` 这些动作对外暴露出来
- 内部直接操作 `classList` 和子状态机

### `capsule-interaction.ts`

这里最终要变成“调度层”：

- 判断当前页面
- 判断点击位置
- 调用对应适配器的方法

不再直接写页面级的 class 操作细节。

## 推荐的调用方式

### 时间页

- `expand()`
- `collapse()`

### 歌词页

- `expand()`
- `collapse()`
- `seeking()`

### Agent 页

- `expand()`
- `collapse()`
- `thinking()`
- `generating()`

### SADB 页

- `expand()`
- `collapse()`
- `idlePanel()`
- `mirroring()`

### 邮件页

- `expand()`
- `collapse()`
- `dragging()`

### 下载器页

- `expand()`
- `collapse()`
- `downloading()`

## 期望结果

改完以后，这套逻辑应该长这样：

- 全局层只做“判断和派发”
- 子状态适配器只做“状态切换与 class 对接”
- 每个特殊状态都有自己独立的方法
- 不再在鼠标处理函数里堆页面专用分支

这就是这层接口的核心价值。
