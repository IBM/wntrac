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

import {ChangeDetectorRef, Component, OnDestroy, OnInit} from '@angular/core';
import {DataLoaderService} from '../services/data-loader/data-loader.service';
import {
  COUNTERMEASURES_RESTRICTION_TYPES,
  DROPDOWN_ITEMS_GLOBAL_US,
  DROPDOWN_ITEMS_X_AXIS,
  DROPDOWN_ITEMS_Y_AXIS,
  DROPDOWN_ITEMS_Y_SCALE, IMPORTANT_DATES, LANDING_PAGE_URL, MEASURES_DATA_SOURCES, ZOOM_LEVELS_FOR_ADMINS_NEEDING_SPECIAL_HANDLING_OF_ZOOM
} from '../constants/general.constants';
import {MapMarkerService} from '../services/map-marker/map-marker.service';
import {isNullOrUndefined} from 'util';
import {GLYPHS} from '../constants/map.constants';
import {CurateDataService} from '../services/curate-data/curate-data.service';
import * as L from 'leaflet';
import {forkJoin, of} from 'rxjs';
import {DatePipe} from '@angular/common';
import {environment} from '../../environments/environment';
export interface Tile {

  cols: number;
  rows: number;
  text: string;
}
@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  currentGlyph = GLYPHS.choropleth;
  markers: L.Marker[] = [];
  polyLines: L.Polyline[];
  zoomCenterObj = {  center: L.latLng([0.0, 0.0]), zoom: 2, timestamp: new Date().getTime(), admin: null };
  center = L.latLng([0.0, 0.0]);
  zoom = 2;
  covid19OutcomeData: any = {};
  geoJSONObject: any;
  admin1GeoJSONObject: any;
  rawGEOJSONObject: any;
  countermeasureSimilarityBars: any;
  private xAxis = DROPDOWN_ITEMS_X_AXIS[0];
  private yAxis = DROPDOWN_ITEMS_Y_AXIS[0];
  private yScale = DROPDOWN_ITEMS_Y_SCALE[0];
  private geo = DROPDOWN_ITEMS_GLOBAL_US[0];
  // uncomment this to revert back to days since as default x-axis
  // private date = getDaysBtnCurrentMillsAndGivenMills(IMPORTANT_DATES.start.getTime());
  private date = IMPORTANT_DATES.current.getTime();
  private selectedCounterMeasure = [];
  private subscribeConfirmedGlobal: any;
  private subscribeConfirmedUS: any;
  private subscribeStatsMetadata: any;
  private chartSelectedTerritory: any;
  private controlAttributes = {xAxis: this.xAxis,
    yAxis: this.yAxis,
    yScale: this.yScale,
    geo: this.geo,
    parentGeo: this.geo,
    date: this.date,
    selectedCounterMeasure: this.selectedCounterMeasure,
    dataAndDataSourcesConfigs: {measuresDataSources: MEASURES_DATA_SOURCES, verifiedCMData: true, topKAdmins: 15, topKCm: 5, kDays: 7,
      per100kPop: false, showSimilarityBars: true, countermeasureRestriction: COUNTERMEASURES_RESTRICTION_TYPES[0]}
  };
  private metadata: any;
  noOfNotifications;
  disabledButton = true;
  token: string;
  npiNotificationObject;
  popOverMsg = ``;
  numberOfDaysToShowPopover  = 7;
  landingPageUrl = LANDING_PAGE_URL;

  constructor(private jhuDataLoaderService: DataLoaderService, private mapMarkerService: MapMarkerService,
              private curateDataService: CurateDataService, private ref: ChangeDetectorRef, private datePipe: DatePipe) {}

  ngOnInit() {
    this.loadData(DROPDOWN_ITEMS_GLOBAL_US[0]);
  }

  ngOnDestroy(): void {
    if (this.subscribeConfirmedGlobal) {
      this.subscribeConfirmedGlobal.unsubscribe();
    }
    if (this.subscribeStatsMetadata) {
      this.subscribeStatsMetadata.unsubscribe();
    }
    if (this.subscribeConfirmedUS) {
      this.subscribeConfirmedUS.unsubscribe();
    }
  }

  onSelectedAttribute(item: any) {
    if (item.hasOwnProperty('secondary')) {
      if (item.hasOwnProperty('dataAndDataSourcesConfigs')) {
        // load new data from defined data sources
        item.secondary.latlng = null;
        item.secondary.selectedCounterMeasure = [];
        item.secondary.geo = item.secondary.parentGeo;
        this.controlAttributes = item.secondary;
        const tempDataAndDataSourcesConfigs = Object.assign({}, item['dataAndDataSourcesConfigs']);
        tempDataAndDataSourcesConfigs['normaliseChange'] = item['normaliseChange'];
        this.loadData(item.secondary['geo'], tempDataAndDataSourcesConfigs);
        this.setZoomAndCenterUsingFitsBound(item.secondary['geo'], item.secondary.parentGeo, item.secondary.latlng);
      } else if (item.hasOwnProperty('dataAndDataSourcesConfigsHold')) {
        this.controlAttributes = item.secondary;
        this.ref.detectChanges();
      } else if (item.hasOwnProperty('geo')) {
        // load new geojsons and data
        this.controlAttributes = item.secondary;
        this.loadData(item['geo'], item.secondary['dataAndDataSourcesConfigs']);
        this.setZoomAndCenterUsingFitsBound(item['geo'], item.secondary.parentGeo, item.secondary.latlng);
      } else {
        this.controlAttributes = item.secondary;
        this.reLoadData();
      }

      if (!isNullOrUndefined(item.secondary.latlng) && !isNullOrUndefined(item.secondary.latlng.latlng)
        && item.secondary.latlng.latlng.length > 0) {
        const latLongToSet = item.secondary.latlng.latlng;
        const selectedTerritory = item.secondary.latlng;
        this.setZoomAndCenterUsingFitsBound(item.secondary['geo'], item.secondary.parentGeo, item.secondary.latlng);
        this.chartSelectedTerritory = null;
        this.ref.detectChanges();
        this.chartSelectedTerritory = selectedTerritory;
        this.controlAttributes['selectedCounterMeasure'] = [];
        this.createCountermeasureSimilarityBars();
        this.ref.detectChanges();
      } else {
        this.chartSelectedTerritory = null;
        this.admin1GeoJSONObject = null;
        const tempAttributes = Object.assign({}, this.controlAttributes);
        tempAttributes['geo'] = item.secondary.parentGeo;
        this.controlAttributes = tempAttributes;
        this.ref.detectChanges();
        this.setZoomAndCenterUsingFitsBound(item.secondary['geo'], item.secondary.parentGeo, item.secondary.latlng);
      }
      this.ref.detectChanges();
    } else if (item.hasOwnProperty('selectedGlyph')) {
      this.switchGlyph(item['selectedGlyph']);
    } else if (item.hasOwnProperty('clickedLocationIdentity')) {
      const selectedGeo = item.contAttr['geo'];
      if (!isNullOrUndefined(selectedGeo)) {
        this.loadData(selectedGeo, item.contAttr['dataAndDataSourcesConfigs'], item.clickedLocationIdentity);
      }
    }
  }

  private loadData(geo: string, dataAndDataSourcesConfigs?: any, clickedLocationIdentity?: any) {
    this.markers = [];
    let tempData: any = {};

    if (!isNullOrUndefined(dataAndDataSourcesConfigs) && dataAndDataSourcesConfigs.normaliseChange === false
      && this.covid19OutcomeData.geo === geo) {
      this.reLoadData();
      return;
    } else if (!isNullOrUndefined(dataAndDataSourcesConfigs) && isNullOrUndefined(dataAndDataSourcesConfigs.normaliseChange)
      && this.covid19OutcomeData.geo === geo) {
      return;
    }

    this.subscribeStatsMetadata = this.jhuDataLoaderService.getStatsMetadata().subscribe(metadata => {
      if (!isNullOrUndefined(metadata)) { this.metadata = metadata; }
    }, error => {
      console.log(error);
    });

    // The check below will be extended to be either global, us, fr, gb, ca, etc.. depending on the status of the admin level to be viewed
    if (geo === DROPDOWN_ITEMS_GLOBAL_US[0]) {
      const admin0Cases = this.jhuDataLoaderService.loadCEDPData(dataAndDataSourcesConfigs);
      const admin0Dict = this.jhuDataLoaderService.getCountriesDictionary();
      const admin0CM = this.jhuDataLoaderService.getCMData(null, dataAndDataSourcesConfigs);
      const admin0GeoJson = this.jhuDataLoaderService.loadWorldGeoJson();
      this.subscribeConfirmedGlobal = forkJoin([admin0Cases, admin0Dict, admin0CM, admin0GeoJson])
        .subscribe(data => {
          if (isNullOrUndefined(data)) {
            return;
          }
          if (!isNullOrUndefined(dataAndDataSourcesConfigs) && dataAndDataSourcesConfigs.per100kPop === true) {
            data[0] = this.curateDataService.computeMeasuresDataPer100kPopSize(data[0], data[1]);
          }
          tempData = data[0];
          tempData['dict'] = data[1];
          tempData['cm_data'] = data[2];
          tempData['geo'] = geo;
          this.rawGEOJSONObject = data[3];
          if (isNullOrUndefined(this.npiNotificationObject)) {
            this.npiNotificationObject =
              this.curateDataService
                .generateNotificationOfNewCountermeasures(data[2], new Date().getTime(), this.numberOfDaysToShowPopover);
            this.updateNotificationBadge();
          }
          this.reLoadData(tempData);
        }, error1 => {
          console.log(error1);
        });
    } else if (!isNullOrUndefined(geo)) {
      const admin1Cases = this.jhuDataLoaderService.loadJHUSelectedCountryAdmin1MeasuresData(geo, dataAndDataSourcesConfigs);
      const admin0Dict = of(this.covid19OutcomeData.dict);
      const admin1CM = this.jhuDataLoaderService.getAdmin1CMData(this.covid19OutcomeData.cm_data, geo, dataAndDataSourcesConfigs);
      const admin1GeoJson = this.jhuDataLoaderService.loadSelectedCountryAdmin1GeoJson(geo.toLowerCase());
      this.subscribeConfirmedUS = forkJoin([admin1Cases, admin0Dict, admin1CM, admin1GeoJson])
        .subscribe(data => {
          const tempAttributes = Object.assign({}, this.controlAttributes);
          if (!isNullOrUndefined(clickedLocationIdentity)) { tempAttributes['clickedLocationIdentity'] = clickedLocationIdentity; }
          tempAttributes['latlng'] = null;
          this.chartSelectedTerritory = null;
          if (isNullOrUndefined(data) || isNullOrUndefined(data[0]) || isNullOrUndefined(admin1GeoJson)) {
            this.controlAttributes = tempAttributes;
            this.setZoomAndCenterUsingFitsBound(tempAttributes['geo'], tempAttributes['parentGeo'], tempAttributes['latlng']);
            this.ref.detectChanges();
            return;
          }
          tempAttributes['parentGeo'] = geo;
          tempAttributes['clickedLocationIdentity'] = null;
          tempAttributes['latlng'] = null;
          tempAttributes['selectedCounterMeasure'] = [];
          this.setZoomAndCenterUsingFitsBound(tempAttributes['geo'], tempAttributes['parentGeo'], tempAttributes['latlng']);
          this.controlAttributes = tempAttributes;
          this.ref.detectChanges();
          if (!isNullOrUndefined(dataAndDataSourcesConfigs) && dataAndDataSourcesConfigs.per100kPop === true) {
            data[0] = this.curateDataService.computeMeasuresDataPer100kPopSize(data[0], data[1], geo.toUpperCase());
          }
          tempData = data[0];
          tempData['dict'] = data[1];
          tempData['cm_data'] = data[2];
          tempData['geo'] = geo;
          this.rawGEOJSONObject = data[3];
          this.admin1GeoJSONObject = this.rawGEOJSONObject;
          this.reLoadData(tempData);
        }, error1 => {
          const tempAttributes = Object.assign({}, this.controlAttributes);
          tempAttributes['latlng'] = null;
          this.chartSelectedTerritory = null;
          if (!isNullOrUndefined(clickedLocationIdentity)) { tempAttributes['clickedLocationIdentity'] = clickedLocationIdentity; }
          this.controlAttributes = tempAttributes;
          this.setZoomAndCenterUsingFitsBound(tempAttributes['geo'], tempAttributes['parentGeo'], tempAttributes['latlng']);
          this.ref.detectChanges();
        });
    }
  }

  private reLoadData(tempData?: any) {
    if (!isNullOrUndefined(tempData)) {
      this.covid19OutcomeData = tempData;
    }
    if (isNullOrUndefined(this.controlAttributes['selectedCounterMeasure'])
      || this.controlAttributes['selectedCounterMeasure'].length < 1) {
      this.markers = [];
      this.geoJSONObject = null;
      this.reloadGlyphObject();
      return;
    }
    this.markers = [];
    this.polyLines = [];
    this.geoJSONObject = null;
    this.reloadGlyphObject();
  }

  private reloadGlyphObject() {
    if (this.currentGlyph.key === GLYPHS.choropleth.key) {
      if (this.controlAttributes['parentGeo'] === DROPDOWN_ITEMS_GLOBAL_US[0]) {
        this.geoJSONObject = this.mapMarkerService
          .makeCounterMeasuresGeoJSON(this.covid19OutcomeData, this.controlAttributes, this.rawGEOJSONObject);
      } else {
        this.geoJSONObject = this.mapMarkerService
          .makeAmin1CounterMeasuresGeoJSON(this.covid19OutcomeData, this.controlAttributes, this.rawGEOJSONObject);
      }
    } else if (this.currentGlyph.key === GLYPHS.spikes.key) {
      this.polyLines = this.mapMarkerService.makeMarkers(this.covid19OutcomeData, this.controlAttributes, this.currentGlyph.key);
    } else if (this.currentGlyph.key === GLYPHS.bubbles.key) {
      this.polyLines = this.mapMarkerService.makeMarkers(this.covid19OutcomeData, this.controlAttributes, this.currentGlyph.key);
    }
    this.createCountermeasureSimilarityBars();
    this.ref.detectChanges();
  }

  switchGlyph(glyph: string) {
    if (glyph === this.currentGlyph.key) { return; }
    this.currentGlyph = GLYPHS[glyph];
    this.reLoadData();
    this.ref.detectChanges();
  }

  private createCountermeasureSimilarityBars() {
    if (this.controlAttributes.dataAndDataSourcesConfigs.showSimilarityBars) {
      this.countermeasureSimilarityBars = this.mapMarkerService
        .createCountermeasureSimilarityBars(this.covid19OutcomeData, this.controlAttributes);
    } else { this.countermeasureSimilarityBars = undefined; }
    this.ref.detectChanges();
  }

  private setZoomAndCenterUsingFitsBound(geo: string, parentGeo: string, latlng: any) {
    if (!isNullOrUndefined(latlng) && !isNullOrUndefined(latlng.customMeta)
      && !isNullOrUndefined(latlng.customMeta.data) && !isNullOrUndefined(latlng.customMeta.data.meta)
      && !isNullOrUndefined(latlng.customMeta.data.meta.admin)) {
      if (environment.ADMINS_NEEDING_SPECIAL_HANDLING_OF_ZOOM.indexOf(latlng.customMeta.data.meta.admin) > -1) {
        this.setZoomAndCenter(geo, parentGeo, latlng);
        return;
      }
      this.zoomCenterObj = { center: this.center, zoom: this.zoom, timestamp: new Date().getTime(),
        admin: latlng.customMeta.data.meta.admin };
    } else {
      if (geo === DROPDOWN_ITEMS_GLOBAL_US[0]) {
        this.zoom = 2;
        this.center = L.latLng([0.0, 0.0]);
        this.zoomCenterObj = {  center: this.center, zoom: this.zoom, timestamp: new Date().getTime(), admin: null };
        return;
      }
      if (environment.ADMINS_NEEDING_SPECIAL_HANDLING_OF_ZOOM.indexOf(geo) > -1) {
        this.setZoomAndCenter(geo, parentGeo, latlng);
        return;
      }
      if (isNullOrUndefined(this.covid19OutcomeData) || isNullOrUndefined(this.covid19OutcomeData.dict) || isNullOrUndefined(geo)) {
        return; }
      const dictItem = this.covid19OutcomeData.dict[geo];
      if (isNullOrUndefined(dictItem) || isNullOrUndefined(dictItem['iso2']) || isNullOrUndefined(dictItem['name'])) { return; }
      this.zoomCenterObj = {  center: this.center, zoom: this.zoom, timestamp: new Date().getTime(), admin: dictItem['iso2'] };
    }
  }

  private setZoomAndCenter(geo: string, parentGeo: string, latlng: any) {
    let chartZoom = 5;
    if (parentGeo === DROPDOWN_ITEMS_GLOBAL_US[0]) { chartZoom = 4; }
    this.zoom = chartZoom;

    if (isNullOrUndefined(latlng) || isNullOrUndefined(latlng.latlng)) {
      if (geo === DROPDOWN_ITEMS_GLOBAL_US[0]) {
        this.zoom = 2;
        this.center = L.latLng([0.0, 0.0]);
        this.zoomCenterObj = {  center: this.center, zoom: this.zoom, timestamp: new Date().getTime(), admin: null };
        return;
      }
      if (isNullOrUndefined(this.covid19OutcomeData) || isNullOrUndefined(this.covid19OutcomeData.dict) || isNullOrUndefined(geo)) {
        return; }
      const dictItem = this.covid19OutcomeData.dict[geo];
      if (isNullOrUndefined(dictItem) || isNullOrUndefined(dictItem['Lat']) || isNullOrUndefined(dictItem['Long'])) { return; }
      this.center = L.latLng([dictItem['Lat'], dictItem['Long']]);
      if (!isNullOrUndefined(ZOOM_LEVELS_FOR_ADMINS_NEEDING_SPECIAL_HANDLING_OF_ZOOM[geo])) {
        this.zoom = ZOOM_LEVELS_FOR_ADMINS_NEEDING_SPECIAL_HANDLING_OF_ZOOM[geo];
      }
    } else {
      this.center = latlng.latlng;
      if (!isNullOrUndefined(latlng) && !isNullOrUndefined(latlng.customMeta)
        && !isNullOrUndefined(latlng.customMeta.data) && !isNullOrUndefined(latlng.customMeta.data.meta)
        && !isNullOrUndefined(latlng.customMeta.data.meta.admin)
        && !isNullOrUndefined(ZOOM_LEVELS_FOR_ADMINS_NEEDING_SPECIAL_HANDLING_OF_ZOOM[latlng.customMeta.data.meta.admin])) {
        this.zoom = ZOOM_LEVELS_FOR_ADMINS_NEEDING_SPECIAL_HANDLING_OF_ZOOM[latlng.customMeta.data.meta.admin];
      }
    }
    this.zoomCenterObj = {  center: this.center, zoom: this.zoom, timestamp: new Date().getTime(), admin: null };
  }

  updateMetadata(key: string) {
    if (isNullOrUndefined(this.metadata) || isNullOrUndefined(this.metadata[key])) { return '-'; }
    if (key === 'latest_epoch') {
      return this.datePipe.transform(this.metadata['latest_epoch'], 'MMM d, y H:mm z');
    }
    return this.metadata[key];
  }

  updateNotificationBadge() {
    if (!isNullOrUndefined(this.npiNotificationObject) && Object.keys(this.npiNotificationObject).length > 0) {
      this.noOfNotifications = Object.keys(this.npiNotificationObject).length;
      this.disabledButton = false;
      this.popOverMsg = this.getPopOverMsg();
    }
  }

  getPopOverMsg(): any {
    let msg = ``;
    Object.keys(this.npiNotificationObject).forEach(adminName => {
      if (this.npiNotificationObject.hasOwnProperty(adminName) && !isNullOrUndefined(this.npiNotificationObject[adminName])) {
        if (msg !== ``) { msg = msg + `<br>`; }
        msg = msg + `<b>` + adminName + `</b><br>`;
        Object.keys(this.npiNotificationObject[adminName]).forEach(date => {
          if (this.npiNotificationObject[adminName].hasOwnProperty(date)
            && !isNullOrUndefined(this.npiNotificationObject[adminName][date])) {
            msg = msg + date + ': ';
            const imposed = this.npiNotificationObject[adminName][date]['Imposed'];
            const lifted = this.npiNotificationObject[adminName][date]['Lifted'];
            if (!isNullOrUndefined(imposed) && imposed.length > 0) {
              msg = msg + `<i>` + `Imposed`  + `</i>`;
              for (const npi of this.npiNotificationObject[adminName][date]['Imposed']) {
                if (this.npiNotificationObject[adminName][date]['Imposed'].indexOf(npi)
                  === this.npiNotificationObject[adminName][date]['Imposed'].length - 1) {
                  if (!isNullOrUndefined(lifted) && lifted.length > 0) {
                    msg = msg + `<i> ` + npi + `, </i>`;
                  } else {
                    msg = msg + `<i> ` + npi + `.</i>`;
                  }
                } else { msg = msg + `<i> ` + npi + `,</i>`; }
              }
            }
            if (!isNullOrUndefined(lifted) && lifted.length > 0) {
              if (!isNullOrUndefined(imposed) && imposed.length > 0) {
                msg = msg + `<i>` + `and lifted`  + `</i>`;
              } else {
                msg = msg + `<i>` + `Lifted`  + `</i>`;
              }
              for (const npi of this.npiNotificationObject[adminName][date]['Lifted']) {
                if (this.npiNotificationObject[adminName][date]['Lifted'].indexOf(npi)
                  === this.npiNotificationObject[adminName][date]['Lifted'].length - 1) {
                  msg = msg + `<i> ` + npi + `.</i>`;
                } else { msg = msg + `<i> ` + npi + `,</i>`; }
              }
            }
            msg = msg + `<br>`;
          }
        });
      }
    });
    return msg;
  }

  videoPlayStatus() {
  }

  topBarButtons(eventName: string, eventAction: string) {
  }

  onTabChange($event) {
  }
}
