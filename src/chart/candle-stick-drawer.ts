import uniq from 'lodash.uniq'
import { Chart, autoResetStyle, YAxisDetail } from "./chart"
import { area } from 'd3-shape'
import { scaleLinear } from 'd3-scale'
import { drawLine, drawYAxis, drawXAxis } from '../paint-utils/index'
import { Rect } from "../graphic/primitive";
import { ChartTitle } from "./chart-title";
import { divide } from "../algorithm/divide";
import { formateDate } from "../algorithm/date";
import { trimNulls } from "../algorithm/arrays";
import { TITLE_HEIGHT, X_AXIS_HEIGHT } from '../constants/constants';
import { Point } from '../graphic/primitive';
import { Drawer } from './drawer';

export const CandleStickWhiteTheme = {
  rise: '#F55559',
  fall: '#7DCE8D',
  same: '#7DCE8D',
  titleBackground: '#F2F4F4',
  title: '#5E667F',
  gridLine: '#E7EAEB',
  yTick: '#5E667F',
  xTick: '#5E667F'
}

export const CandleStickBlackTheme = {
  rise: '#F55559',
  fall: '#7DCE8D',
  same: '#7DCE8D',
  titleBackground: '#22252B',
  title: '#AEB4BE',
  gridLine: '#282D38',
  yTick: '#AEB4BE',
  xTick: '#AEB4BE'
}

export interface CandleStickData {
  time: string;
  open: number;
  close: number;
  high: number;
  low: number;
  [key: string]: number|string
}

export interface MAIndicator {
  key: string;
  color: string;
}

export class CandleStickDrawer extends Drawer {
  static theme = CandleStickWhiteTheme
  static MAIndicators: MAIndicator[] = []

  titleDrawer: ChartTitle
  protected data: CandleStickData[] = []
  private _count: number
  constructor(chart: Chart, data: CandleStickData[] = []) {
    super(chart, data)
    this._count = chart.options.count
    this.xTickFormatter = this.xTickFormatter.bind(this)
    this.context = chart.context
    this.titleDrawer = new ChartTitle(
      this.context,
      'MA', this.MAIndicators.map(({key, color}, i) => ({
        x: i * 80 + 60,
        label: `${key.toUpperCase()}: 0`,
        color
      })),
      CandleStickDrawer.theme.titleBackground,
      CandleStickDrawer.theme.title,
      this.chart.options.resolution
    );
    this.setData(data)
  }
  public count() {
    return this._count
  }
  public setData(data: CandleStickData[]) {
    this.data = data;
    if (this.data.length > 0) {
      const keys = this.MAIndicators.map(d => d.key)
      keys.push('low', 'high')
      let minV = Number.MAX_VALUE
      let maxV = Number.MIN_VALUE
      for (let i = 0, lenI = data.length; i < lenI; ++i) {
        keys.forEach((key) => {
          const v = data[i][key] as number
          // ma data may be null, ignore it
          if (v === null) return
          if (v < minV) {
            minV = v
          } else if (v > maxV) {
            maxV = v
          }
        })
      }
      this.minValue = minV
      this.maxValue = maxV
    } else {
      this.minValue = this.chart.lastPrice
      this.maxValue = this.chart.lastPrice
    }
    
    this.resetYScale()
  }
  public resize(frame: Rect) {
    super.resize(frame)
    this.resetYScale()
  }
  public draw(){
    const { data } = this
    const { frame } = this;
    this.drawTitle(this.selectedIndex || this.data.length - 1)
    this.drawAxes();
    this.drawCandles()
    this.drawMA()
  }
  public getYAxisDetail(y: number): YAxisDetail {
    return {
      left: this.yScale.invert(y).toFixed(2)
    }
  }
  public getXAxisDetail(i: number): string {
    return this.xTickDetailFormatter(i, this.data)
  }
  get MAIndicators() {
    return Object.getPrototypeOf(this).constructor.MAIndicators as MAIndicator[]
  }
  private drawTitle(i: number) {
    const { context: ctx, frame } = this
    const d = this.data[i]
    if (this.data.length > 0) {
      this.MAIndicators.forEach(({ key }, i) => {
        const m = ((d[key] as number) || 0).toFixed(2)
        this.titleDrawer.setLabel(i, `${key.toUpperCase()}: ${m}`)
      })
      ctx.clearRect(0, frame.y, frame.width, this.titleHeight)
      this.titleDrawer.draw({
        ...this.frame,
        height: this.titleHeight
      })
    }
  }
  protected drawYAxis() {
    drawYAxis(
      this.context,
      divide(this.bottomValue(), this.topValue()).map(n => ({ value: n, color: CandleStickDrawer.theme.yTick})),
      this.frame,
      this.yScale,
      this.chart.options.resolution,
      true,
      CandleStickDrawer.theme.gridLine,
    )
  }
  protected drawXAxis() {
    let tickValues = uniq(divide(0, this.count() - 1, 4)
      .map(t => Math.floor(t)))
    drawXAxis(
      this.context,
      tickValues,
      this.chartFrame,
      this.chart.xScale,
      this.chart.options.resolution,
      true,
      CandleStickDrawer.theme.gridLine,
      (v: number) => {
        return this.xTickFormatter(v, this.data)
      },
      CandleStickDrawer.theme.xTick
    )
  }
  protected xTickFormatter(i: number, data: CandleStickData[]) {
    const d = data[i]
    if (d) {
      return formateDate(d.time, this.xTickFormat())
    }
    return ''
  }
  protected xTickFormat() {
    return 'yyyy/MM'
  }
  protected xTickDetailFormatter(i: number, data: CandleStickData[]) {
    const d = data[i]
    if (d) {
      return formateDate(data[i].time, this.xTickDetailFormat())
    }
    return ''
  }
  protected xTickDetailFormat() {
    return 'yyyy/MM/dd'
  }
  protected drawAxes() {
    this.drawXAxis()
    this.drawYAxis()
  }
  protected drawMA() {
    const { data, yScale } = this
    const { xScale } = this.chart
    this.MAIndicators.forEach(({key, color}) => {
      const trimed = trimNulls(data.map(d => d[key] as number))
      drawLine(
        this.context,
        trimed.result.map((d, i) => ({
          x: xScale(i + trimed.deleted),
          y: yScale(d)
        })),
        color,
        1 * this.chart.options.resolution
      )
    })
  }
  @autoResetStyle()
  protected drawCandles() {
    const { frame } = this
    const { xScale } = this.chart
    const { context: ctx, yScale } = this
    const { resolution } = this.chart.options
    this.data.forEach((d, i) => {
      const maxV = Math.max(d.close, d.open),
            minV = Math.min(d.close, d.open),
            y = yScale(maxV),
            height = Math.abs(yScale(d.close) - yScale(d.open))
      let width = xScale(1) - xScale(0)
      width -= width * 0.2
      const x = xScale(i) - width / 2
      if (d.close > d.open) {
        ctx.fillStyle = ctx.strokeStyle = CandleStickDrawer.theme.rise
        ctx.fillRect(x, y, width, height)
      } else if (d.close < d.open) {
        ctx.fillStyle= ctx.strokeStyle =  CandleStickDrawer.theme.fall
        ctx.fillRect(x, y, width, height)
      } else {
        ctx.fillStyle = ctx.strokeStyle =  CandleStickDrawer.theme.same
        ctx.fillRect(x, y, width, 1 * resolution)
      }
      const lineWidth = 1 * resolution
      ctx.fillRect(x + width / 2 - lineWidth / 2, yScale(d.high), lineWidth, yScale(maxV) - yScale(d.high))
      ctx.fillRect(x + width / 2 - lineWidth / 2, yScale(minV), lineWidth, yScale(d.low) - yScale(minV))
    })
  }
}