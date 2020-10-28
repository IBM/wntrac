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
import {isNullOrUndefined} from 'util';
import {numberWithCommas} from '../../functions/functions';

@Injectable({
  providedIn: 'root'
})
export class MapPopUpService {

  constructor() { }
  // !isNullOrUndefined(confidence) ? confidence : 'Unknown'
  makeCasesPopup(country: any, value: string, type: string): string {
    return `` +
      `<div class="popup-region-name">${ country }</div>` +
      `<div>Case: ${ numberWithCommas(value) + ' ' + type }</div>`;
  }

  makeCMPopupWithYAxisInfo(country, cmKey, startDate, endDate, yAxis, density): string {
    if (isNullOrUndefined(cmKey)) {
      return `` +
        `<div class="popup-region-name">${ country }</div>` +
        `<div>${!isNullOrUndefined(yAxis) ? yAxis : 'No data'}: ${!isNullOrUndefined(numberWithCommas(density))
          ? numberWithCommas(density) : 'No data'}</div>`;
    } else {
      return `` +
        `<div class="popup-region-name">${country}</div>` +
        `<div class="countermeasure-popup-text">${cmKey}</div>` +
        `<div>${!isNullOrUndefined(yAxis) ? yAxis : 'No data'}: ${!isNullOrUndefined(numberWithCommas(density))
          ? numberWithCommas(density) : 'No data'}</div>`;
    }
  }

  makeCMSimilarityPopup(territoryName, selectedCountry, similarity, countermeasureImplemented) {
    const styledCountermeasures = countermeasureImplemented.map(c => this.titleCase(c));

    return `` +
      `<div class="popup-region-name">${territoryName}</div>` +
      `<div>${Math.floor(similarity * 100)} % NPI index based on ${selectedCountry} NPI types</div>` +
      `<div class="countermeasure-popup-text">${styledCountermeasures.join(', ')}</div>`;
  }

  titleCase(str) {
    str = str.toLowerCase().split(' ');
    for (let i = 0; i < str.length; i++) {
      str[i] = str[i].charAt(0).toUpperCase() + str[i].slice(1);
    }
    return str.join(' ');
  }
}
