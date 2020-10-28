/*
 * Copyright 2020 IBM Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Injectable } from '@angular/core';
import { isNullOrUndefined } from 'util';
import { DatePipe } from '@angular/common';
import {
  DEFAULT_COLOR, CHART_SYMBOLS_COUNTER_MEASURES_OBJECT, STROKE_DEFAULT_COLOR, CHART_COUNTER_MEASURES_ABBREV, RELIEVED_RESTRICTION_COLOR
} from '../../constants/chart.constants';
import {COUNTERMEASURES_RESTRICTION_TYPES, DROPDOWN_ITEMS_X_AXIS} from '../../constants/general.constants';
import {
  capitalize, formatTheTimestampToDecimalPlacesUsedInData, getAnnotations, getDaysBetweenTimestampInDays, getDaysLabelGivenRange,
  getLabelForSingle, getReferenceLinesCoordinates, givenISOCodeAndCountriesDictionaryGetCountryName, transparentize
} from '../../functions/functions';
import {CurateDataService} from '../curate-data/curate-data.service';
@Injectable({
  providedIn: 'root'
})
export class ChartCovidService {

  constructor(private datePipe: DatePipe,
              private curateDataService: CurateDataService) {}

  private getText(key: any, length: any) {
    const thisText = [];
    for (let i = 0; i < length - 1; i++) {
      thisText.push('');
    }
    thisText.push(key);
    return thisText;
  }

  private splitText(details: any) {
    if (details.length > 8) {
      const div = details.length / 8;
      for (let i = 0; i < div; i++) {
        details.splice(8 * (i + 1), 0, '<br>');
      }
    }
    return details.join(' ');
  }

  getCombinedPlotChartOptions(xLabel: string, yLabel: string, xScaleType: string, yScaleType: string, yaxis3_dtick: any,
                              adminType: string, largestCmCount: any) {
    const yaxis3 = {
      automargin: true,
      showgrid: false,
      showline: false,
      domain: [
        0.08,
        0.20
      ],
      fixedrange: true,
      title: { text: '# of ' + adminType, standoff: 15 },
      rangemode: 'nonnegative',
    };
    if (!isNullOrUndefined(yaxis3_dtick)) {
      yaxis3['tickmode'] = 'array';
      yaxis3['tickvals'] = [0, 1];
      yaxis3['ticktext'] = ['false', 'true'];
      yaxis3['title'] = null;
    } else if (!isNullOrUndefined(largestCmCount)) {
      if (largestCmCount < 6) { yaxis3['dtick'] = 1; }
    }
    return {
      font: {
        family: '"IBM Plex Sans", "Open Sans", verdana, arial, sans-serif'
      },
      xaxis2: {
        automargin: false,
        tickfont: {
          size: 8,
        },
        showgrid: false,
        showline: false,
        fixedrange: true,
        ticks: '',
        showticklabels: false,
      },
      yaxis2: {
        automargin: true,
        showgrid: false,
        zeroline: false,
        showline: false,
        ticks: '',
        showticklabels: false,
        domain: [
          0.02,
          0.10
        ],
        fixedrange: true
      },
      yaxis3: yaxis3,
      xaxis: {
        type: xScaleType,
        ticks: '',
        title: { text: xLabel, standoff: 10 },
        gridcolor: '#F2F2F2',
        linecolor: '#E5E5E5',
        automargin: false,
        zerolinecolor: '#E5E5E5',
        zerolinewidth: 2
      },
      yaxis: {
        type: yScaleType,
        ticks: '',
        title: { text: yLabel, standoff: 15 },
        gridcolor: '#F2F2F2',
        linecolor: '#E5E5E5',
        automargin: true,
        zerolinecolor: '#E5E5E5',
        zerolinewidth: 2,
        fixedrange: true,
        domain: [
          0.35,
          0.99
        ]
      },
      grid: {
        rows: 3,
        columns: 1,
        subplots: [['x2y2', 'x2y3', 'xy']],
      },
      hoverlabel: {
        font: {
          family: '"IBM Plex Sans", "Open Sans", verdana, arial, sans-serif'
        },
        align: 'left'
      },
      margin: {
        l: 0,
        r: 0,
        b: 0,
        t: 0
      },
      hovermode: 'closest',
      height: 530,
      autosize: true,
      showlegend: false,
      legend: {
        margin: {
          l: 0,
          r: 0,
          b: 0,
          t: 0
        },
        tracegroupgap: 0,
        borderwidth: 1,
        bordercolor: DEFAULT_COLOR,
        xanchor: 'center', x: 0.75, y: 0.15, orientation: 'v',
        font: {
          family: '"IBM Plex Sans", "Open Sans", verdana, arial, sans-serif',
          size: 10,
        },
      },
      plot_bgcolor: '#ffffff',
    };
  }

  createCombinedPlot(covid19OutcomeData: any, counterMeasuresDataForAllCountries: any, cmData: any, dict: any, xLabel: string,
                     yLabel: string, xScaleType: string, yScaleType: string, showGlyphs: boolean, date: number, yaxis3_dtick: any,
                     location: string, colors: string[], adminType: string, topK: any, selectedAdminCode: string,
                     countermeasureRestriction: string) {
    let hoverXLabel = 'Days';
    const kDays = topK.kDays;
    const topKCm = topK.topKCm;
    const topKAdmins = topK.topKAdmins;
    let filteredCMData;
    const shapes = [];
    if (kDays > 1) {
      filteredCMData = this.curateDataService.groupCMUsingKdays(cmData, kDays, covid19OutcomeData, xLabel, yLabel);
    }
    if (xLabel === DROPDOWN_ITEMS_X_AXIS[0]) {
      xLabel = '';
      hoverXLabel = 'Date';
    }

    const cms = Object.keys(counterMeasuresDataForAllCountries);
    // get the largest cm count
    let largestCmCount;
    if (!isNullOrUndefined(cms[0]) && !isNullOrUndefined(counterMeasuresDataForAllCountries[cms[0]])) {
      largestCmCount = Object.keys(counterMeasuresDataForAllCountries[cms[0]]).length;
    }
    const layout = this.getCombinedPlotChartOptions(xLabel, yLabel, xScaleType, yScaleType, yaxis3_dtick, adminType, largestCmCount);
    layout['annotations'] = [];
    const data = [];
    if (!isNullOrUndefined(covid19OutcomeData)) {
      let color_idx = 0;
      let max_x = 0;

      // highest cases
      let h = 0;
      let factor;
      const highest_country = Object.keys(covid19OutcomeData)[0];
      let k = 0;
      if (!isNullOrUndefined(covid19OutcomeData[highest_country])
        && !isNullOrUndefined(covid19OutcomeData[highest_country]['data'])) {
        k = covid19OutcomeData[highest_country]['data'];
      }
      h = k[Object.keys(k)[Object.keys(k).length - 1]];
      factor = h / 2;

      Object.keys(covid19OutcomeData).forEach(key => {
        let color = colors[color_idx];
        const country_data = covid19OutcomeData[key];
        const x = [];
        const y = [];
        Object.keys(country_data.non_zero_data).forEach(day => {
          if (country_data.non_zero_data.hasOwnProperty(day)) {

            const this_point = country_data.non_zero_data[day];
            let value;
            value = this_point.value;
            let x_value;

            if (xScaleType === 'date') {
              x_value = this.datePipe.transform(new Date(+this_point.date), 'yyyy-MM-dd');
            } else {
              x_value = +day;
              if (x_value > max_x && yScaleType === 'log') {
                max_x = x_value;
              }
            }
            x.push(x_value);
            y.push(value);
          }
        });

        let visible = true;
        let substitute =  false;

        const fullName = givenISOCodeAndCountriesDictionaryGetCountryName(key, dict);
        if (isNullOrUndefined(color)) {
          const trace = {
            mode: 'lines',
            name: fullName,
            type: 'scatter',
            x: x,
            y: y,
            marker: { color: '#D3D3D3' },
            showlegend: false,
            line: {
              width: 1
            },
            meta: {
              focus: false,
              width: 1,
              widthFocus: 3,
              widthNoFocus: 1,
              color: '#D3D3D3',
              colorFocus: '#FECB52',
              colorNoFocus: '#D3D3D3',
              type: 'line',
              admin: key,
              hoverXLabel: hoverXLabel,
              yLabel: yLabel,
              fullName: fullName
            },
            hovertemplate: '<b>Location:</b> %{meta.fullName}' + '<br><b>%{meta.hoverXLabel}:</b> %{x}' + '<br>' +
            '<b>%{meta.yLabel}:</b> %{y:,}'
          };
          data.push(trace);
          visible = false;
          color = '#FECB52';
          substitute = true;
        } else {
          const trace = {
            mode: 'lines',
            name: fullName,
            type: 'scatter',
            showlegend: false,
            x: x,
            y: y,
            marker: { color: color },
            legendgroup: key,
            line: {
              width: 2
            },
            meta: {
              focus: false,
              width: 2,
              widthFocus: 3,
              widthNoFocus: 1,
              color: color,
              colorFocus: color,
              colorNoFocus: transparentize('' + color, 0.8),
              type: 'line',
              admin: key,
              hoverXLabel: hoverXLabel,
              yLabel: yLabel,
              fullName: fullName
            },
            hovertemplate: '<b>Location:</b> %{meta.fullName}' + '<br><b>%{meta.hoverXLabel}:</b> %{x}' + '<br>' +
            '<b>%{meta.yLabel}:</b> %{y:,}'
          };
          data.push(trace);
          let annotation: {};
          if (yScaleType === 'log') {
            let logValue = y[y.length - 1];
            if (!isNaN(logValue)) {
              if (+logValue === 0) { logValue = 1; }
              annotation = getAnnotations(x[x.length - 1], Math.log10(logValue), fullName);
            }
          } else {
            annotation = getAnnotations(x[x.length - 1], y[y.length - 1], fullName);
          }
          if (!isNullOrUndefined(annotation) && !isNullOrUndefined(annotation['x'])) {
            layout['annotations'].push(annotation);
          }
        }

        if (selectedAdminCode === key) {
          const displayText = 'More details on <br> NPIs are  <br> available at ' + adminType + ' level <br>' +
            ' Click to load details';
          let yLogValue = y[Math.floor(y.length / 2)];
          if (yScaleType === 'log') {
            if (yLogValue === 0) { yLogValue = 1; }
            yLogValue = Math.log10(yLogValue);
          }
          const annotationForDetails = {
            x: x[Math.floor(x.length / 2)],
            y: yLogValue,
            xref: 'x',
            yref: 'y',
            text: displayText,
            font: {
              family: '"IBM Plex Sans", "Open Sans", verdana, arial, sans-serif',
              size: 10,
            },
            showarrow: true,
            xanchor: 'center',
            yanchor: 'bottom',
            arrowhead: 7,
            ax: 0,
            ay: -40,
            bordercolor: color,
            borderpad: 2,
            captureevents: true,
            meta1: 'cm_details',
            meta2: selectedAdminCode
          };
          layout['annotations'].push(annotationForDetails);
        }

        let symbol_idx = 0;
        if (kDays > 1 && !isNullOrUndefined(filteredCMData) && !isNullOrUndefined(filteredCMData[key])) {
          const thisAdmins = filteredCMData[key];
          Object.keys(thisAdmins).forEach(cm_time => {
            const x_value = +cm_time;
            let hoverTimeLabel = 'Date';
            if (xScaleType !== 'date') {
              hoverTimeLabel = getLabelForSingle(x_value, yLabel);
            }
            if (x_value <= date) {
              factor = (color_idx + 1)  * (h / 10);
              let hovertemplate;
              let thisMeta;
              let size = 20;
              let details;
              let cmkey;
              const symbolColor = '' + color;
              let cm_type = 'Imposed ';
              if (thisAdmins[cm_time]['restriction'] === '0' || thisAdmins[cm_time]['restriction'] === 'lifted') { cm_type = 'Lifted '; }
              if (countermeasureRestriction.indexOf(cm_type.trim()) > -1) {
                // check if cm are grouped by days
                if (!isNullOrUndefined(thisAdmins[cm_time]['lowerLimitDate'])
                  && !isNullOrUndefined(thisAdmins[cm_time]['upperLimitDate'])
                  && !isNullOrUndefined(thisAdmins[cm_time]['package'])) {
                  details = '<br>';
                  const lowerLimitDate = thisAdmins[cm_time]['lowerLimitDate'];
                  const upperLimitDate = thisAdmins[cm_time]['upperLimitDate'];
                  const restriction = thisAdmins[cm_time]['restriction'];
                  // if (restriction === 'lifted') { symbolColor = '' + DEFAULT_COLOR; }
                  if (hoverTimeLabel === 'Date') {
                    Object.keys(thisAdmins[cm_time]['package']).forEach(thisPackage => {
                      details = details + '<br><b><i>' + capitalize(thisPackage) + ':</i></b><br>'
                        + this.splitText(thisAdmins[cm_time]['package'][thisPackage]['allDates'].split(' '));
                    });
                    hovertemplate = '<b>%{meta.fullName}</b><br>' +
                      '<b>%{meta.lowerLimitDate} - %{meta.upperLimitDate}</b><br><b>NPIs ' + restriction + '</b>%{customdata}' +
                      '<br><extra>%{meta.country_name}</extra>';
                  } else {
                    Object.keys(thisAdmins[cm_time]['package']).forEach(thisPackage => {
                      details = details + '<br><b><i>' + capitalize(thisPackage) + ':</i></b><br>'
                        + thisAdmins[cm_time]['package'][thisPackage]['allDates'];
                    });
                    hoverTimeLabel = getDaysLabelGivenRange(+lowerLimitDate, +upperLimitDate, yLabel);
                    hovertemplate = '<b>%{meta.fullName}</b><br>' +
                      '<b>%{meta.hover_time_label}</b><br><b>NPIs ' + restriction + ':</b>%{customdata}<br>' +
                      '<extra>%{meta.country_name}</extra>';
                  }
                  details = details.split(' ');
                  cmkey = 'group';
                  size = 15;
                  thisMeta = { country_name: key, cm_name: cmkey, lowerLimitDate: lowerLimitDate, upperLimitDate: upperLimitDate,
                    focus: false, color: transparentize('' + symbolColor, 0.4),
                    colorFocus: transparentize('' + symbolColor, 0.4),
                    colorNoFocus: transparentize('' + symbolColor, 0.4),
                    type: 'marker', admin: key, substitute: substitute, hover_time_label: hoverTimeLabel, fullName: fullName};
                } else {
                  details = thisAdmins[cm_time]['evidences'][0]['text'].split(' ');
                  if (details.length > 8) {
                    const div = details.length / 8;
                    for (let i = 0; i < div; i++) {
                      details.splice(8 * (i + 1), 0, '<br>');
                    }
                  }
                  if (hoverTimeLabel === 'Date') {
                    hovertemplate = '<b>%{meta.fullName}</b><br><b>%{x}</b>'
                      + '<br><b>' + cm_type + '%{meta.cm_name}</b><br>%{customdata}<extra>%{meta.country_name}</extra>';
                  } else {
                    hovertemplate = '<b>%{meta.country_name}</b><br><b>%{meta.hover_time_label}</b>'
                      + '<br><b>' + cm_type + '%{meta.cm_name}</b><br>%{customdata}<extra>%{meta.country_name}</extra>';
                  }
                  cmkey = thisAdmins[cm_time]['type'];
                  thisMeta = { country_name: key, cm_name: thisAdmins[cm_time]['type'],
                    focus: false, color: transparentize('' + symbolColor, 0.4),
                    colorFocus: transparentize('' + symbolColor, 0.4),
                    colorNoFocus: transparentize('' + symbolColor, 0.4),
                    type: 'marker', admin: key, substitute: substitute, hover_time_label: hoverTimeLabel, fullName: fullName};
                }
                const symbol = CHART_SYMBOLS_COUNTER_MEASURES_OBJECT[cmkey];
                const trace2 = {
                  meta: thisMeta,
                  mode: 'markers',
                  name: cmkey,
                  type: 'scatter',
                  x: [x_value],
                  y: [factor],
                  visible: visible,
                  marker: {
                    color: transparentize('' + symbolColor, 0.4),
                    size: [size],
                    symbol: symbol,
                    opacity: 0.6,
                    line: {
                      color: symbolColor,
                      width: 1.5
                    }
                  },
                  showlegend: false,
                  legendgroup: key,
                  customdata: [details.join(' ')],
                  hovertemplate: hovertemplate
                };
                let lowerYAxis;
                if (!isNullOrUndefined(country_data) && !isNullOrUndefined(country_data['non_zero_data'])
                  && !isNullOrUndefined(country_data['non_zero_data'][cm_time])
                  && !isNullOrUndefined(country_data['non_zero_data'][cm_time]['value'])) {
                  lowerYAxis = country_data['non_zero_data'][cm_time]['value'];
                } else {
                  const curated_value = formatTheTimestampToDecimalPlacesUsedInData(+cm_time, covid19OutcomeData[key]['data']);
                  lowerYAxis = country_data['data'][curated_value];
                  if (isNullOrUndefined(lowerYAxis)) { lowerYAxis = 0; }
                }
                const trace3 = {
                  type: 'scatter',
                  x: [x_value, x_value],
                  y: [lowerYAxis, factor],
                  visible: visible,
                  marker: {
                    color: symbolColor,
                    opacity: 0.1
                  },
                  opacity: 0.3,
                  hoverinfo: 'skip',
                  showlegend: false,
                  legendgroup: key,
                  line: {
                    width: 1,
                    color: symbolColor,
                  },
                  meta: { focus: false, color: symbolColor, colorFocus: symbolColor,
                    colorNoFocus: symbolColor,
                    type: 'marker', admin: key, substitute: substitute},
                };
                data.push(trace3);
                data.push(trace2);

                if (cm_type.trim() === COUNTERMEASURES_RESTRICTION_TYPES[2]) {
                  size = 20;
                  const rectShape = {
                    type: 'rect',
                    xsizemode: 'pixel',
                    ysizemode: 'pixel',
                    xanchor: x_value,
                    yanchor: factor,
                    layer: 'above',
                    visible: visible,
                    x0: -1 * size / 2,
                    y0: -1 * size / 2,
                    x1: size / 2,
                    y1: size / 2,
                    fillcolor: DEFAULT_COLOR,
                    opacity: 0.5,
                    line: {
                      color: '#000000',
                      width: 2,
                    },
                    meta: { focus: false, color: symbolColor, colorFocus: symbolColor,
                      colorNoFocus: symbolColor,
                      type: 'marker', admin: key, substitute: substitute},
                  };
                  const lineShape = {
                    type: 'line',
                    xsizemode: 'pixel',
                    ysizemode: 'pixel',
                    xanchor: x_value,
                    yanchor: factor,
                    layer: 'above',
                    visible: visible,
                    x0: -1 * size / 2,
                    y0: -1 * size / 2,
                    x1: size / 2,
                    y1: size / 2,
                    line: {
                      color: RELIEVED_RESTRICTION_COLOR,
                      width: 1,
                    },
                    meta: { focus: false, color: symbolColor, colorFocus: symbolColor,
                      colorNoFocus: symbolColor,
                      type: 'marker', admin: key, substitute: substitute},
                  };
                  shapes.push(rectShape);
                  shapes.push(lineShape);
                }
              }
            }
          });
        } else {
          Object.keys(cmData).forEach(cmkey => {
            const symbol = CHART_SYMBOLS_COUNTER_MEASURES_OBJECT[cmkey];
            const cm_data = cmData[cmkey];
            if (Object.keys(cm_data).includes(key)
              && !isNullOrUndefined(country_data.non_zero_data[1])
              && !isNullOrUndefined(country_data.non_zero_data[1].date)) {
              const baseTime = country_data.non_zero_data[1].date;
              const lowerBar = new Date(2020, 0, 1).getTime();

              Object.keys(cm_data[key]).forEach(cm_time => {
                let x_value = +cm_time;
                const upperBar = new Date().getTime();
                if (!isNaN(x_value) && x_value > lowerBar && x_value < upperBar) {
                  // console.log(cm_time, cm_data[key][cm_time]);
                  let hoverTimeLabel = 'Date';
                  if (xScaleType !== 'date') {
                    x_value = getDaysBetweenTimestampInDays(+cm_time, +baseTime);
                    hoverTimeLabel = getLabelForSingle(x_value, yLabel);
                  }
                  if (x_value <= date) {
                    const symbolColor = '' + color;
                    let cm_type = 'Imposed ';
                    if (cm_data[key][cm_time]['restriction'] === '0') { cm_type = 'Lifted '; }
                    if (countermeasureRestriction.indexOf(cm_type.trim()) > -1) {
                      factor = (color_idx + 1)  * (h / 10);
                      let hovertemplate;
                      let thisMeta;
                      const size = 20;
                      let details;
                      details = cm_data[key][cm_time]['evidences'][0]['text'].split(' ');
                      if (details.length > 8) {
                        const div = details.length / 8;
                        for (let i = 0; i < div; i++) {
                          details.splice(8 * (i + 1), 0, '<br>');
                        }
                      }
                      if (hoverTimeLabel === 'Date') {
                        hovertemplate = '<b>%{meta.fullName}</b>' + '<br><b>%{x}</b>'
                          + '<br><b>' + cm_type + '%{meta.cm_name}</b><br>%{customdata}<extra>%{meta.country_name}</extra>';
                      } else {
                        hovertemplate = '<b>%{meta.country_name}</b>' + '<br><b>%{meta.hover_time_label}</b>'
                          + '<br><b>' + cm_type + '%{meta.cm_name}</b><br>%{customdata}<extra>%{meta.country_name}</extra>';
                      }
                      thisMeta = { country_name: key, cm_name: cmkey, focus: false, color: transparentize('' + symbolColor, 0.4),
                        colorFocus: transparentize('' + symbolColor, 0.4),
                        colorNoFocus: transparentize('' + symbolColor, 0.4), type: 'marker', admin: key, substitute: substitute,
                        hover_time_label: hoverTimeLabel, fullName: fullName};
                      const trace2 = {
                        meta: thisMeta,
                        mode: 'markers',
                        name: cmkey,
                        type: 'scatter',
                        x: [x_value],
                        y: [factor],
                        visible: visible,
                        marker: {
                          color: transparentize('' + symbolColor, 0.4),
                          size: [size],
                          symbol: symbol,
                          opacity: 0.6,
                          line: {
                            color: symbolColor,
                            width: 1.5
                          }
                        },
                        showlegend: false,
                        legendgroup: key,
                        customdata: [details.join(' ')],
                        hovertemplate: hovertemplate
                      };

                      const curated_value = formatTheTimestampToDecimalPlacesUsedInData(+cm_time, covid19OutcomeData[key]['data']);
                      const trace3 = {
                        type: 'scatter',
                        x: [x_value, x_value],
                        y: [country_data['data'][curated_value], factor],
                        visible: visible,
                        marker: {
                          color: symbolColor,
                          opacity: 0.1
                        },
                        opacity: 0.3,
                        hoverinfo: 'skip',
                        showlegend: false,
                        legendgroup: key,
                        line: {
                          width: 1,
                          color: symbolColor,
                        },
                        meta: { focus: false, color: symbolColor, colorFocus: symbolColor,
                          colorNoFocus: symbolColor,
                          type: 'marker', admin: key, substitute: substitute},
                      };
                      data.push(trace3);
                      data.push(trace2);

                      if (cm_type.trim() === COUNTERMEASURES_RESTRICTION_TYPES[2]) {
                        const rectShape = {
                          type: 'rect',
                          xsizemode: 'pixel',
                          ysizemode: 'pixel',
                          xanchor: x_value,
                          yanchor: factor,
                          layer: 'above',
                          visible: visible,
                          x0: -1 * size / 2,
                          y0: -1 * size / 2,
                          x1: size / 2,
                          y1: size / 2,
                          fillcolor: DEFAULT_COLOR,
                          opacity: 0.5,
                          line: {
                            color: '#000000',
                            width: 2,
                          },
                          meta: { focus: false, color: symbolColor, colorFocus: symbolColor,
                            colorNoFocus: symbolColor,
                            type: 'marker', admin: key, substitute: substitute},
                        };
                        const lineShape = {
                          type: 'line',
                          xsizemode: 'pixel',
                          ysizemode: 'pixel',
                          xanchor: x_value,
                          yanchor: factor,
                          layer: 'above',
                          visible: visible,
                          x0: -1 * size / 2,
                          y0: -1 * size / 2,
                          x1: size / 2,
                          y1: size / 2,
                          line: {
                            color: RELIEVED_RESTRICTION_COLOR,
                            width: 1,
                          },
                          meta: { focus: false, color: symbolColor, colorFocus: symbolColor,
                            colorNoFocus: symbolColor,
                            type: 'marker', admin: key, substitute: substitute},
                        };
                        shapes.push(rectShape);
                        shapes.push(lineShape);
                      }
                    }
                  }
                }
              });
            }
            symbol_idx++;
          });
        }
        color_idx++;
      });
      if (max_x > 0) {
        const xy2 = getReferenceLinesCoordinates(2, max_x, h);
        const xy7 = getReferenceLinesCoordinates(7, max_x, h);
        const xy2trace = {
          x: xy2.xValues,
          y: xy2.yValues,
          showlegend: false,
          name: 'Double Every Two Days',
          type: 'scatter',
          mode: 'lines+text',
          text: this.getText('Double Every Two Days', xy2.yValues.length),
          textposition: 'top left',
          marker: {
            color: 'grey'
          },
          line: {
            dash: 'dot'
          }
        };
        const xy7trace = {
          x: xy7.xValues,
          y: xy7.yValues,
          showlegend: false,
          name: 'Double Every Week',
          type: 'scatter',
          mode: 'lines+text',
          text: this.getText('Double Every Week', xy7.yValues.length),
          textposition: 'top left',
          marker: {
            color: 'grey'
          },
          line: {
            dash: 'dot'
          }
        };
        data.push(xy2trace);
        data.push(xy7trace);
      }
    }
    let currentTime;
    if (xLabel === '') {
      currentTime = this.datePipe.transform(new Date(date), 'yyyy-MM-dd');
    } else {
      currentTime = date;
    }
    const line = {
      type: 'line',
      x0: currentTime,
      y0: 0.30,
      x1: currentTime,
      yref: 'paper',
      y1: 1,
      line: {
        color: DEFAULT_COLOR,
        width: 3,
        dash: 'dot'
      }
    };
    shapes.push(line);
    layout['shapes'] = shapes;

    const y2 = [];
    const x2 = [];
    const barColors = [];
    const strokeBarColors = [];
    const showKCM = [];

    cms.forEach(key => {
      if (counterMeasuresDataForAllCountries.hasOwnProperty(key)) {
        const cm = counterMeasuresDataForAllCountries[key];
        const countries = Object.keys(cm);
        const y = [];
        const localX = [];
        x2.push(key);
        localX.push(key);
        y2.push(countries.length);
        y.push(0);
        barColors.push(DEFAULT_COLOR);
        strokeBarColors.push(STROKE_DEFAULT_COLOR);
        let symbolTransparencyColor = '' + DEFAULT_COLOR;
        let opacity = 0.6;
        if (Object.keys(cmData).indexOf(key) === -1) {
          symbolTransparencyColor = transparentize('' + DEFAULT_COLOR, 0.95);
          opacity = 0.2;
        }
        const trace0 = {
          x: localX,
          y: y,
          showlegend: true,
          xaxis: 'x2',
          yaxis: 'y2',
          type: 'scatter',
          mode: 'markers',
          marker: {
            color: symbolTransparencyColor,
            symbol: CHART_SYMBOLS_COUNTER_MEASURES_OBJECT[key],
            size: 10,
            opacity: opacity,
            line: {
              color: strokeBarColors,
              width: 1.5
            }
          },
          name: CHART_COUNTER_MEASURES_ABBREV[key],
          hovertemplate: '%{x}'
        };
        data.push(trace0);
      }
    });

    const trace1 = {
      x: x2,
      y: y2,
      showlegend: false,
      xaxis: 'x2',
      yaxis: 'y3',
      type: 'bar',
      marker: {
        color: barColors,
        opacity: 0.5,
        line: {
          color: strokeBarColors,
          width: 1.5
        }
      },
      orientation: 'v',
      name: '',
      hovertemplate: '%{x}' + ', %{y} territories',
    };

    data.push(trace1);

    // Add annotation for the topkcm, topkcountries and kdays
    const topKTrace = {
      xref: 'paper',
      yref: 'paper',
      x: 0,
      xanchor: 'left',
      y: 1.0,
      yanchor: 'center',
      text: '<b>' + topKAdmins + '</b>' + ' top K ' + adminType + ' | '
      + '<b>' + topKCm + '</b>' + ' top K NPIs' + ' | '
      + '<b>' + kDays + '</b>' + ' days NPIs group',
      font: {
        family: '"IBM Plex Sans", "Open Sans", verdana, arial, sans-serif',
        size: 10
      },
      showarrow: false,
      captureevents: false
    };
    layout['annotations'].push(topKTrace);

    // Add annotation for the lower subplot's title
    const titleTrace = {
      xref: 'paper',
      yref: 'paper',
      x: 0.45,
      xanchor: 'center',
      y: 0.21,
      yanchor: 'center',
      text: '<b>' + location + ' NPIs' + '</b>',
      font: {
        family: '"IBM Plex Sans", "Open Sans", verdana, arial, sans-serif',
        size: 14
      },
      showarrow: false,
      captureevents: false
    };
    layout['annotations'].push(titleTrace);

    // Add an annotation for legend click event
    const legendTrace = {
      xref: 'paper',
      yref: 'paper',
      x: 1,
      xanchor: 'right',
      y: 0,
      yanchor: 'bottom',
      yshift: -10,
      text: '<a href="">' + 'Show legend' + '</a>',
      font: {
        family: '"IBM Plex Sans", "Open Sans", verdana, arial, sans-serif', },
      showarrow: false,
      captureevents: true,
      meta1: 'link'
    };
    layout['annotations'].push(legendTrace);
    return {
      data,
      layout,
      config: {responsive: true, modeBarButtonsToRemove: ['pan2d', 'zoom2d', 'select2d', 'lasso2d', 'resetScale2d',
          'hoverClosestCartesian', 'hoverCompareCartesian', 'toggleSpikelines'], displaylogo: false}
    };
  }
}
