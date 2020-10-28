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
import * as L from 'leaflet';
import {MapPopUpService} from '../map-pop-up/map-pop-up.service';
import {isNullOrUndefined} from 'util';
import {DatePipe} from '@angular/common';
import {
  DROPDOWN_ITEMS_GLOBAL_US,
  DROPDOWN_ITEMS_X_AXIS,
  DROPDOWN_ITEMS_Y_AXIS,
  DROPDOWN_ITEMS_Y_SCALE
} from '../../constants/general.constants';
import {GLYPHS, MAP_COLORS_OUTCOMES, MAP_POPUP_OPTIONS} from '../../constants/map.constants';
import {
  formatTheTimestampToDecimalPlacesUsedInData,
  getDaysBetweenTimestampInDays, givenISOCodeAndCountriesDictionaryGetCountryName
} from '../../functions/functions';
import {CurateDataService} from '../curate-data/curate-data.service';

@Injectable({
  providedIn: 'root'
})
export class MapMarkerService {
  static ScaledRadius(val: number, maxVal: number, offset: number): number {
    return offset * (val / maxVal);
  }

  constructor(private mapPopUpService: MapPopUpService,
              private datePipe: DatePipe,
              private curateDataService: CurateDataService) { }

  makeMarkers(covidData: any, items: any, currentGlyph: string) {
    const markers = [];

    let maxVal;
    const yLabel = items['yAxis'];
    let covid19OutcomeData;
    let key;

    if (yLabel === DROPDOWN_ITEMS_Y_AXIS[0]) {
      covid19OutcomeData = covidData['c_data'];
      maxVal = 330000;
      maxVal = this.getMaxValueFromData(covid19OutcomeData, yLabel, maxVal);
      key = 'cases';
    } else if (yLabel === DROPDOWN_ITEMS_Y_AXIS[1]) {
      covid19OutcomeData = covidData['d_data'];
      maxVal = 20000;
      maxVal = this.getMaxValueFromData(covid19OutcomeData, yLabel, maxVal);
      key = 'deaths';
    } else if (yLabel === DROPDOWN_ITEMS_Y_AXIS[2]) {
      covid19OutcomeData = covidData['r_data'];
      maxVal = 60000;
      maxVal = this.getMaxValueFromData(covid19OutcomeData, yLabel, maxVal);
      key = 'recoveries';
    } else if (yLabel === DROPDOWN_ITEMS_Y_AXIS[3]) {
      covid19OutcomeData = covidData['t_data'];
      maxVal = 330000;
      maxVal = this.getMaxValueFromData(covid19OutcomeData, yLabel, maxVal);
      key = 'tests';
    } else if (yLabel === DROPDOWN_ITEMS_Y_AXIS[4]) {
      covid19OutcomeData = covidData['h_data'];
      maxVal = 100000;
      maxVal = this.getMaxValueFromData(covid19OutcomeData, yLabel, maxVal);
      key = 'hospitalization';
    }  else {
      console.log('Unusual case!' + yLabel);
    }

    let xScaleType = 'date';
    if (items['xAxis'] === DROPDOWN_ITEMS_X_AXIS[0]) {
      xScaleType = 'date';
    } else {
      xScaleType = 'linear';
    }

    let yScaleType = 'linear';
    if (items['yScale'] === DROPDOWN_ITEMS_Y_SCALE[0]) {
      yScaleType = 'linear';
    } else if (items['yScale'] === DROPDOWN_ITEMS_Y_SCALE[1]) {
      yScaleType = 'log';
    } else {
      console.log('Unusual case!');
    }

    const selectedCounterMeasureArray = items['selectedCounterMeasure'];
    if (!isNullOrUndefined(selectedCounterMeasureArray) && selectedCounterMeasureArray.length > 0
      && !isNullOrUndefined(covid19OutcomeData) && !isNullOrUndefined(covidData['cm_data'])) {
      let data = this.curateDataService
        .getGeoPoliticalEntitiesDataThatImplementedThisCM(covidData['cm_data'], selectedCounterMeasureArray);
      data = this.curateDataService.filterCMDataByDate(data, covid19OutcomeData, items);
      covid19OutcomeData = this.curateDataService.getCovidDataForGivenGeoPoliticalEntities(covid19OutcomeData, data);
    }
    if (!isNullOrUndefined(covid19OutcomeData)) {
      Object.keys(covid19OutcomeData).forEach(country => {
        if (covid19OutcomeData.hasOwnProperty(country) && !isNullOrUndefined(covid19OutcomeData[country])) {
          let currentValue = 0;
          let lat;
          let lon;
          if (items.xAxis === DROPDOWN_ITEMS_X_AXIS[0]) {
            const x_value = formatTheTimestampToDecimalPlacesUsedInData(+items['date'], covid19OutcomeData[country]['data']);
            if (!isNullOrUndefined(covid19OutcomeData[country]['data'])
              && !isNullOrUndefined(covid19OutcomeData[country]['data'][x_value])) {
              const countryData = covid19OutcomeData[country];
              currentValue = covid19OutcomeData[country]['data'][x_value];
              lat = +countryData['Lat'];
              lon = +countryData['Long'];
              if ((isNullOrUndefined(lat) || isNaN(lat) || isNullOrUndefined(lon) || isNaN(lon))) {
                try {
                  if (countryData['Province/State'] === country) {
                    lat = +covidData['dict'][countryData['Country/Region']][country]['Lat'];
                    lon = +covidData['dict'][countryData['Country/Region']][country]['Long'];
                  } else {
                    lat = +covidData['dict'][country]['Lat'];
                    lon = +covidData['dict'][country]['Long'];
                  }
                } catch (error) {
                  console.log(error);
                }
              }
            }
          } else {
            if (!isNullOrUndefined(covid19OutcomeData[country]['non_zero_data'])) {
              const countryData = covid19OutcomeData[country]['non_zero_data'];
              if (isNullOrUndefined(countryData[items['date']])
                || isNullOrUndefined(countryData[items['date']]['value'])) {
                const lastKey = Object.keys(countryData)[Object.keys(countryData).length - 1];
                if (+items['date'] > +lastKey) {
                  currentValue = countryData[lastKey]['value'];
                  lat = +covid19OutcomeData[country]['Lat'];
                  lon = +covid19OutcomeData[country]['Long'];
                  if ((isNullOrUndefined(lat) || isNaN(lat) || isNullOrUndefined(lon) || isNaN(lon))) {
                    try {
                      if (countryData['Province/State'] === country) {
                        lat = +covidData['dict'][covid19OutcomeData[country]['Country/Region']][country]['Lat'];
                        lon = +covidData['dict'][covid19OutcomeData[country]['Country/Region']][country]['Long'];
                      } else {
                        lat = +covidData['dict'][country]['Lat'];
                        lon = +covidData['dict'][country]['Long'];
                      }
                    } catch (error) {
                      console.log(error);
                    }
                  }
                }
              } else {
                currentValue = countryData[items['date']]['value'];
                lat = +covid19OutcomeData[country]['Lat'];
                lon = +covid19OutcomeData[country]['Long'];
                if ((isNullOrUndefined(lat) || isNaN(lat) || isNullOrUndefined(lon) || isNaN(lon))) {
                  try {
                    if (countryData['Province/State'] === country) {
                      lat = +covidData['dict'][covid19OutcomeData[country]['Country/Region']][country]['Lat'];
                      lon = +covidData['dict'][covid19OutcomeData[country]['Country/Region']][country]['Long'];
                    } else {
                      lat = +covidData['dict'][country]['Lat'];
                      lon = +covidData['dict'][country]['Long'];
                    }
                  } catch (error) {
                    console.log(error);
                  }
                }
              }
            }
          }
          if (!isNullOrUndefined(lat) && !isNullOrUndefined(lon) && currentValue > 0 && maxVal > 0) {
            const latLngBaseOne = L.latLng([lat, lon]);
            let curatedValue = currentValue;
            let curatedMaxVal = maxVal;
            let offset;
            if (items['yScale'] === DROPDOWN_ITEMS_Y_SCALE[1]) {
              curatedValue = Math.log10(+curatedValue);
              curatedMaxVal = Math.log10(+maxVal);
            }
            // specify popup options
            const popupOffsetPosition = L.point(0, -5);
            MAP_POPUP_OPTIONS['offset'] = popupOffsetPosition;
            const popupContent = this.mapPopUpService.makeCasesPopup(country, currentValue.toString(), items['yAxis']);

            if (currentGlyph === GLYPHS.spikes.key) {
              if (items['yScale'] === DROPDOWN_ITEMS_Y_SCALE[1]) { offset = 15; } else {offset = 30; }
              const latLngBaseTwo = L.latLng([lat, lon + 1]);
              const latLngTop =
                L.latLng([lat + MapMarkerService.ScaledRadius(curatedValue, curatedMaxVal, offset), lon + 0.5]);
              const polyline = L.polyline([latLngBaseOne, latLngTop, latLngBaseTwo],
                {color: MAP_COLORS_OUTCOMES[key], weight: 1});

              polyline.on('mouseover', () => {
                polyline.bindPopup(popupContent, MAP_POPUP_OPTIONS).openPopup();
              });
              polyline.on('mouseout', () => {
                polyline.closePopup();
              });

              markers.push(polyline);
            } else if (currentGlyph === GLYPHS.bubbles.key) {
              if (items['yScale'] === DROPDOWN_ITEMS_Y_SCALE[1]) { offset = 300000; } else {offset = 900000; }
              const bubble = L.circle(latLngBaseOne, {
                color: MAP_COLORS_OUTCOMES[key],
                fillColor: MAP_COLORS_OUTCOMES[key],
                fillOpacity: 0.5,
                weight: 1.25,
                radius: MapMarkerService.ScaledRadius(curatedValue, curatedMaxVal, offset)
              });

              bubble.on('mouseover', () => {
                bubble.bindPopup(popupContent, MAP_POPUP_OPTIONS).openPopup();
              });
              bubble.on('mouseout', () => {
                bubble.closePopup();
              });

              markers.push(bubble);
            }
          }
        }
      });
    }
    return markers;
  }

  private getMaxValueFromData(covid19OutcomeData, yLabel, maxVal) {
    if (!isNullOrUndefined(covid19OutcomeData)) {
      const highestDataObj = this.curateDataService.getTheFirstK(covid19OutcomeData, 1, yLabel);
      const keys = Object.keys(highestDataObj);
      if (!isNullOrUndefined(keys)) {
        const highestObj = keys[0];
        if (!isNullOrUndefined(highestObj)
          && !isNullOrUndefined(covid19OutcomeData[highestObj])
          && !isNullOrUndefined(covid19OutcomeData[highestObj]['data'])) {
          const highestObjData = covid19OutcomeData[highestObj]['data'];
          maxVal = highestObjData[Object.keys(highestObjData)[Object.keys(highestObjData).length - 1]];
        }
      }
    }
    return maxVal;
  }

  createCountermeasureSimilarityBars(covidData, items) {
    if (isNullOrUndefined(items.latlng) || isNullOrUndefined(items.latlng.customMeta) || isNullOrUndefined(items.latlng.customMeta.data)
      || isNullOrUndefined(items.latlng.customMeta.data.meta) || isNullOrUndefined(items.latlng.customMeta.data.meta.admin)) {
      const similarityWithGlobalAsAtThisDate = this.similarityAnalysis(covidData, items, 'global');
      return this.createSimilarityBarsGivenCountriesSimilarityArray('Global',
        similarityWithGlobalAsAtThisDate, items, covidData);
    }
    const similarityWithThisCountryAsAtThisDate = this.similarityAnalysis(covidData, items);

    const selectedTerritoryName = items.latlng.customMeta.data.meta.admin;

    const selectedTerritoryHumanName = givenISOCodeAndCountriesDictionaryGetCountryName(selectedTerritoryName, covidData.dict);

    return this.createSimilarityBarsGivenCountriesSimilarityArray(selectedTerritoryHumanName,
      similarityWithThisCountryAsAtThisDate, items, covidData);
  }

  createSimilarityBarsGivenCountriesSimilarityArray(selectedTerritoryHumanName, countriesSimilarityArrayAsAtThisDate, items, covidData) {
    const countermeasureSimilarityBars = [];
    for (const territoryName of Object.keys(countriesSimilarityArrayAsAtThisDate)) {
      const territory = countriesSimilarityArrayAsAtThisDate[territoryName];
      if (!isNullOrUndefined(territory) && territory.hasOwnProperty('latlng')) {
        const countryLatitude = +territory['latlng'][0];
        const countryLongitude = +territory['latlng'][1];

        let fullLength = 1.5;
        let fullWidth = 0.5;

        if (!isNullOrUndefined(items) && !isNullOrUndefined(items.parentGeo)
          && items.parentGeo !== DROPDOWN_ITEMS_GLOBAL_US[0]) {
          fullLength = fullLength * 0.5;
          fullWidth = fullWidth * 0.4;
        }

        const lengthOfBar = fullLength * territory['degreeOfSimilarity'];
        const halflength = fullLength * 0.5;
        const halfWidth = fullWidth * 0.5;
        const quarterWidth = halfWidth * 0.5;

        const latlng1 = L.latLng([countryLatitude - halfWidth, countryLongitude - halflength]);
        const latlng2 = L.latLng([countryLatitude + halfWidth, countryLongitude + halflength]);
        const latlng3 = L.latLng([countryLatitude - quarterWidth, countryLongitude - halflength]);
        const latlng4 = L.latLng([countryLatitude + quarterWidth, countryLongitude - halflength + lengthOfBar]);
        const bounds = L.latLngBounds(latlng1, latlng2);
        const darkerBounds = L.latLngBounds(latlng3, latlng4);
        // create similarity bar
        const rectBar = L.rectangle(bounds, {color: '#888', weight: 2, fillColor: '#fff'});
        const rectBarDarker = L.rectangle(darkerBounds, {color: '#808080', weight: 1, fillOpacity: 1});

        // specify popup options
        const popupOffsetPosition = L.point(0, -5);
        MAP_POPUP_OPTIONS['offset'] = popupOffsetPosition;
        const popupContent = this.mapPopUpService
          .makeCMSimilarityPopup(givenISOCodeAndCountriesDictionaryGetCountryName(territoryName, covidData.dict),
            selectedTerritoryHumanName,
            territory['degreeOfSimilarity'], territory['countermeasuresImplemented']);

        rectBar.on('mouseover', () => {
          rectBar.bindPopup(popupContent, MAP_POPUP_OPTIONS).openPopup();
        });
        rectBarDarker.on('mouseover', () => {
          rectBar.bindPopup(popupContent, MAP_POPUP_OPTIONS).openPopup();
        });

        rectBar.on('mouseout', () => {
          rectBar.closePopup();
        });
        rectBarDarker.on('mouseout', () => {
          rectBar.closePopup();
        });

        countermeasureSimilarityBars.push(rectBar);
        countermeasureSimilarityBars.push(rectBarDarker);
      }
    }
    return countermeasureSimilarityBars;

  }

  makeCounterMeasuresGeoJSON(covidData: any, items: any, geoJSON) {
    let geoJSONToReturn = {type: 'FeatureCollection', features: []};
    const selectedCounterMeasureArray = items['selectedCounterMeasure'];
    const cmData = covidData['cm_data'];
    if (!isNullOrUndefined(selectedCounterMeasureArray) && selectedCounterMeasureArray.length > 0 && !isNullOrUndefined(cmData)) {
      let countriesIntersection = [];
      const countrySets = {};
      for (const selectedCounterMeasure of selectedCounterMeasureArray) {
        if (cmData.hasOwnProperty(selectedCounterMeasure)) {
          const counterMeasureObjectsPerCountry = cmData[selectedCounterMeasure];
          const thisData = {};
          if (!isNullOrUndefined(counterMeasureObjectsPerCountry)) {
            Object.keys(counterMeasureObjectsPerCountry).forEach(countryName => {
              if (counterMeasureObjectsPerCountry.hasOwnProperty(countryName)
                && !isNullOrUndefined(counterMeasureObjectsPerCountry[countryName])) {
                const countryObject = counterMeasureObjectsPerCountry[countryName];
                Object.keys(countryObject).forEach(cm_time => {
                  if (countryObject.hasOwnProperty(cm_time)) {
                    if (items['xAxis'] === DROPDOWN_ITEMS_X_AXIS[0]) {
                      if (+cm_time <= +items['date']) {
                        if (isNullOrUndefined(thisData[selectedCounterMeasure])) { thisData[selectedCounterMeasure] = {}; }
                        if (isNullOrUndefined(thisData[selectedCounterMeasure][countryName])) {
                          thisData[selectedCounterMeasure][countryName] = {};
                        }
                        thisData[selectedCounterMeasure][countryName][cm_time] = countryObject[cm_time];
                      }
                    } else {
                      const selectedYAxis = items['yAxis'];
                      let dataToShow = null;
                      if (selectedYAxis.toLowerCase() === 'confirmed deaths') {
                        dataToShow = covidData['d_data'];
                      } else if (selectedYAxis.toLowerCase() === 'recoveries') {
                        dataToShow = covidData['r_data'];
                      } else if (selectedYAxis.toLowerCase() === 'confirmed cases') {
                        dataToShow = covidData['c_data'];
                      } else if (selectedYAxis.toLowerCase() === 'testing') {
                        dataToShow = covidData['t_data'];
                      } else if (selectedYAxis.toLowerCase() === 'hospitalization') {
                        dataToShow = covidData['h_data'];
                      }
                      if (!isNullOrUndefined(dataToShow[countryName])
                        && !isNullOrUndefined(dataToShow[countryName]['non_zero_data'])
                        && !isNullOrUndefined(dataToShow[countryName]['non_zero_data'][1])
                        && !isNullOrUndefined(dataToShow[countryName]['non_zero_data'][1]['date'])) {
                        const baseTime = dataToShow[countryName]['non_zero_data'][1]['date'];
                        if (!isNaN(+baseTime)) {
                          const baseDays = getDaysBetweenTimestampInDays(+cm_time, +baseTime);
                          if (baseDays <= +items['date']) {
                            if (isNullOrUndefined(thisData[selectedCounterMeasure])) { thisData[selectedCounterMeasure] = {}; }
                            if (isNullOrUndefined(thisData[selectedCounterMeasure][countryName])) {
                              thisData[selectedCounterMeasure][countryName] = {};
                            }
                            thisData[selectedCounterMeasure][countryName][cm_time] = countryObject[cm_time];
                          }
                        }
                      }
                    }
                  }
                });
              }
            });
          }
          let countriesPresent = [];
          if (!isNullOrUndefined(thisData) && !isNullOrUndefined(thisData[selectedCounterMeasure])) {
            countriesPresent = Object.keys(thisData[selectedCounterMeasure]);
          }
          countrySets[selectedCounterMeasure] = countriesPresent;
        }
      }
      const countrySetKeys = Object.keys(countrySets);

      countriesIntersection = countrySets[countrySetKeys[0]];
      if (countrySetKeys.length > 1) {
        for (let i = 0; i < countrySetKeys.length - 1; i++) {
          countriesIntersection = countriesIntersection.filter(function(x) {
            if (countrySets[countrySetKeys[i + 1]].indexOf(x) !== -1) {
              return true;
            } else {
              return false;
            }
          });
        }
      } else {
        countriesIntersection = countrySets[countrySetKeys[0]];
      }

      // check if countries has anything inside
      for (const country of countriesIntersection) {
        if (!isNullOrUndefined(country)) {
          const geoJSONFeature = geoJSON.features.find(feature => feature.properties.ISO_A2 === country);
          if (!isNullOrUndefined(geoJSONFeature)) {
            geoJSONFeature.properties['counterMeasure'] = this.titleCase(selectedCounterMeasureArray.join(', '));
          }
        }
      }

      geoJSONToReturn = this.addDensityForGeoJSON(covidData, items, geoJSON);
    } else if (!isNullOrUndefined(covidData)) {
      geoJSONToReturn = this.addDensityForGeoJSON(covidData, items, geoJSON);
    } else {
      geoJSONToReturn = null;
    }
    return geoJSONToReturn;
  }

  makeAmin1CounterMeasuresGeoJSON(covidData: any, items: any, geoJSON) {
    let geoJSONToReturn = {type: 'FeatureCollection', features: []};
    const selectedCounterMeasureArray = items['selectedCounterMeasure'];
    const cmData = covidData['cm_data'];
    if (!isNullOrUndefined(selectedCounterMeasureArray) && selectedCounterMeasureArray.length > 0 && !isNullOrUndefined(cmData)) {
      let countriesIntersection = [];
      const countrySets = {};
      for (const selectedCounterMeasure of selectedCounterMeasureArray) {
        if (cmData.hasOwnProperty(selectedCounterMeasure)) {
          const counterMeasureObjectsPerCountry = cmData[selectedCounterMeasure];
          const thisData = {};
          if (!isNullOrUndefined(counterMeasureObjectsPerCountry)) {
            Object.keys(counterMeasureObjectsPerCountry).forEach(countryName => {
              if (counterMeasureObjectsPerCountry.hasOwnProperty(countryName)
                && !isNullOrUndefined(counterMeasureObjectsPerCountry[countryName])) {
                const countryObject = counterMeasureObjectsPerCountry[countryName];
                Object.keys(countryObject).forEach(cm_time => {
                  if (countryObject.hasOwnProperty(cm_time)) {
                    if (items['xAxis'] === DROPDOWN_ITEMS_X_AXIS[0]) {
                      if (+cm_time <= +items['date']) {
                        if (isNullOrUndefined(thisData[selectedCounterMeasure])) { thisData[selectedCounterMeasure] = {}; }
                        if (isNullOrUndefined(thisData[selectedCounterMeasure][countryName])) {
                          thisData[selectedCounterMeasure][countryName] = {};
                        }
                        thisData[selectedCounterMeasure][countryName][cm_time] = countryObject[cm_time];
                      }
                    } else {
                      const selectedYAxis = items['yAxis'];
                      let dataToShow = null;
                      if (selectedYAxis.toLowerCase() === 'confirmed deaths') {
                        dataToShow = covidData['d_data'];
                      } else if (selectedYAxis.toLowerCase() === 'recoveries') {
                        dataToShow = covidData['r_data'];
                      } else if (selectedYAxis.toLowerCase() === 'confirmed cases') {
                        dataToShow = covidData['c_data'];
                      } else if (selectedYAxis.toLowerCase() === 'testing') {
                        dataToShow = covidData['t_data'];
                      } else if (selectedYAxis.toLowerCase() === 'hospitalization') {
                        dataToShow = covidData['h_data'];
                      }
                      if (!isNullOrUndefined(dataToShow[countryName])
                        && !isNullOrUndefined(dataToShow[countryName]['non_zero_data'])
                        && !isNullOrUndefined(dataToShow[countryName]['non_zero_data'][1])
                        && !isNullOrUndefined(dataToShow[countryName]['non_zero_data'][1]['date'])) {
                        const baseTime = dataToShow[countryName]['non_zero_data'][1]['date'];
                        if (!isNaN(+baseTime)) {
                          const baseDays = getDaysBetweenTimestampInDays(+cm_time, +baseTime);
                          if (baseDays <= +items['date']) {
                            if (isNullOrUndefined(thisData[selectedCounterMeasure])) { thisData[selectedCounterMeasure] = {}; }
                            if (isNullOrUndefined(thisData[selectedCounterMeasure][countryName])) {
                              thisData[selectedCounterMeasure][countryName] = {};
                            }
                            thisData[selectedCounterMeasure][countryName][cm_time] = countryObject[cm_time];
                          }
                        }
                      }
                    }
                  }
                });
              }
            });
          }
          let countriesPresent = [];
          if (!isNullOrUndefined(thisData) && !isNullOrUndefined(thisData[selectedCounterMeasure])) {
            countriesPresent = Object.keys(thisData[selectedCounterMeasure]);
          }
          countrySets[selectedCounterMeasure] = countriesPresent;
        }
      }
      const countrySetKeys = Object.keys(countrySets);

      countriesIntersection = countrySets[countrySetKeys[0]];
      if (countrySetKeys.length > 1) {
        for (let i = 0; i < countrySetKeys.length - 1; i++) {
          countriesIntersection = countriesIntersection.filter(function(x) {
            if (countrySets[countrySetKeys[i + 1]].indexOf(x) !== -1) {
              return true;
            } else {
              return false;
            }
          });
        }
      } else {
        countriesIntersection = countrySets[countrySetKeys[0]];
      }

      // check if countries has anything inside
      for (const country of countriesIntersection) {
        if (!isNullOrUndefined(country)) {
          const geoJSONFeature = geoJSON.features.find(feature => (feature.properties.NAME) === country);
          if (!isNullOrUndefined(geoJSONFeature)) {
            geoJSONFeature.properties['counterMeasure'] = this.titleCase(selectedCounterMeasureArray.join(', '));
          }
        }
      }
      geoJSONToReturn = this.addDensityForGeoJSON(covidData, items, geoJSON);
    } else if (!isNullOrUndefined(covidData)) {
      geoJSONToReturn = this.addDensityForGeoJSON(covidData, items, geoJSON);
    } else {
      geoJSONToReturn = null;
    }
    return geoJSONToReturn;
  }

  addDensityForGeoJSON(covidData, items, geoJSON) {
    const selectedYAxis = items['yAxis'];
    const geo = items['parentGeo'];
    let dataToShow = null;
    if (selectedYAxis.toLowerCase() === 'confirmed deaths') {
      dataToShow = covidData['d_data'];
    } else if (selectedYAxis.toLowerCase() === 'recoveries') {
      dataToShow = covidData['r_data'];
    } else if (selectedYAxis.toLowerCase() === 'confirmed cases') {
      dataToShow = covidData['c_data'];
    } else if (selectedYAxis.toLowerCase() === 'testing' && geo.toLowerCase() === 'us') {
      dataToShow = covidData['t_data'];
    } else if (selectedYAxis.toLowerCase() === 'hospitalization' && geo.toLowerCase() === 'us') {
      dataToShow = covidData['h_data'];
    }

    let densityPartitionArray = [];
    if (items['yScale'] === DROPDOWN_ITEMS_Y_SCALE[1]) {
      densityPartitionArray = [1, 10, 100, 1000, 10000, 100000, 1000000, 10000000];
    } else {
      densityPartitionArray = this.getDensityPartitionArrayForLinearScale(dataToShow, geo, selectedYAxis);
    }

    if (!isNullOrUndefined(dataToShow) && !isNullOrUndefined(Object.keys(dataToShow)[0]) && geoJSON.features.length > 0) {
      Object.keys(dataToShow).forEach(country => {
        let geoJSONFeature = null;
        if (geo === DROPDOWN_ITEMS_GLOBAL_US[0]) {
          geoJSONFeature = geoJSON.features
            .find(feature => feature.properties.ISO_A2.toLowerCase() === country.toLowerCase());
          if (!isNullOrUndefined(geoJSONFeature)) {
            geoJSONFeature.properties['density'] = this.getTheCurrentMetric(dataToShow, country, items);
            geoJSONFeature.properties['densityFeature'] = selectedYAxis;
          }
        } else {
          geoJSONFeature = geoJSON.features
            .find(feature => feature.properties.NAME.toLowerCase() === country.toLowerCase());
          if (!isNullOrUndefined(geoJSONFeature)) {
            geoJSONFeature.properties['density'] = this.getTheCurrentMetric(dataToShow, country, items, selectedYAxis.toLowerCase());
            geoJSONFeature.properties['densityFeature'] = selectedYAxis;
          }
        }
      });
      geoJSON.features.forEach(feature => {
        feature.properties['densityPartition'] = densityPartitionArray;
      });
    } else {
      return null;
    }

    return geoJSON;
  }

  getTheLastMetric(dataToShow, country, selectedMetric?: string) {
    if (dataToShow.hasOwnProperty(country)) {
      let dataKeys = null;
      dataKeys = Object.keys(dataToShow[country]['data']);
      const lastDate = dataKeys[dataKeys.length - 1];
      return dataToShow[country]['data'][lastDate];
    } else {
      return 0;
    }
  }

  getTheCurrentMetric(dataToShow, country, items: any, selectedMetric?: string) {
    if (dataToShow.hasOwnProperty(country)) {
      if (items.xAxis === DROPDOWN_ITEMS_X_AXIS[0]) {
        let x_value = formatTheTimestampToDecimalPlacesUsedInData(+items['date'], dataToShow[country]['data']);
        if (isNullOrUndefined(dataToShow[country]['data'])) {
          return 0;
        } else if (isNullOrUndefined(dataToShow[country]['data'][x_value])) {
          const closestSmallestTimestamp = Object.keys(dataToShow[country]['data']).reverse().find(timestamp => +timestamp <= +x_value);
          x_value = formatTheTimestampToDecimalPlacesUsedInData(+closestSmallestTimestamp, dataToShow[country]['data']);
        }
        return dataToShow[country]['data'][x_value];
      } else {
        if (isNullOrUndefined(dataToShow[country]['non_zero_data'])) {
          return 0;
        }
        if (isNullOrUndefined(dataToShow[country]['non_zero_data'][items['date']])) {
          const dataKeys = Object.keys(dataToShow[country]['non_zero_data']);
          const lastKey = dataKeys[dataKeys.length - 1];
          if (+items['date'] > +lastKey) {
            return dataToShow[country]['non_zero_data'][lastKey]['value'];
          }
        } else { return dataToShow[country]['non_zero_data'][items['date']]['value']; }
      }
    } else {
      return 0;
    }
  }

  titleCase(str) {
    str = str.toLowerCase().split('_');
    for (let i = 0; i < str.length; i++) {
      str[i] = str[i].charAt(0).toUpperCase() + str[i].slice(1);
    }
    return str.join(' ');
  }

  private getDensityPartitionArrayForLinearScale(dataToShow: any, geo: any, selectedYAxis: string) {
    if (!isNullOrUndefined(dataToShow)) {
      const densitiesArray = [];
      let densityPartitionArray: any[];
      Object.keys(dataToShow).forEach(country => {
        if (geo === DROPDOWN_ITEMS_GLOBAL_US[0]) {
          densitiesArray.push(this.getTheLastMetric(dataToShow, country));
        } else {
          densitiesArray.push(this.getTheLastMetric(dataToShow, country, selectedYAxis.toLowerCase()));
        }
      });

      densitiesArray.sort(function(a, b) {return a - b; });
      const lastIndex = densitiesArray.length - 1;
      const median = Math.floor(lastIndex / 2);
      const firstQuartile = Math.floor(lastIndex / 4);
      let dOneOfFirstQuartile = Math.floor(firstQuartile / 4);
      if (dOneOfFirstQuartile === 0) {
        dOneOfFirstQuartile = 1;
      }

      let dTwoOfFirstQuartile = Math.floor(firstQuartile / 8);
      if (dTwoOfFirstQuartile === 0) {
        // set to zero probably dataset length is short reduce steps from third quartile
        dTwoOfFirstQuartile = 0;
      }

      let dThreeOfFirstQuartile = Math.floor(firstQuartile / 12);
      if (dThreeOfFirstQuartile === 0) {
        dThreeOfFirstQuartile = 1;
      }
      const thirdQuartile = median + firstQuartile;
      const firstPartLastQuartile = thirdQuartile + dOneOfFirstQuartile;
      const secondPartLastQuartile = firstPartLastQuartile + dOneOfFirstQuartile;
      const thirdPartLastQuartile = secondPartLastQuartile + dOneOfFirstQuartile;
      const fourthPartLastQuartile = thirdPartLastQuartile + dTwoOfFirstQuartile;
      const fifthPartLastQuartile = fourthPartLastQuartile + dTwoOfFirstQuartile;
      const sixthPartLastQuartile = fifthPartLastQuartile + dThreeOfFirstQuartile;

      densityPartitionArray = [
        +densitiesArray[thirdQuartile - Math.floor(firstQuartile / 4)],
        +densitiesArray[firstPartLastQuartile],
        +densitiesArray[secondPartLastQuartile],
        +densitiesArray[thirdPartLastQuartile],
        +densitiesArray[fourthPartLastQuartile],
        +densitiesArray[fifthPartLastQuartile],
        +densitiesArray[sixthPartLastQuartile],
        +densitiesArray[lastIndex]
      ];
      // remove duplicates
      const densityArrayToSend = Array.from(new Set(densityPartitionArray));
      return densityArrayToSend;
    }
    return [];
  }

  private similarityAnalysis(covidData: any, items: any, scope?: string) {
    let similarityWithThisCountryAsAtThisDate: {};
    // a single country is highlighted
    let cmsImplementedByThisCountryAsAtThisDate: any;
    if (scope === 'global') {
      const globalCountermeasures = Object.keys(covidData['cm_data']);
      similarityWithThisCountryAsAtThisDate = this.curateDataService
        .getSimilarityWithThisCountryAsAtThisDate('', globalCountermeasures, +items['date'], items['xAxis'], covidData);
    } else {
      cmsImplementedByThisCountryAsAtThisDate = this.curateDataService
        .getCMsImplementedByThisCountryAsAtThisDate(items.latlng.customMeta.data.meta.admin, +items['date'], items['xAxis'], covidData);
      similarityWithThisCountryAsAtThisDate = this.curateDataService.getSimilarityWithThisCountryAsAtThisDate(
        items.latlng.customMeta.data.meta.admin, cmsImplementedByThisCountryAsAtThisDate, +items['date'], items['xAxis'], covidData);
    }
    return similarityWithThisCountryAsAtThisDate;
  }
}
