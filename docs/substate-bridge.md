# SubstateBridge 设计说明

## 命名

建议接口名直接用 `SubstateBridge`。

理由：

- 比 `PageSubstateAdapter` 短很多
- 还能保留“桥接层”的意思
- 不会和 `render`、`translation` 这些词撞语义

如果你想再短一点，也可以考虑：

- `SubBridge`
- `StateBridge`

但我更推荐 `SubstateBridge`，因为它还保留了“子状态”这个关键信息。

## 作用

这个接口负责把“子状态机行为”桥接到 DOM 和 classList：

- `expand()`
- `collapse()`
- 页面专属状态方法，比如：
  - `seeking()`
  - `thinking()`
  - `generating()`
  - `dragging()`
  - `downloading()`
  - `idlePanel()`
  - `mirroring()`

核心原则是：

- 全局鼠标处理只做分发
- 具体状态切换封装在各页面自己的桥接层里
- 每个特殊状态都用自己的方法名，不再混在全局函数里

## 页面示例

- `TimeSubstateBridge`
- `LyricSubstateBridge`
- `AgentSubstateBridge`
- `SadbSubstateBridge`
- `EmailSubstateBridge`
- `DownloaderSubstateBridge`

## 你这个需求的核心表达

一句话概括就是：

“子状态机不直接暴露给全局事件层，而是通过一个更小的桥接接口，把 `expand / collapse / seeking` 这类动作封装成页面自己的方法。”
