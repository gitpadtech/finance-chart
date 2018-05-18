import uniq from 'lodash.uniq'
import { Chart, autoResetStyle, YAxisDetail } from "./chart";
import { scaleLinear } from 'd3-scale';
import { max, min } from 'd3-array';
import { Rect, Point } from "../graphic/primitive";
import { ChartTitle } from "./chart-title";
import { drawYAxis, drawXAxis } from "../paint-utils/index";
import { divide } from "../algorithm/divide";
import { TITLE_HEIGHT, TITLE_MARGIN_BOTTOM } from '../constants/constants';
import { Drawer } from './drawer';

export const VolumeWhiteTheme = {
  rise: '#F55559',
  fall: '#7DCE8D',
  volumeText: '#F78081',
  titleBackground: '#F2F4F4',
  title: '#5E667F',
  gridLine: '#E7EAEB',
  yTick: '#5E667F'
}
export const VolumeBlackTheme = {
  rise: '#F55559',
  fall: '#7DCE8D',
  volumeText: '#F78081',
  titleBackground: '#22252B',
  title: '#AEB4BE',
  gridLine: '#282D38',
  yTick: '#AEB4BE'
}


export interface VolumeData {
  volume: number
}

const shortenVolume = (v: number) => {
  const scaleV = v / VolumeDrawer.proportion
  if (scaleV > 10000) {
    return (scaleV / 10000).toFixed(2)
  }
  return scaleV.toFixed(2)
}
const volumeLabel = (v: number) => {
  const scaleV = v / VolumeDrawer.proportion
  if (scaleV > 10000) {
    return `VOL: ${(scaleV / 10000).toFixed(2)}万`
  }
  return `VOL: ${scaleV.toFixed(2)}`
}
/**
 * Volume chart drawer
 */
export class VolumeDrawer extends Drawer {
  static theme = VolumeWhiteTheme
  static proportion = 100
  static unit = '手'
  titleDrawer: ChartTitle
  data: VolumeData[]
  constructor(chart: Chart, data: VolumeData[]) {
    super(chart, data)
    this.xAxisTickHeight = 0
    this.context = chart.context
    this.titleDrawer = new ChartTitle(
      this.context,
      '成交量', [
        {
          x: 60,
          label: volumeLabel(0),
          color: VolumeDrawer.theme.volumeText
        }
      ],
      VolumeDrawer.theme.titleBackground,
      VolumeDrawer.theme.title,
      this.chart.options.resolution
    )
    this.setData(data)
  }
  public resize(frame: Rect): void {
    super.resize(frame)
    this.resetYScale()
  }
  public draw() {
    const { frame, data } = this
    this.drawAxes()
    this.drawTitle(this.selectedIndex || this.data.length - 1)
    this.drawVolumes()
  }
  public setData(data: VolumeData[]) {
    super.setData(data)
    if (data.length > 0) {
      this.maxValue = max(data, d => d.volume)
    } else {
      this.maxValue = 1000 * VolumeDrawer.proportion
    }
    this.resetYScale()
  }
  public getYAxisDetail(y: number): YAxisDetail {
    return {
      left: shortenVolume(this.yScale.invert(y))
    }
  }
  private drawTitle(i: number) {
    const d = this.data[i]
    this.titleDrawer.setLabel(0, volumeLabel(d ? this.data[i].volume : 0))
    const { context: ctx, frame } = this
    this.titleDrawer.draw({
      ...this.frame,
      height: this.titleHeight
    })
  }
  protected drawXAxis() {
    const tickValues = divide(0, this.chart.count() - 1, 5)
    drawXAxis(
      this.context,
      tickValues,
      this.chartFrame,
      this.chart.xScale,
      this.chart.options.resolution,
      false,
      VolumeDrawer.theme.gridLine
    )
  }
  protected drawAxes() {
    this.drawXAxis()
    this.drawYAxis()
  }
  protected drawYAxis() {
    const tickValues = uniq(divide(0, this.maxValue, 3)).map(n => ({ value: Math.round(n), color: VolumeDrawer.theme.yTick }));
    tickValues.shift() // remove first item, 0 volume
    const maxTickValue =
      max(tickValues, d => d.value) / VolumeDrawer.proportion
    const useWUnit = maxTickValue > 10000
    drawYAxis(
      this.context,
      tickValues,
      this.frame,
      this.yScale,
      this.chart.options.resolution,
      true,
      VolumeDrawer.theme.gridLine,
      (v, i) => {
        // const scaledV = v / VolumeDrawer.proportion
        let r = shortenVolume(v)
        if (useWUnit && i === tickValues.length - 1) {
          r =  `${r}万${VolumeDrawer.unit}`
        }
        return r
      }
    )
  }
  @autoResetStyle()
  protected drawVolumes() {
    const { chartFrame } = this
    const { xScale } = this.chart
    const { context: ctx, yScale } = this

    this.data.forEach((d, i) => {
      ctx.fillStyle = this.calcDeltaPrice(d, i, this.data) > 0 ? VolumeDrawer.theme.rise : VolumeDrawer.theme.fall;
      const x = xScale(i),
            y = yScale(d.volume),
            height = chartFrame.height - (y - chartFrame.y)
      let width = xScale(1) - xScale(0)
      width -= width * 0.2
      ctx.fillRect(x - width / 2, y, width, height)
    });
  }
  protected resetYScale() {
    const { chartFrame } = this;
    this.yScale = scaleLinear()
      .domain([0, this.maxValue])
      .range([
        chartFrame.y + chartFrame.height,
        chartFrame.y + TITLE_MARGIN_BOTTOM * this.chart.options.resolution
      ])
  }
  calcDeltaPrice(currentValue: VolumeData, currentIndex: number, data: VolumeData[]): number {
    if (currentIndex === 0) {
      return 0;
    }
    return currentValue.volume - data[currentIndex - 1].volume;
  }
}
