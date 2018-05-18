# Introduction

Awesome finance chart


## Install

```shell
npm install @dz-web/finance-chart
```

## Usage

```jsx
import FinanceChart from '@dz-web/finance-chart';
import '@dz-web/finance-chart/dist/finance-chart.css';


```


## How to build to project


### prerequisite

In order to install [node-canvas](https://www.npmjs.com/package/canvas) successfully.

If you use osx system, just following commands on below. Get more detail at [node-canvas wiki](https://github.com/Automattic/node-canvas/wiki/_pages)

```shell
brew install pkg-config
brew install pixman
brew install cairo
```

### build

```shell
npm run dist
```

### TODO

- [x] 分离主题颜色配置
- [x] 分时图支持读取金融商品当日交易时间段绘制x轴
- [ ] 实现滑动查看更多k线数据事件
- [ ] 分时当前价格指示动画
- [ ] 实现缩放事件
- [ ] 开发与示例文档

### donate

赏块披萨, 支持开发

[微信赞赏码](https://github.com/dz-web/finance-chart/issues/1)
