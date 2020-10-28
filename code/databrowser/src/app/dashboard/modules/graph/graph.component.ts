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

import {Component, EventEmitter, HostListener, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChange} from '@angular/core';
import {
  COUNTERMEASURES_RESTRICTION_TYPES,
  DROPDOWN_ITEMS_GLOBAL_US,
  DROPDOWN_ITEMS_X_AXIS,
  DROPDOWN_ITEMS_Y_AXIS,
  DROPDOWN_ITEMS_Y_SCALE
} from '../../../constants/general.constants';
import {ChartCovidService} from '../../../services/chart-covid/chart-covid.service';
import {CurateDataService} from '../../../services/curate-data/curate-data.service';
import {isNullOrUndefined} from 'util';
import {givenISOCodeAndCountriesDictionaryGetCountryName} from '../../../functions/functions';
import {environment} from '../../../../environments/environment';

@Component({
  selector: 'app-graph',
  templateUrl: './graph.component.html',
  styleUrls: ['./graph.component.scss']
})
export class GraphComponent implements OnInit, OnDestroy, OnChanges {
  @Input() covid19OutcomeData: any;
  @Input() controlAttributes: any;
  @Output() selectedAttribute = new EventEmitter<any>();
  private subscribeShareDataObservableService: any;
  measuresAndCounterMeasuresData: any;

  constructor(private chartCovidService: ChartCovidService,
              private curateDataService: CurateDataService) { }

  ngOnInit() {
    if (!isNullOrUndefined(this.controlAttributes) && !isNullOrUndefined(this.covid19OutcomeData)) {
      this.loadData();
    }
  }

  ngOnDestroy(): void {
    if (this.subscribeShareDataObservableService) {
      this.subscribeShareDataObservableService.unsubscribe();
    }
  }

  ngOnChanges(changes: { [propKey: string]: SimpleChange }) {
    if (changes['controlAttributes'] && !changes['controlAttributes'].isFirstChange()) {
      this.loadData();
    }
    if (changes['covid19OutcomeData'] && !changes['covid19OutcomeData'].isFirstChange()) {
      this.loadData();
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize(event) {
    if (!isNullOrUndefined(this.controlAttributes) && !isNullOrUndefined(this.covid19OutcomeData)) {
      this.loadData();
    }
  }

  onSelectedAttribute(item: any) {
    this.selectedAttribute.emit(item);
  }

  private loadData() {
    let covidData;
    const yLabel = this.controlAttributes.yAxis;

    if (yLabel === DROPDOWN_ITEMS_Y_AXIS[0]) {
      covidData = this.covid19OutcomeData['c_data'];
    } else if (yLabel === DROPDOWN_ITEMS_Y_AXIS[1]) {
      covidData = this.covid19OutcomeData['d_data'];
    } else if (yLabel === DROPDOWN_ITEMS_Y_AXIS[2]) {
      covidData = this.covid19OutcomeData['r_data'];
    } else if (yLabel === DROPDOWN_ITEMS_Y_AXIS[3]) {
      covidData = this.covid19OutcomeData['t_data'];
    } else if (yLabel === DROPDOWN_ITEMS_Y_AXIS[4]) {
      covidData = this.covid19OutcomeData['h_data'];
    }  else {
      console.log('Unusual case!');
    }

    let xScaleType = 'date';
    if (this.controlAttributes.xAxis === DROPDOWN_ITEMS_X_AXIS[0]) {
      xScaleType = 'date';
    } else {
      xScaleType = 'linear';
    }

    let yScaleType = 'linear';
    if (this.controlAttributes.yScale === DROPDOWN_ITEMS_Y_SCALE[0]) {
      yScaleType = 'linear';
    } else if (this.controlAttributes.yScale === DROPDOWN_ITEMS_Y_SCALE[1]) {
      yScaleType = 'log';
    } else {
      console.log('Unusual case!');
    }

    let topKAdmins = 15;
    let topKCm = 15;
    let kDays = 1;
    let countermeasureRestriction = COUNTERMEASURES_RESTRICTION_TYPES[0];
    if (!isNullOrUndefined(this.controlAttributes.dataAndDataSourcesConfigs)) {
      if (!isNullOrUndefined(this.controlAttributes.dataAndDataSourcesConfigs.topKAdmins)) {
        topKAdmins = this.controlAttributes.dataAndDataSourcesConfigs.topKAdmins; }
      if (!isNullOrUndefined(this.controlAttributes.dataAndDataSourcesConfigs.topKCm)) {
        topKCm = this.controlAttributes.dataAndDataSourcesConfigs.topKCm; }
      if (!isNullOrUndefined(this.controlAttributes.dataAndDataSourcesConfigs.kDays)) {
        kDays = this.controlAttributes.dataAndDataSourcesConfigs.kDays; }
      if (!isNullOrUndefined(this.controlAttributes.dataAndDataSourcesConfigs.countermeasureRestriction)) {
        countermeasureRestriction = this.controlAttributes.dataAndDataSourcesConfigs.countermeasureRestriction; }
    }

    let data = this.covid19OutcomeData.cm_data;
    if (!isNullOrUndefined(this.controlAttributes.selectedCounterMeasure) && this.controlAttributes.selectedCounterMeasure.length > 0
      && isNullOrUndefined(this.controlAttributes.latlng)) {
      data = this.curateDataService
        .getGeoPoliticalEntitiesDataThatImplementedThisCM(this.covid19OutcomeData.cm_data, this.controlAttributes.selectedCounterMeasure);
      covidData = this.curateDataService
        .getCovidDataForGivenGeoPoliticalEntities(covidData, data);
    }

    let missingMeasuresData = false;
    if (!isNullOrUndefined(this.controlAttributes.clickedLocationIdentity)) {
      covidData = this.curateDataService.getTheFirstK(covidData, topKAdmins, yLabel, this.controlAttributes.clickedLocationIdentity);
      if (isNullOrUndefined(covidData[this.controlAttributes.clickedLocationIdentity.ISO_A2])
        && isNullOrUndefined(covidData[this.controlAttributes.clickedLocationIdentity.NAME])) {
        missingMeasuresData = true;
      }
    } else {
      try {
        const tempId = this.controlAttributes.latlng.customMeta.data.meta.admin;
        covidData = this.curateDataService.getTheFirstK(covidData, topKAdmins, yLabel, {ISO_A2: tempId, NAME: tempId});
      } catch (error) {
        covidData = this.curateDataService.getTheFirstK(covidData, topKAdmins, yLabel);
      }
    }
    data = this.curateDataService.getTheCMForTheGivenCountries(data, covidData);
    let cm_data = this.covid19OutcomeData.cm_data;
    let yaxis3_dtick;
    let location = this.controlAttributes.geo;
    let adminCode;
    if (missingMeasuresData) { location = this.controlAttributes.parentGeo; }
    if (!isNullOrUndefined(this.controlAttributes.latlng) && !isNullOrUndefined(this.controlAttributes.latlng.customMeta)
      && !isNullOrUndefined(this.controlAttributes.latlng.customMeta.data)
      && !isNullOrUndefined(this.controlAttributes.latlng.customMeta.data.meta)
      && !isNullOrUndefined(this.controlAttributes.latlng.customMeta.data.meta.admin)) {
      location = this.controlAttributes.latlng.customMeta.data.meta.admin;
      if (environment.AVAILABLE_ADMIN1_GEOJSON.indexOf(location.toLowerCase()) > -1) {
        adminCode = this.controlAttributes.latlng.customMeta.data.meta.admin;
      }
      cm_data = this.curateDataService.getCMImplementedByThisCountryIncludingEmptyCM(location, cm_data);
      yaxis3_dtick = 1;
      location = givenISOCodeAndCountriesDictionaryGetCountryName(location, this.covid19OutcomeData['dict']);
    }
    const adminType = this.curateDataService.getTheAdminLevelTypesForAGeo(location);
    if (location !== DROPDOWN_ITEMS_GLOBAL_US[0]) {
      location = givenISOCodeAndCountriesDictionaryGetCountryName(location, this.covid19OutcomeData['dict']);
    }
    data = this.curateDataService.getTheFirstKCM(data, topKCm);
    const topK = { 'topKAdmins': topKAdmins, 'topKCm': topKCm, 'kDays': kDays };
    const colors = this.curateDataService.getK_3rdColors(covidData, topKAdmins);
    this.measuresAndCounterMeasuresData = this.chartCovidService.createCombinedPlot(covidData, cm_data, data,
      this.covid19OutcomeData['dict'], this.controlAttributes.xAxis, yLabel, xScaleType, yScaleType, false,
      this.controlAttributes.date, yaxis3_dtick, location, colors, adminType, topK, adminCode, countermeasureRestriction);
  }
}
