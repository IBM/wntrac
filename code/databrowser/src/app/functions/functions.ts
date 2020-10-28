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

import { Chart } from 'chart.js';
import {isNullOrUndefined} from 'util';
import {DROPDOWN_ITEMS_X_AXIS, DROPDOWN_ITEMS_Y_AXIS, IMPORTANT_DATES} from '../constants/general.constants';
export function getReferenceLinesCoordinates(doubleAfter: number, maxX: number, maxY: number): any {
  const result = {};
  const xValues = [];
  const yValues = [];
  for (let i = 1; i <= maxX; i++) {
    const y = 2 ** (i / doubleAfter);
    if (y < maxY) {
      yValues.push(y);
      xValues.push(i);
    } else {
      break;
    }
  }
  result['xValues'] = xValues;
  result['yValues'] = yValues;
  return result;
}

export function randomInteger(min, max): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function getMidpoint(min, max): number {
  return Math.floor((max - min) / 2) + min;
}

export function transparentize(color, opacity?) {
  const Color = Chart.helpers.color;
  const alpha = opacity === undefined ? 0.5 : 1 - opacity;
  return Color(color).alpha(alpha).rgbString();
}

export function getColor(d, range?: number[]): string {
  let grades = [0, 5, 10, 15, 20, 30];
  if (isNullOrUndefined(d) || d === 'NaN') {
    return '#F2EFEA' ;
  }
  if (!isNullOrUndefined(range)) {
    grades = range;
  }
  return d > grades[5] ? '#BD0026' :
    d > grades[4] ? '#E31A1C' :
      d > grades[3] ? '#FC4E2A' :
        d > grades[2] ? '#FD8D3C' :
          d > grades[1] ? '#FEB24C' :
            '#FED976';
}

export function getDaysBtnCurrentMillsAndGivenMills(value): number {
  const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
  return Math.ceil(Math.abs((IMPORTANT_DATES.current.getTime() - value) / oneDay));
}

export function getDaysBetweenTimestampInDays(time: number, timeDate: number): number {
  const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
  return Math.ceil((time - timeDate) / oneDay);
}

export function getTimestampGivenDaysFromARefTimestamp(timestamp: number, days: number): number {
  const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
  return timestamp + (days * oneDay);
}

export function givenISOCodeAndCountriesDictionaryGetCountryName(isoCode: string, dict: any): string {
  if (isNullOrUndefined(isoCode) || isNullOrUndefined(dict) || isNullOrUndefined(dict[isoCode])
    || isNullOrUndefined(dict[isoCode]['name'])) { return isoCode; }
  return dict[isoCode]['name'];
}

export function formatTheTimestampToDecimalPlacesUsedInData(timestamp: number, dataToShowElement: any) {
  if (isNaN(timestamp) || isNullOrUndefined(dataToShowElement) || isNullOrUndefined(Object.keys(dataToShowElement)[0])
    || isNaN(+Object.keys(dataToShowElement)[0])) { return timestamp; }
  const timestampInData = Object.keys(dataToShowElement)[0];
  let numberOfDecimalPlaces = 0;
  // if (Math.floor(timestampInData) === timestampInData) { numberOfDecimalPlaces = 0; } else {
  //   numberOfDecimalPlaces = timestampInData.split('.')[1].length || 0;
  // }
  if (timestampInData.indexOf('.') !== -1) {
    numberOfDecimalPlaces = timestampInData.split('.')[1].length || 0;
  } else {
    numberOfDecimalPlaces = 0;
  }
  return timestamp.toFixed(numberOfDecimalPlaces);
}

export function getAnnotations(xValue: any, yValue: any, fullName: string) {
  return {
    x: xValue,
    y: yValue,
    xref: 'x',
    yref: 'y',
    text: fullName,
    font: {
      family: '"IBM Plex Sans", "Open Sans", verdana, arial, sans-serif',
      size: 10,
    },
    showarrow: false,
    xanchor: 'left',
    yanchor: 'center'
  };
}

export function numberWithCommas(x) {
  if (isNullOrUndefined(x) || isNaN(x)) { return x; }
  const parts = x.toString().split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}

export function getTheLatestDateOrDayForTheGivenData(covidData: any, contlAttr: any) {
  if (isNullOrUndefined(covidData) || isNullOrUndefined(contlAttr)) { return null; }
  const yAxis = contlAttr.yAxis;
  const xAxis = contlAttr.xAxis;
  let dataToShow = null;
  if (yAxis === DROPDOWN_ITEMS_Y_AXIS[1]) {
    dataToShow = covidData['d_data'];
  } else if (yAxis === DROPDOWN_ITEMS_Y_AXIS[2]) {
    dataToShow = covidData['r_data'];
  } else if (yAxis === DROPDOWN_ITEMS_Y_AXIS[0]) {
    dataToShow = covidData['c_data'];
  } else if (yAxis === DROPDOWN_ITEMS_Y_AXIS[3]) {
    dataToShow = covidData['t_data'];
  } else if (yAxis === DROPDOWN_ITEMS_Y_AXIS[4]) {
    dataToShow = covidData['h_data'];
  }  else {
    dataToShow = covidData;
  }
  if (isNullOrUndefined(yAxis) || isNullOrUndefined(xAxis) || isNullOrUndefined(dataToShow)) { return null; }
  let latestTime = 0;
  Object.keys(dataToShow).forEach(iso_code => {
    if (dataToShow.hasOwnProperty(iso_code) && !isNullOrUndefined(dataToShow) && !isNullOrUndefined(dataToShow[iso_code])
      && !isNullOrUndefined(dataToShow[iso_code].non_zero_data)
      && !isNullOrUndefined(Object.keys(dataToShow[iso_code].non_zero_data)[Object.keys(dataToShow[iso_code].non_zero_data).length - 1])) {
      let thisTime = Object.keys(dataToShow[iso_code].non_zero_data)[Object.keys(dataToShow[iso_code].non_zero_data).length - 1];
      if (xAxis === DROPDOWN_ITEMS_X_AXIS[0]) {
        thisTime = dataToShow[iso_code].non_zero_data[thisTime]['date'];
      }
      if (+thisTime > latestTime) {
        latestTime = +thisTime;
      }
    }
  });
  if (latestTime === 0) { return null; }
  return latestTime;
}

export function getLabelForSingle(x_value, yLabel: string) {
  let hoverTimeLabel;
  const absoluteXValue = Math.abs(x_value);

  let hoverTimeLabelPeriodQualifier = 'after';
  const hoverTimeLabelLastPart = 'first ' + yLabel.toLowerCase().slice(0, -1);
  let hoverTimeLabelFirstPart = 'days';

  if (x_value < 0) {
    hoverTimeLabelPeriodQualifier = 'before';
  } else if (x_value === 0) {
    hoverTimeLabelPeriodQualifier = 'On same day as';
  }

  if (absoluteXValue === 1) {
    hoverTimeLabelFirstPart = 'day';
  }

  if (absoluteXValue > 0) {
    hoverTimeLabel = absoluteXValue + ' '
      + hoverTimeLabelFirstPart + ' ' + hoverTimeLabelPeriodQualifier + ' ' + hoverTimeLabelLastPart;
  } else {
    hoverTimeLabel = hoverTimeLabelPeriodQualifier + ' ' + hoverTimeLabelLastPart;
  }
  return hoverTimeLabel;
}

export function getDaysLabelGivenRange(lowerLimitDate: number, upperLimitDate: number, yLabel: string) {
  const ylabel = yLabel.toLowerCase().slice(0, -1);
  const absLowerLimitDate = Math.abs(lowerLimitDate);
  const absUpperLimitDate = Math.abs(upperLimitDate);
  if (lowerLimitDate < 1) {
    if (upperLimitDate < 1) {
      return absLowerLimitDate + ' - ' + absUpperLimitDate + ' days before the first ' + ylabel;
    } else if (upperLimitDate === -1) {
      return absLowerLimitDate + ' - 1 day before the first ' + ylabel;
    } else if (upperLimitDate === 0) {
      return absLowerLimitDate + ' days before - on the same day as the first ' + ylabel;
    } else if (upperLimitDate === 1) {
      return absLowerLimitDate + ' days before - ' + '1 day after the first ' + ylabel;
    } else {
      return absLowerLimitDate + ' days before - ' + absUpperLimitDate + ' days after the first ' + ylabel;
    }
  } else if (lowerLimitDate === -1) {
    if (upperLimitDate === 0) {
      return '1 day before - on the same day as the first ' + ylabel;
    } else if (upperLimitDate === 1) {
      return '1 day before - 1 day after the first ' + ylabel;
    } else {
      return '1 day before - ' + upperLimitDate + ' days after the first ' + ylabel;
    }
  } else if (lowerLimitDate === 0) {
    if (upperLimitDate === 1) {
      return 'on the same day - 1 day after the first ' + ylabel;
    } else {
      return 'on the same day - ' + upperLimitDate + ' days after the first ' + ylabel;
    }
  } else {
    return absLowerLimitDate + ' - ' + absUpperLimitDate + ' days after the first ' + ylabel;
  }
}

export function capitalize(s) {
  if (typeof s !== 'string') { return ''; }
  return s.charAt(0).toUpperCase() + s.slice(1);
}
