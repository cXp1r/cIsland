# 前端目录说明

这份文档先做目录级别的入口，目标是让第一次参与这个项目的人，能先看懂 TS 代码怎么分层、怎么找文件、哪里放状态机和复用代码。

## 先看什么

- `src/ts/index/pages/`：页面逻辑，主结构是状态机
- `src/ts/index/overlays/`：浮层逻辑，主结构是优先级管理
- `src/ts/index/shell/`：壳层，负责整体容器和全局交互
- `src/ts/index/shared/`：跨页面、跨浮层的通用代码
- `src/ts/index/utils/`：偏通用的工具函数

## 代码块怎么分

- `index.ts`：入口装配
- `dom.ts`：只放 DOM 查询和元素导出
- `renderer.ts`：只放渲染和尺寸同步
- `controller.ts`：只放事件、调度、状态切换
- `machine.ts`：只放状态机定义和状态转移
- `model.ts`：只放数据结构和请求/响应类型
- `events.ts`：只放通用事件处理

## 后面会补的内容

- `pages` 目录里的状态机是怎么组织的
- `overlays` 目录里的优先级系统是怎么运作的
- 哪些结构是项目里应该复用的
- PR 里新增文件时应该优先放在哪里
