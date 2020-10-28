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

import {Injectable} from '@angular/core';
import {isNullOrUndefined} from 'util';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {map} from 'rxjs/operators';
import {MEASURES_DATA_SOURCES} from '../../constants/general.constants';
import {of} from 'rxjs';
import {environment} from '../../../environments/environment';

export const CM_DATA_API = `assets/data/npis/npis.json`;
export const WORLD_GEOJSON = `assets/data/geojson/world.json`;
export const COUNTRIES_DICTIONARY = `assets/data/dictionary/country_dictionary.json`;
export const CEDP_DATA = `assets/data/outcome/world.json`;
export const STATS_API = `assets/data/npis/stats.json`;

@Injectable({
  providedIn: 'root'
})
export class DataLoaderService {
  headersIgnoreBar = new HttpHeaders()
    .set('Accept', 'application/json').set('ignoreProgressBar', '').set('Cache-Control', 'no-store');
  headers = new HttpHeaders()
    .set('Accept', 'application/json').set('ignoreProgressBar', '').set('Cache-Control', 'no-store');

  constructor(private httpClient: HttpClient) {}
  loadWorldGeoJson() {
    const stringWorldGeoJson = localStorage.getItem('world_geojson');
    if (isNullOrUndefined(stringWorldGeoJson)) {
      return this.httpClient.get(WORLD_GEOJSON, {headers: this.headers})
        .pipe(map((response => {
          localStorage.setItem('world_geojson', JSON.stringify(response));
          return response;
        })));
    } else {
      return of(JSON.parse(stringWorldGeoJson)).pipe(map((response => {
        return response;
      })));
    }
  }

  loadSelectedCountryAdmin1GeoJson(countryCode) {
    if (environment.AVAILABLE_ADMIN1_GEOJSON.includes(countryCode)) {
      return this.httpClient.get(`assets/data/geojson/${countryCode}.json`, {headers: this.headersIgnoreBar})
        .pipe(map((response => {
          return response;
        })));
    } else {
      return of(null);
    }
  }

  private filterForAdmin1(response: any, admin0: string) {
    const filteredResponse = {};
    if (isNullOrUndefined(response) || isNullOrUndefined(admin0)) {
      return filteredResponse;
    }
    Object.keys(response).forEach(cm => {
      if (response.hasOwnProperty(cm)) {
        const cmObject = response[cm];
        let filteredCmObject = {};
        Object.keys(cmObject).forEach(country => {
          if (admin0 === country && cmObject.hasOwnProperty(country) && cmObject[country].hasOwnProperty('admin1')) {
            filteredCmObject = cmObject[country]['admin1'];
          }
        });
        filteredResponse[cm] = filteredCmObject;
      }
    });
    return filteredResponse;
  }

  getCountriesDictionary() {
    return this.httpClient.get<any>(`${COUNTRIES_DICTIONARY}`,
      {headers: this.headers})
      .pipe(map((response => {
        return response;
      })));
  }

  loadCEDPData(dataAndDataSourcesConfigs?: any) {
    return this.httpClient.get(`${CEDP_DATA}`, {headers: this.headers})
      .pipe(map((response => {
        if (!isNullOrUndefined(dataAndDataSourcesConfigs) && !isNullOrUndefined(dataAndDataSourcesConfigs.measuresDataSources)
          && dataAndDataSourcesConfigs.measuresDataSources.indexOf(MEASURES_DATA_SOURCES[0]) === -1) {
          return {};
        }
        return response;
      })));
  }

  loadJHUSelectedCountryAdmin1MeasuresData(admin0IsoCode: string, dataAndDataSourcesConfigs?: any) {
    if (isNullOrUndefined(admin0IsoCode)) {
      admin0IsoCode = '';
    } else {
      admin0IsoCode = admin0IsoCode.toLowerCase();
    }
    if (environment.AVAILABLE_ADMIN1_GEOJSON.includes(admin0IsoCode)) {
      return this.httpClient.get(`${environment.ADMIN1_MEASURES_DATA}` + admin0IsoCode + '.json',
        {headers: this.headersIgnoreBar})
        .pipe(map((response => {
          if (!isNullOrUndefined(dataAndDataSourcesConfigs) && !isNullOrUndefined(dataAndDataSourcesConfigs.measuresDataSources)
            && dataAndDataSourcesConfigs.measuresDataSources.indexOf(MEASURES_DATA_SOURCES[1]) === -1) {
            return null;
          }
          return response;
        })));
    } else {
      return of(null);
    }

  }

  getCMData(admin0IsoCode?: string, dataAndDataSourcesConfigs?: any) {
    return this.httpClient.get<any>(`${CM_DATA_API}`,
      {headers: this.headersIgnoreBar})
      .pipe(map((response => {
        if (!isNullOrUndefined(dataAndDataSourcesConfigs) && !isNullOrUndefined(dataAndDataSourcesConfigs.verifiedCMData)
          && dataAndDataSourcesConfigs.verifiedCMData === false) {
          return {};
        }
        if (!isNullOrUndefined(admin0IsoCode)) {
          response = this.filterForAdmin1(response, admin0IsoCode);
        }
        const rawKeys = Object.keys(response);
        const sortedKeys = rawKeys.sort((a, b) => Object.keys(response[b]).length - Object.keys(response[a]).length);
        const sortedResult = {};
        for (let k = 0; k < sortedKeys.length; k++) {
          const thisKey = sortedKeys[k];
          sortedResult[thisKey] = Object.assign({}, response[thisKey]);
        }
        return sortedResult;
      })));
  }

  getStatsMetadata() {
    return this.httpClient.get<any>(`${STATS_API}`,
      {headers: this.headers})
      .pipe(map((response => {
        return response;
      })));
  }

  getAdmin1CMData(response: any, admin0IsoCode: string, dataAndDataSourcesConfigs: any) {
    if (!isNullOrUndefined(dataAndDataSourcesConfigs) && !isNullOrUndefined(dataAndDataSourcesConfigs.verifiedCMData)
      && dataAndDataSourcesConfigs.verifiedCMData === false) {
      return {};
    }

    let thisAdmin0IsoCode = '';
    if (!isNullOrUndefined(admin0IsoCode)) {
      thisAdmin0IsoCode = admin0IsoCode.toLowerCase();
    }

    if (!(environment.AVAILABLE_ADMIN1_GEOJSON.includes(thisAdmin0IsoCode))) {
      return of({});
    }
    if (!isNullOrUndefined(admin0IsoCode)) {
      response = this.filterForAdmin1(response, admin0IsoCode);
    }
    const rawKeys = Object.keys(response);
    const sortedKeys = rawKeys.sort((a, b) => Object.keys(response[b]).length - Object.keys(response[a]).length);
    const sortedResult = {};
    for (let k = 0; k < sortedKeys.length; k++) {
      const thisKey = sortedKeys[k];
      sortedResult[thisKey] = Object.assign({}, response[thisKey]);
    }
    return of(sortedResult);
  }
}
