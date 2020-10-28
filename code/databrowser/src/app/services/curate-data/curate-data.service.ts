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
import {DROPDOWN_ITEMS_GLOBAL_US, DROPDOWN_ITEMS_X_AXIS, DROPDOWN_ITEMS_Y_AXIS} from '../../constants/general.constants';
import {getDaysBetweenTimestampInDays, getLabelForSingle, getTimestampGivenDaysFromARefTimestamp} from '../../functions/functions';
import {DatePipe} from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class CurateDataService {

  constructor(private datePipe: DatePipe) { }

  getGeoPoliticalEntitiesDataThatImplementedThisCM(data: any, selectedCounterMeasure: string[]) {
    const thisData = {};
    for (const scm of selectedCounterMeasure) {
      thisData[scm] = data[scm];
    }
    return thisData;
  }

  filterCMDataByDate(cmData: any, cvData: any, items: any) {
    const thisData = {};
    if (isNullOrUndefined(cmData) || isNullOrUndefined(cvData) || isNullOrUndefined(items)) {
      return thisData;
    }
    Object.keys(cmData).forEach(cmName => {
      if (cmData.hasOwnProperty(cmName) && !isNullOrUndefined(cmData[cmName])) {
        const cmObject = cmData[cmName];
        Object.keys(cmObject).forEach(countryName => {
          if (cmObject.hasOwnProperty(countryName) && !isNullOrUndefined(cmObject[countryName])) {
            const countryObject = cmObject[countryName];
            Object.keys(countryObject).forEach(cm_time => {
              if (countryObject.hasOwnProperty(cm_time)) {
                if (items['xAxis'] === DROPDOWN_ITEMS_X_AXIS[0]) {
                  if (+cm_time <= +items['date']) {
                    if (isNullOrUndefined(thisData[cmName])) { thisData[cmName] = {}; }
                    if (isNullOrUndefined(thisData[cmName][countryName])) { thisData[cmName][countryName] = {}; }
                    thisData[cmName][countryName][cm_time] = countryObject[cm_time];
                  }
                } else {
                  if (!isNullOrUndefined(cvData[countryName])
                    && !isNullOrUndefined(cvData[countryName]['non_zero_data'])
                    && !isNullOrUndefined(cvData[countryName]['non_zero_data'][1])
                    && !isNullOrUndefined(cvData[countryName]['non_zero_data'][1]['date'])) {
                    const baseTime = cvData[countryName]['non_zero_data'][1]['date'];
                    if (!isNaN(+baseTime)) {
                      const baseDays = getDaysBetweenTimestampInDays(+cm_time, +baseTime);
                      if (baseDays <= +items['date']) {
                        if (isNullOrUndefined(thisData[cmName])) { thisData[cmName] = {}; }
                        if (isNullOrUndefined(thisData[cmName][countryName])) { thisData[cmName][countryName] = {}; }
                        thisData[cmName][countryName][cm_time] = countryObject[cm_time];
                      }
                    }
                  }
                }
              }
            });
          }
        });
      }
    });
    return thisData;
  }

  getCovidDataForGivenGeoPoliticalEntities(covidData: any, data: any) {
    if (isNullOrUndefined(data) || isNullOrUndefined(covidData)) {
      return null;
    }
    const returnData = {};
    const intersectionData = {};
    const cmKeys = Object.keys(data);
    cmKeys.forEach(cm => {
      if (data.hasOwnProperty(cm) && !isNullOrUndefined(data[cm])) {
        const thisData = data[cm];
        Object.keys(thisData).forEach(country => {
          if (thisData.hasOwnProperty(country) && !isNullOrUndefined(covidData[country])) {
            const keys = Object.keys(thisData[country]);
            for (const key of keys) {
              if (!isNaN(+key)) {
                if (isNullOrUndefined(intersectionData[country])) {
                  intersectionData[country] = 1;
                } else {
                  intersectionData[country] = intersectionData[country] + 1;
                }
                break;
              }
            }
          }
        });
      }
    });
    Object.keys(intersectionData).forEach(country => {
      if (intersectionData.hasOwnProperty(country) && intersectionData[country] >= cmKeys.length) {
        returnData[country] = covidData[country];
      }
    });
    return returnData;
  }

  getTheFirstK(covid19OutcomeData: any, k: number, yLabel: string, clickedLocation?: any) {
    if (isNullOrUndefined(covid19OutcomeData)) {
      return {};
    }
    const kk_3rd = this.getK_3rd(k, covid19OutcomeData);
    k = kk_3rd.k;
    const k_3rd = kk_3rd.k_3rd;

    let sorted_keys = Object.keys(covid19OutcomeData).sort(function(a, b) {
      const b_data = covid19OutcomeData[b]['data'];
      const a_data = covid19OutcomeData[a]['data'];
      return +b_data[Object.keys(b_data)[Object.keys(b_data).length - 1]]
        - +a_data[Object.keys(a_data)[Object.keys(a_data).length - 1]];
    });

    sorted_keys = sorted_keys.slice(0, k);
    if (!isNullOrUndefined(clickedLocation) && !isNullOrUndefined(clickedLocation.NAME)) {
      if (!isNullOrUndefined(covid19OutcomeData[clickedLocation.NAME])) {
        const clickedLocationIndex = sorted_keys.indexOf(clickedLocation.NAME);
        if (clickedLocationIndex > -1) {
          if (clickedLocationIndex > k_3rd - 1) {
            [sorted_keys[k_3rd - 1], sorted_keys[clickedLocationIndex]] = [sorted_keys[clickedLocationIndex], sorted_keys[k_3rd - 1]];
          }
        } else {
          sorted_keys.splice(k_3rd - 1, 0, clickedLocation.NAME);
          sorted_keys.pop();
        }
      } else if (!isNullOrUndefined(covid19OutcomeData[clickedLocation.ISO_A2])) {
        const clickedLocationIndex = sorted_keys.indexOf(clickedLocation.ISO_A2);
        if (clickedLocationIndex > -1) {
          if (clickedLocationIndex > k_3rd - 1) {
            [sorted_keys[k_3rd - 1], sorted_keys[clickedLocationIndex]] = [sorted_keys[clickedLocationIndex], sorted_keys[k_3rd - 1]];
          }
        } else {
          sorted_keys.splice(k_3rd - 1, 0, clickedLocation.ISO_A2);
          sorted_keys.pop();
        }
      } else {
        console.log('data missing for selected country');
      }
    }
    const filteredData = {};
    sorted_keys.forEach(function(key, idx) {
      filteredData[key] = covid19OutcomeData[key];
    });
    return filteredData;
  }

  private getK_3rd(k: number, covid19OutcomeData: any) {
    let k_3rd = Math.ceil(k / 3);
    if (Object.keys(covid19OutcomeData).length < k) {
      k = Object.keys(covid19OutcomeData).length;
    }
    if (k_3rd < 5 && k >= 5) {
      k_3rd = 5;
    }
    return {k, k_3rd};
  }

  getTheFirstKCM(cmData: any, k: number) {
    if (isNullOrUndefined(cmData)) {
      return {};
    }
    const cmDataKeys = Object.keys(cmData);
    if (k > cmDataKeys.length) { k = cmDataKeys.length; }
    const sorted_keys = cmDataKeys.slice(0, k);
    const filteredData = {};
    sorted_keys.forEach(function(key, idx) {
      filteredData[key] = cmData[key];
    });
    return filteredData;
  }

  getTheCMForTheGivenCountries(cmData: any, covid19OutcomeData: any) {
    const filteredData = {};
    if (!isNullOrUndefined(covid19OutcomeData) && !isNullOrUndefined(cmData)) {
      const keys = Object.keys(covid19OutcomeData);
      Object.keys(cmData).forEach(cmKey => {
        if (cmData.hasOwnProperty(cmKey)) {
          const cm = cmData[cmKey];
          const thisCm = {};
          Object.keys(cm).forEach(country => {
            if (cm.hasOwnProperty(country)) {
              for (let i = 0; i < keys.length; i++) {
                if (keys[i] === (country)) {
                  thisCm[country] = cm[country];
                }
              }
            }
          });
          filteredData[cmKey] = thisCm;
        }
      });
    }
    return filteredData;
  }

  getCMImplementedByThisCountry(clickedLegend: string, cmData: any) {
    const filteredData = {};
    if (!isNullOrUndefined(cmData) && !isNullOrUndefined(clickedLegend)) {
      Object.keys(cmData).forEach(cmKey => {
        if (cmData.hasOwnProperty(cmKey)) {
          const cm = cmData[cmKey];
          if (!isNullOrUndefined(cm) && !isNullOrUndefined(cm[clickedLegend])) {
            const keys = Object.keys(cm[clickedLegend]);
            for (const key of keys) {
              if (!isNaN(+key)) {
                const thisCm = {};
                thisCm[clickedLegend] = cm[clickedLegend];
                filteredData[cmKey] = thisCm;
                break;
              }
            }
          }
        }
      });
    }
    return filteredData;
  }

  getCMImplementedByThisCountryIncludingEmptyCM(clickedLegend: string, cmData: any) {
    const filteredData = {};
    if (!isNullOrUndefined(cmData) && !isNullOrUndefined(clickedLegend)) {
      Object.keys(cmData).forEach(cmKey => {
        if (cmData.hasOwnProperty(cmKey)) {
          const cm = cmData[cmKey];
          const thisCm = {};
          if (!isNullOrUndefined(cm) && !isNullOrUndefined(cm[clickedLegend]) && Object.keys(cm[clickedLegend]).length > 0) {
            const keys = Object.keys(cm[clickedLegend]);
            for (const key of keys) {
              if (!isNaN(+key)) {
                thisCm[clickedLegend] = cm[clickedLegend];
                break;
              }
            }
          }
          filteredData[cmKey] = thisCm;
        }
      });
    }
    return filteredData;
  }

  getCMsImplementedByThisCountryAsAtThisDate(name: string, timestamp: number, xAxis: string, covidData: any) {
    let cmsImplementedArray = [];
    if (isNullOrUndefined(covidData) || isNullOrUndefined(covidData['cm_data']) || isNullOrUndefined(covidData['c_data'])) {
      return cmsImplementedArray;
    }
    const cmData = covidData['cm_data'];
    const cvData = covidData['c_data'];

    const thisData = {};
    Object.keys(cmData).forEach(cmName => {
      if (cmData.hasOwnProperty(cmName) && !isNullOrUndefined(cmData[cmName])) {
        const cmObject = cmData[cmName];
        Object.keys(cmObject).forEach(countryName => {
          if (cmObject.hasOwnProperty(countryName) && countryName === name && !isNullOrUndefined(cmObject[countryName])) {
            const countryObject = cmObject[countryName];
            Object.keys(countryObject).forEach(cm_time => {
              if (countryObject.hasOwnProperty(cm_time) && !isNaN(+cm_time)) {
                if (xAxis === DROPDOWN_ITEMS_X_AXIS[0]) {
                  if (+cm_time <= timestamp) {
                    if (isNullOrUndefined(thisData[cmName])) { thisData[cmName] = {}; }
                    if (isNullOrUndefined(thisData[cmName][countryName])) { thisData[cmName][countryName] = {}; }
                    thisData[cmName][countryName][cm_time] = countryObject[cm_time];
                  }
                } else {
                  if (!isNullOrUndefined(cvData[countryName])
                    && !isNullOrUndefined(cvData[countryName]['non_zero_data'])
                    && !isNullOrUndefined(cvData[countryName]['non_zero_data'][1])
                    && !isNullOrUndefined(cvData[countryName]['non_zero_data'][1]['date'])) {
                    const baseTime = cvData[countryName]['non_zero_data'][1]['date'];
                    if (!isNaN(+baseTime)) {
                      const baseDays = getDaysBetweenTimestampInDays(+cm_time, +baseTime);
                      if (baseDays <= timestamp) {
                        if (isNullOrUndefined(thisData[cmName])) { thisData[cmName] = {}; }
                        if (isNullOrUndefined(thisData[cmName][countryName])) { thisData[cmName][countryName] = {}; }
                        thisData[cmName][countryName][cm_time] = countryObject[cm_time];
                      }
                    }
                  }
                }
              }
            });
          }
        });
      }
    });
    cmsImplementedArray = Object.keys(thisData);
    return cmsImplementedArray;
  }

  getSimilarityWithThisCountryAsAtThisDate(name: string, cmsImplementedArray: string[], timestamp: number, xAxis: string, covidData: any) {
    const similarityOutputDoc = {};
    if (isNullOrUndefined(cmsImplementedArray) || cmsImplementedArray.length === 0 || isNullOrUndefined(covidData)
      || isNullOrUndefined(covidData['cm_data']) || isNullOrUndefined(covidData['c_data'])) {
      return similarityOutputDoc;
    }
    const cmData = covidData['cm_data'];
    const cvData = covidData['c_data'];
    /*
    * After iterating through every other country apart from the selected country return {
    * [degreeOfSimilarity - based on time and comparison of countermeasures implemented by selectedCountry
    * latlng - for country in question
    * countermeasuresImplemented - list of countermeasures implemented by country]
    * }
    */

    const thisData = {};
    Object.keys(cmData).forEach(cmName => {
      if (cmData.hasOwnProperty(cmName) && !isNullOrUndefined(cmData[cmName])) {
        const cmObject = cmData[cmName];
        Object.keys(cmObject).forEach(countryName => {
          if (cmObject.hasOwnProperty(countryName) && countryName !== name && !isNullOrUndefined(cmObject[countryName])) {
            const countryObject = cmObject[countryName];
            Object.keys(countryObject).forEach(cm_time => {
              if (countryObject.hasOwnProperty(cm_time) && !isNaN(+cm_time)) {
                if (xAxis === DROPDOWN_ITEMS_X_AXIS[0]) {
                  if (+cm_time <= timestamp) {
                    if (isNullOrUndefined(thisData[countryName])) { thisData[countryName] = {}; }
                    if (isNullOrUndefined(thisData[countryName]['countermeasuresImplemented'])) {
                      thisData[countryName]['countermeasuresImplemented'] = [];
                    }
                    if (isNullOrUndefined(thisData[countryName]['latlng'])) {
                      if (!isNullOrUndefined(cvData[countryName]) && !isNullOrUndefined(cvData[countryName]['Lat'])
                        && !isNullOrUndefined(cvData[countryName]['Long'])) {
                        thisData[countryName]['latlng'] = [cvData[countryName]['Lat'], cvData[countryName]['Long']];
                      }
                    }
                    if (thisData[countryName]['countermeasuresImplemented'].indexOf(cmName) === -1) {
                      thisData[countryName]['countermeasuresImplemented'].push(cmName);
                    }
                  }
                } else {
                  if (!isNullOrUndefined(cvData[countryName])
                    && !isNullOrUndefined(cvData[countryName]['non_zero_data'])
                    && !isNullOrUndefined(cvData[countryName]['non_zero_data'][1])
                    && !isNullOrUndefined(cvData[countryName]['non_zero_data'][1]['date'])) {
                    const baseTime = cvData[countryName]['non_zero_data'][1]['date'];
                    if (!isNaN(+baseTime)) {
                      const baseDays = getDaysBetweenTimestampInDays(+cm_time, +baseTime);
                      if (baseDays <= timestamp) {
                        if (isNullOrUndefined(thisData[countryName])) { thisData[countryName] = {}; }
                        if (isNullOrUndefined(thisData[countryName]['countermeasuresImplemented'])) {
                          thisData[countryName]['countermeasuresImplemented'] = [];
                        }
                        if (isNullOrUndefined(thisData[countryName]['latlng'])) {
                          if (!isNullOrUndefined(cvData[countryName]) && !isNullOrUndefined(cvData[countryName]['Lat'])
                            && !isNullOrUndefined(cvData[countryName]['Long'])) {
                            thisData[countryName]['latlng'] = [cvData[countryName]['Lat'], cvData[countryName]['Long']];
                          }
                        }
                        if (thisData[countryName]['countermeasuresImplemented'].indexOf(cmName) === -1) {
                          thisData[countryName]['countermeasuresImplemented'].push(cmName);
                        }
                      }
                    }
                  }
                }
              }
            });
          }
        });
      }
    });
    if (!isNullOrUndefined(thisData)) {
      Object.keys(thisData).forEach(countryName => {
        if (thisData.hasOwnProperty(countryName) && !isNullOrUndefined(thisData[countryName])
          && !isNullOrUndefined(thisData[countryName]['countermeasuresImplemented'])) {
          let similarCMCount = 0;
          for (const cmsImplemented of cmsImplementedArray) {
            if (thisData[countryName]['countermeasuresImplemented'].indexOf(cmsImplemented) > -1) {
              similarCMCount++;
            }
          }
          thisData[countryName]['degreeOfSimilarity'] = similarCMCount / cmsImplementedArray.length;
        }
      });
    }
    return thisData;
  }

  getK_3rdColors(covidData: any, k: number) {
    const allColors = ['#636EFA', '#EF553B', '#00CC96', '#AB63FA', '#FFA15A', '#19D3F3', '#FF6692', '#B6E880', '#FF97FF', '#FECB52'];
    const k_3rd = this.getK_3rd(k, covidData).k_3rd;
    const colors = [];
    for (let i = 0; i < +k_3rd; i++) {
      colors.push(allColors[i]);
    }
    return colors;
  }

  getTheAdminLevelTypesForAGeo(geo) {
    if (geo === DROPDOWN_ITEMS_GLOBAL_US[0]) { return 'countries'; } else if (geo === 'US' || geo === 'United States') { return 'states';
    } else { return 'provinces';
    }
  }

  groupCMUsingKdays(cmData: any, kDays: number, covidData: any, xLabel: string, yLabel: string) {
    if (isNullOrUndefined(cmData) || isNullOrUndefined(covidData)) { return cmData; }
    const lowerBar = new Date(2020, 0, 1).getTime();
    const upperBar = new Date().getTime();
    const resultObject = {};
    Object.keys(covidData).forEach(admin => {
      if (covidData.hasOwnProperty(admin) && !isNullOrUndefined(covidData[admin]) && !isNullOrUndefined(covidData[admin].non_zero_data[1])
        && !isNullOrUndefined(covidData[admin].non_zero_data[1].date)) {
        const baseTime = covidData[admin].non_zero_data[1].date;
        const tempCategoryObject = {};
        Object.keys(cmData).forEach(cmName => {
          if (cmData.hasOwnProperty(cmName) && !isNullOrUndefined(cmData[cmName]) && !isNullOrUndefined(cmData[cmName][admin])) {
            // console.log(admin);
            const allAvailableCmTimesFOrThisAdmin = Object.keys(cmData[cmName][admin]);
            if (!isNullOrUndefined(allAvailableCmTimesFOrThisAdmin) && kDays > 1) {
              for (const thisTime of allAvailableCmTimesFOrThisAdmin) {
                if (isNaN(+thisTime) || +thisTime < lowerBar || +thisTime > upperBar) {
                  continue;
                }
                let cm_type = 'imposed';
                if (cmData[cmName][admin][thisTime]['restriction'] === '0') { cm_type = 'lifted'; }
                const noOfDaysSinceRef = getDaysBetweenTimestampInDays(+thisTime, lowerBar);
                const indexOfCategory = Math.floor(noOfDaysSinceRef / kDays);
                if (isNullOrUndefined(tempCategoryObject[indexOfCategory])) {
                  tempCategoryObject[indexOfCategory] = {};
                }
                if (isNullOrUndefined(tempCategoryObject[indexOfCategory][cm_type])) {
                  tempCategoryObject[indexOfCategory][cm_type] = {};
                }
                if (isNullOrUndefined(tempCategoryObject[indexOfCategory][cm_type][cmName])) {
                  tempCategoryObject[indexOfCategory][cm_type][cmName] = [];
                }
                tempCategoryObject[indexOfCategory][cm_type][cmName].push(thisTime);
              }
            }
          }
        });
        const tempAdminDataHolder = {};
        Object.keys(tempCategoryObject).forEach(indexOfCategory => {
          if (tempCategoryObject.hasOwnProperty(indexOfCategory) && !isNullOrUndefined(tempCategoryObject[indexOfCategory])) {
            const imposed = tempCategoryObject[indexOfCategory]['imposed'];
            const relieved = tempCategoryObject[indexOfCategory]['lifted'];
            if (!isNullOrUndefined(imposed) && Object.keys(imposed).length > 0) {
              const tempCMNames = Object.keys(imposed);
              if (tempCMNames.length === 1 && tempCategoryObject[indexOfCategory]['imposed'][tempCMNames[0]].length === 1) {
                let label = tempCategoryObject[indexOfCategory]['imposed'][tempCMNames[0]][0];
                if (xLabel !== DROPDOWN_ITEMS_X_AXIS[0]) {
                  label = getDaysBetweenTimestampInDays(+label, +baseTime);
                }
                tempAdminDataHolder[label]
                  = cmData[tempCMNames[0]][admin][tempCategoryObject[indexOfCategory]['imposed'][tempCMNames[0]][0]];
              } else {
                const noOfDaysSinceRef = +indexOfCategory * kDays;
                let lowerLimitDate = getTimestampGivenDaysFromARefTimestamp(lowerBar, noOfDaysSinceRef);
                let upperLimitDate = getTimestampGivenDaysFromARefTimestamp(lowerBar, noOfDaysSinceRef + (kDays - 1));
                if (xLabel !== DROPDOWN_ITEMS_X_AXIS[0]) {
                  lowerLimitDate = getDaysBetweenTimestampInDays(+lowerLimitDate, +baseTime);
                  upperLimitDate = getDaysBetweenTimestampInDays(+upperLimitDate, +baseTime);
                }
                if (isNullOrUndefined(tempAdminDataHolder[upperLimitDate])) { tempAdminDataHolder[upperLimitDate] = {}; }
                if (xLabel !== DROPDOWN_ITEMS_X_AXIS[0]) {
                  tempAdminDataHolder[upperLimitDate]['lowerLimitDate'] = lowerLimitDate;
                  tempAdminDataHolder[upperLimitDate]['upperLimitDate'] = upperLimitDate;
                } else {
                  tempAdminDataHolder[upperLimitDate]['lowerLimitDate']
                    = this.datePipe.transform(new Date(lowerLimitDate), 'MMM d, y');
                  tempAdminDataHolder[upperLimitDate]['upperLimitDate']
                    = this.datePipe.transform(new Date(upperLimitDate), 'MMM d, y');
                }
                tempAdminDataHolder[upperLimitDate]['restriction'] = 'imposed';
                if (isNullOrUndefined(tempAdminDataHolder[upperLimitDate]['package'])) {
                  tempAdminDataHolder[upperLimitDate]['package'] = {}; }
                Object.keys(tempCategoryObject[indexOfCategory]['imposed']).forEach(cmkey => {
                  if (isNullOrUndefined(tempAdminDataHolder[upperLimitDate]['package'][cmkey])) {
                    tempAdminDataHolder[upperLimitDate]['package'][cmkey] = {};
                  }
                  const datesForThisItem = tempCategoryObject[indexOfCategory]['imposed'][cmkey];
                  tempAdminDataHolder[upperLimitDate]['package'][cmkey]['noOfEvents'] = datesForThisItem.length;
                  if (xLabel !== DROPDOWN_ITEMS_X_AXIS[0]) {
                    let tempDateList = '';
                    for (let i = 0; i < datesForThisItem.length; i++) {
                      const tempDate = datesForThisItem[i];
                      const hoverTimeLabel = getLabelForSingle(+getDaysBetweenTimestampInDays(+tempDate, +baseTime), yLabel);
                      tempDateList = tempDateList + ' ' + (i + 1) + '.)';
                      tempDateList = tempDateList + ' ' + hoverTimeLabel;
                      tempDateList = tempDateList + '<br>';
                    }
                    tempAdminDataHolder[upperLimitDate]['package'][cmkey]['allDates'] = tempDateList;
                  } else {
                    let tempDateList = '';
                    for (let i = 0; i < datesForThisItem.length; i++) {
                      const tempDate = datesForThisItem[i];
                      const hoverTimeLabel = this.datePipe.transform(new Date(+tempDate), 'MMM d, y');
                      if (tempDateList !== '') { tempDateList = tempDateList + ' & '; } else { tempDateList = ' '; }
                      tempDateList = tempDateList + hoverTimeLabel;
                    }
                    tempAdminDataHolder[upperLimitDate]['package'][cmkey]['allDates'] = tempDateList;
                  }
                });
              }
            }
            if (!isNullOrUndefined(relieved) && Object.keys(relieved).length > 0) {
              const tempCMNames = Object.keys(relieved);
              if (tempCMNames.length === 1 && tempCategoryObject[indexOfCategory]['lifted'][tempCMNames[0]].length === 1) {
                let label = tempCategoryObject[indexOfCategory]['lifted'][tempCMNames[0]][0];
                if (xLabel !== DROPDOWN_ITEMS_X_AXIS[0]) {
                  label = getDaysBetweenTimestampInDays(+label, +baseTime);
                }
                tempAdminDataHolder[label]
                  = cmData[tempCMNames[0]][admin][tempCategoryObject[indexOfCategory]['lifted'][tempCMNames[0]][0]];
              } else {
                const noOfDaysSinceRef = +indexOfCategory * kDays;
                let lowerLimitDate = getTimestampGivenDaysFromARefTimestamp(lowerBar, noOfDaysSinceRef);
                let upperLimitDate = getTimestampGivenDaysFromARefTimestamp(lowerBar, noOfDaysSinceRef + (kDays - 1));
                let relievedGroupDate = getTimestampGivenDaysFromARefTimestamp(lowerBar, noOfDaysSinceRef + (Math.floor(kDays / 2)));
                if (xLabel !== DROPDOWN_ITEMS_X_AXIS[0]) {
                  lowerLimitDate = getDaysBetweenTimestampInDays(+lowerLimitDate, +baseTime);
                  upperLimitDate = getDaysBetweenTimestampInDays(+upperLimitDate, +baseTime);
                  relievedGroupDate = getDaysBetweenTimestampInDays(+relievedGroupDate, +baseTime);
                }
                if (isNullOrUndefined(tempAdminDataHolder[relievedGroupDate])) { tempAdminDataHolder[relievedGroupDate] = {}; }
                if (xLabel !== DROPDOWN_ITEMS_X_AXIS[0]) {
                  tempAdminDataHolder[relievedGroupDate]['lowerLimitDate'] = lowerLimitDate;
                  tempAdminDataHolder[relievedGroupDate]['upperLimitDate'] = upperLimitDate;
                } else {
                  tempAdminDataHolder[relievedGroupDate]['lowerLimitDate']
                    = this.datePipe.transform(new Date(lowerLimitDate), 'MMM d, y');
                  tempAdminDataHolder[relievedGroupDate]['upperLimitDate']
                    = this.datePipe.transform(new Date(upperLimitDate), 'MMM d, y');
                }
                tempAdminDataHolder[relievedGroupDate]['restriction'] = 'lifted';
                if (isNullOrUndefined(tempAdminDataHolder[relievedGroupDate]['package'])) {
                  tempAdminDataHolder[relievedGroupDate]['package'] = {}; }
                Object.keys(tempCategoryObject[indexOfCategory]['lifted']).forEach(cmkey => {
                  if (isNullOrUndefined(tempAdminDataHolder[relievedGroupDate]['package'][cmkey])) {
                    tempAdminDataHolder[relievedGroupDate]['package'][cmkey] = {};
                  }
                  const datesForThisItem = tempCategoryObject[indexOfCategory]['lifted'][cmkey];
                  tempAdminDataHolder[relievedGroupDate]['package'][cmkey]['noOfEvents'] = datesForThisItem.length;
                  if (xLabel !== DROPDOWN_ITEMS_X_AXIS[0]) {
                    let tempDateList = '';
                    for (let i = 0; i < datesForThisItem.length; i++) {
                      const tempDate = datesForThisItem[i];
                      const hoverTimeLabel = getLabelForSingle(+getDaysBetweenTimestampInDays(+tempDate, +baseTime), yLabel);
                      tempDateList = tempDateList + ' ' + (i + 1) + '.)';
                      tempDateList = tempDateList + ' ' + hoverTimeLabel;
                      tempDateList = tempDateList + '<br>';
                    }
                    tempAdminDataHolder[relievedGroupDate]['package'][cmkey]['allDates'] = tempDateList;
                  } else {
                    let tempDateList = '';
                    for (let i = 0; i < datesForThisItem.length; i++) {
                      const tempDate = datesForThisItem[i];
                      const hoverTimeLabel = this.datePipe.transform(new Date(+tempDate), 'MMM d, y');
                      if (tempDateList !== '') { tempDateList = tempDateList + ' & '; } else { tempDateList = ' '; }
                      tempDateList = tempDateList + hoverTimeLabel;
                    }
                    tempAdminDataHolder[relievedGroupDate]['package'][cmkey]['allDates'] = tempDateList;
                  }
                });
              }
            }
          }
        });
        resultObject[admin] = tempAdminDataHolder;
      }
    });
    return resultObject;
  }

  computeMeasuresDataPer100kPopSize(response: any, popDict: any, admin0Code?: string) {
    if (isNullOrUndefined(response) || isNullOrUndefined(popDict)) { return response; }
    Object.keys(response).forEach(measure_type => {
      if (response.hasOwnProperty(measure_type) && !isNullOrUndefined(response[measure_type])) {
        Object.keys(response[measure_type]).forEach(admin => {
          if (response[measure_type].hasOwnProperty(admin) && !isNullOrUndefined(response[measure_type][admin])) {
            let popSize;
            if (!isNullOrUndefined(admin0Code)) {
              if (isNullOrUndefined(popDict[admin0Code]) || isNullOrUndefined(popDict[admin0Code][admin])
                || isNullOrUndefined(popDict[admin0Code][admin]['population']) || isNaN(+popDict[admin0Code][admin]['population'])) {
                delete response[measure_type][admin];
              } else {
                popSize = popDict[admin0Code][admin]['population'];
              }
            } else {
              if (isNullOrUndefined(popDict[admin]) || isNullOrUndefined(popDict[admin]['population'])
                || isNaN(+popDict[admin]['population'])) {
                delete response[measure_type][admin];
              } else {
                popSize = popDict[admin]['population'];
              }
            }
            if (!isNullOrUndefined(popSize) && !isNaN(popSize) && popSize > 0) {
              if (!isNullOrUndefined(response[measure_type][admin]['data'])) {
                Object.keys(response[measure_type][admin]['data']).forEach(date => {
                  if (response[measure_type][admin]['data'].hasOwnProperty(date)
                    && !isNullOrUndefined(response[measure_type][admin]['data'][date])
                    && !isNaN(+response[measure_type][admin]['data'][date])) {
                    response[measure_type][admin]['data'][date] =
                      (Math.round((+response[measure_type][admin]['data'][date] * 100000) / popSize)).toFixed(2);
                  }
                });
              }
              if (!isNullOrUndefined(response[measure_type][admin]['non_zero_data'])) {
                Object.keys(response[measure_type][admin]['non_zero_data']).forEach(day => {
                  if (response[measure_type][admin]['non_zero_data'].hasOwnProperty(day)
                    && !isNullOrUndefined(response[measure_type][admin]['non_zero_data'][day])
                    && !isNullOrUndefined(response[measure_type][admin]['non_zero_data'][day]['value'])
                    && !isNaN(+response[measure_type][admin]['non_zero_data'][day]['value'])) {
                    response[measure_type][admin]['non_zero_data'][day]['value'] =
                      (Math.round((+response[measure_type][admin]['non_zero_data'][day]['value'] * 100000) / popSize)).toFixed(2);
                  }
                });
              }
            }
          }
        });
      }
    });
    return response;
  }

  generateNotificationOfNewCountermeasures(cmData: any, timestamp: number, numberOfDays: number) {
    const response = {};
    if (isNullOrUndefined(cmData)) { return response; }
    const minTimestamp = timestamp - numberOfDays * 24 * 60 * 60 * 1000;

    // loop through the cmDate adding data that is between minTimestamp and timestamp
    Object.keys(cmData).forEach(cmName => {
      if (cmData.hasOwnProperty(cmName) && !isNullOrUndefined(cmData[cmName])) {
        Object.keys(cmData[cmName]).forEach(admin => {
          if (cmData[cmName].hasOwnProperty(admin) && !isNullOrUndefined(cmData[cmName][admin])) {
            Object.keys(cmData[cmName][admin]).forEach(timestampAdmin => {
              if (cmData[cmName][admin].hasOwnProperty(timestampAdmin) && !isNullOrUndefined(cmData[cmName][admin][timestampAdmin])) {
                if (timestampAdmin === 'admin1') {
                  Object.keys(cmData[cmName][admin][timestampAdmin]).forEach(admin1 => {
                    if (cmData[cmName][admin][timestampAdmin].hasOwnProperty(admin1)
                      && !isNullOrUndefined(cmData[cmName][admin][timestampAdmin][admin1])) {
                      Object.keys(cmData[cmName][admin][timestampAdmin][admin1]).forEach(timestampAdmin1 => {
                        if (cmData[cmName][admin][timestampAdmin][admin1].hasOwnProperty(timestampAdmin1)
                          && !isNullOrUndefined(cmData[cmName][admin][timestampAdmin][admin1][timestampAdmin1])) {
                          const thisTimestamp = +timestampAdmin1;
                          if (!isNaN(thisTimestamp)) {
                            if (thisTimestamp >= minTimestamp && thisTimestamp <= timestamp) {
                              const adminName = cmData[cmName][admin][timestampAdmin][admin1][timestampAdmin1]['state/province'];
                              const countryName = cmData[cmName][admin][timestampAdmin][admin1][timestampAdmin1]['country'];
                              let fullAdminName = countryName;
                              if (!isNullOrUndefined(adminName) && adminName !== '') { fullAdminName = adminName + ', ' + countryName; }
                              let npiType = 'Imposed';
                              if (cmData[cmName][admin][timestampAdmin][admin1][timestampAdmin1]['restriction'] === '0') {
                                npiType = 'Lifted';
                              }
                              const formatedDate = this.datePipe.transform(thisTimestamp, 'MMM d, y');
                              if (isNullOrUndefined(response[fullAdminName])) { response[fullAdminName] = {}; }
                              if (isNullOrUndefined(response[fullAdminName][formatedDate])) { response[fullAdminName][formatedDate] = {}; }
                              if (isNullOrUndefined(response[fullAdminName][formatedDate][npiType])) {
                                response[fullAdminName][formatedDate][npiType] = [];
                              }
                              response[fullAdminName][formatedDate][npiType].push(cmName);
                            }
                          }
                        }
                      });
                    }
                  });
                } else {
                  const thisTimestamp = +timestampAdmin;
                  if (thisTimestamp >= minTimestamp && thisTimestamp <= timestamp) {
                    const adminName = cmData[cmName][admin][timestampAdmin]['state/province'];
                    const countryName = cmData[cmName][admin][timestampAdmin]['country'];
                    let fullAdminName = countryName;
                    if (!isNullOrUndefined(adminName) && adminName !== '') { fullAdminName = adminName + ', ' + countryName; }
                    let npiType = 'Imposed';
                    if (cmData[cmName][admin][timestampAdmin]['restriction'] === '0') { npiType = 'Lifted'; }
                    const formatedDate = this.datePipe.transform(thisTimestamp, 'MMM d, y');
                    if (isNullOrUndefined(response[fullAdminName])) { response[fullAdminName] = {}; }
                    if (isNullOrUndefined(response[fullAdminName][formatedDate])) { response[fullAdminName][formatedDate] = {}; }
                    if (isNullOrUndefined(response[fullAdminName][formatedDate][npiType])) {
                      response[fullAdminName][formatedDate][npiType] = [];
                    }
                    response[fullAdminName][formatedDate][npiType].push(cmName);
                  }
                }
              }
            });
          }
        });
      }
    });
    return response;
  }
}
