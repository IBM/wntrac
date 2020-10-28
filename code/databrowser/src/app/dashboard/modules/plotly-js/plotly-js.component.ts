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

import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChange
} from '@angular/core';
import {isNullOrUndefined} from 'util';
import {DatePipe} from '@angular/common';
import {DEFAULT_COLOR} from '../../../constants/chart.constants';
import {PlotlyService} from 'angular-plotly.js';
import {transparentize} from '../../../functions/functions';
import {CurateDataService} from '../../../services/curate-data/curate-data.service';

@Component({
  selector: 'app-plotly-js',
  templateUrl: './plotly-js.component.html',
  styleUrls: ['./plotly-js.component.sass']
})
export class PlotlyJsComponent implements OnInit, OnChanges, OnDestroy {
  @Output() selectedAttribute = new EventEmitter<any>();
  @Input() controlAttributes: any;
  @Input() measuresAndCounterMeasuresData: any = {};
  @Input() covid19OutcomeData: any;
  graph: any;
  private amClicked = [];
  private latlng: any;
  private barIsClickable = true;
  private clickedLocationIdentity = null;
  private plotlyEventClick = false;

  constructor(private ref: ChangeDetectorRef,
              private datePipe: DatePipe,
              public plotlyService: PlotlyService,
              private curateDataService: CurateDataService) { }

  ngOnInit() {
    this.createChart();
    if (!isNullOrUndefined(this.controlAttributes)) {
      this.amClicked = this.controlAttributes.selectedCounterMeasure;
      this.latlng = this.controlAttributes.latlng;
      this.clickedLocationIdentity = this.controlAttributes.clickedLocationIdentity;
      if (!isNullOrUndefined(this.controlAttributes.clickedLocationIdentity)
        && !isNullOrUndefined(this.controlAttributes.clickedLocationIdentity.NAME)
        && isNullOrUndefined(this.controlAttributes.clickedLocationIdentity.repeat)) {
        this.highlightTheMapClickedLocation(this.controlAttributes.clickedLocationIdentity);
      } else if (!isNullOrUndefined(this.controlAttributes.latlng)) {
        this.processLineSymbolClick(this.controlAttributes.latlng.customMeta, true);
      } else {
        this.barIsClickable = true;
        this.upDateAnyClickedBars();
      }
    }
  }

  ngOnChanges(changes: { [propKey: string]: SimpleChange }) {
    if (changes['measuresAndCounterMeasuresData'] && !changes['measuresAndCounterMeasuresData'].isFirstChange()) {
      this.createChart();
    }
    if (changes['controlAttributes'] && !changes['controlAttributes'].isFirstChange()) {
      if (!isNullOrUndefined(this.controlAttributes)) {
        this.amClicked = this.controlAttributes.selectedCounterMeasure;
        this.latlng = this.controlAttributes.latlng;
        this.clickedLocationIdentity = this.controlAttributes.clickedLocationIdentity;
        if (!isNullOrUndefined(this.controlAttributes.clickedLocationIdentity)
          && !isNullOrUndefined(this.controlAttributes.clickedLocationIdentity.NAME)
          && isNullOrUndefined(this.controlAttributes.clickedLocationIdentity.repeat)) {
          this.highlightTheMapClickedLocation(this.controlAttributes.clickedLocationIdentity);
        } else if (!isNullOrUndefined(this.controlAttributes.latlng)) {
          this.processLineSymbolClick(this.controlAttributes.latlng.customMeta, true);
        } else {
          this.barIsClickable = true;
          this.upDateAnyClickedBars();
        }
      }
    }
  }
  ngOnDestroy() {
  }

  @HostListener('click') onClick() {
    if (!this.plotlyEventClick) {
      this.processAutoShoLegend('disable');
      if (isNullOrUndefined(this.controlAttributes.latlng) && this.controlAttributes.selectedCounterMeasure.length > 0) {
        this.amClicked = [];
        this.updateAndEmitSelectedAttribute();
      }
    }
    this.plotlyEventClick = false;
  }

  private createChart() {
    if (isNullOrUndefined(this.measuresAndCounterMeasuresData
      || isNullOrUndefined(this.measuresAndCounterMeasuresData['data']
        || isNullOrUndefined(this.measuresAndCounterMeasuresData['layout'])))) {
      return;
    }
    this.graph = {
      data: this.measuresAndCounterMeasuresData['data'],
      layout: this.measuresAndCounterMeasuresData['layout'],
      config: this.measuresAndCounterMeasuresData['config'],
    };
  }

  onInitialized($event) {
    const div = this.plotlyService.getInstanceByDivId('main-plot-div');
    div.on('plotly_legenddoubleclick', (data) => {
      return false;
    });

    div.on('plotly_legendclick', (data) => {
      return false;
    });

    div.on('plotly_clickannotation', (event, data) => {
      this.plotlyEventClick = true;
      if (!isNullOrUndefined(event) && !isNullOrUndefined(event.index) && !isNullOrUndefined(event.annotation)
        && !isNullOrUndefined(event.annotation['meta1'])) {
        if (event.annotation['meta1'] === 'link') {
          this.processAutoShoLegend();
        } else if (event.annotation['meta1'] === 'cm_details') {
          const clickedLocId = { 'ISO_A2': event.annotation['meta2']};
          this.controlAttributes.geo = event.annotation['meta2'];
          this.selectedAttribute.emit({clickedLocationIdentity: clickedLocId, contAttr: this.controlAttributes, extra: 'from_map'});
        } else {
          console.log('uncommon case!');
        }
      }
    });

    div.on('plotly_click', (data) => {
      this.plotlyEventClick = true;
      if (isNullOrUndefined(data)
        || isNullOrUndefined(data['points'])
        || isNullOrUndefined(data['points'][0])
        || isNullOrUndefined(data['points'][0]['curveNumber'])
        || isNullOrUndefined(data['points'][0]['data'])
        || data['points'][0]['data'].length < 1) {
        return;
      }
      const pointsData = data['points'][0];
      const thisData = pointsData['data'];
      if (!isNullOrUndefined(thisData.line) && thisData.line.dash === 'dot') {
        return;
      }
      if (isNullOrUndefined(this.controlAttributes.latlng) && isNullOrUndefined(this.controlAttributes.clickedLocationIdentity)) {
        this.barIsClickable = true;
      }
      this.amClicked = this.controlAttributes.selectedCounterMeasure;
      this.latlng = this.controlAttributes.latlng;
      this.clickedLocationIdentity = this.controlAttributes.clickedLocationIdentity;
      if (!isNullOrUndefined(thisData.marker) && thisData.type === 'bar' && this.barIsClickable) {
        this.processBarClick(pointsData);
      } else if (!isNullOrUndefined(thisData.meta) && (thisData.meta.type === 'marker' || thisData.meta.type === 'line')) {
        this.processLineSymbolClick(pointsData);
      } else {
        console.log('not sure what you clicked!', pointsData);
      }
    });
  }

  private processBarClick(pointsData: any) {
    const curveNumber = pointsData['curveNumber'];
    const thisData = pointsData['data'];
    const allBars = thisData['x'];
    const clickedBar = pointsData['label'];
    if (this.amClicked.indexOf(clickedBar) > -1) {
      this.amClicked.splice(this.amClicked.indexOf(clickedBar), 1);
    } else {
      this.amClicked.push(clickedBar);
    }
    const colorLength = this.graph.data[curveNumber].marker.color.length;
    if (this.amClicked.length === colorLength) {
      this.amClicked = [];
    }
    this.updateAndEmitSelectedAttribute();
    const colors = [];
    for (let i = 0; i < colorLength; i++) {
      if (this.amClicked.length === 0) {
        colors.push(DEFAULT_COLOR);
      } else {
        if (this.amClicked.indexOf(allBars[i]) > -1) {
          colors.push(DEFAULT_COLOR);
        } else {
          colors.push(transparentize('' + DEFAULT_COLOR, 0.8));
        }
      }
    }
    if (!isNullOrUndefined(this.graph.data[curveNumber])) {
      this.graph.data[curveNumber].marker.color = colors;
    }
    this.ref.detectChanges();
  }

  private processLineSymbolClick(pointsData: any, repeatedEmit?: boolean) {
    const thisData = pointsData['data'];
    const meta = Object.assign({}, thisData['meta']);
    const clickedCountry = meta.admin;
    const clickedLabel = thisData.name;
    for (let j = 0; j < this.graph.data.length; j++) {
      if (isNullOrUndefined(this.graph.data[j]) || isNullOrUndefined(this.graph.data[j]['meta'])) {
        continue;
      }
      const thisMeta = this.graph.data[j]['meta'];
      if (meta.focus) {
        if (meta.type === 'line') {
          if (thisMeta.type === 'line') {
            this.graph.data[j]['line']['width'] = thisMeta.width;
            this.graph.data[j]['marker']['color'] = thisMeta.color;
          } else if (thisMeta.type === 'marker') {
            this.graph.data[j]['marker']['color'] = [thisMeta.color];
            if (thisMeta.substitute) {
              this.graph.data[j]['visible'] = false;
            } else {
              this.graph.data[j]['visible'] = true;
            }
          }
          this.graph.data[j]['meta']['focus'] = false;
        } else if (meta.type === 'marker') {
          if (thisMeta.type === 'marker') {
            if (thisMeta.admin === clickedCountry) {
              this.graph.data[j]['marker']['color'] = [thisMeta.color];
              this.graph.data[j]['meta']['focus'] = false;
              this.graph.data[j]['visible'] = true;
            } else {
              this.graph.data[j]['marker']['color'] = [thisMeta.colorNoFocus];
              this.graph.data[j]['meta']['focus'] = false;
              this.graph.data[j]['visible'] = false;
            }
          } else if (thisMeta.type === 'line') {
            if (thisMeta.admin === clickedCountry) {
              this.graph.data[j]['line']['width'] = thisMeta.widthFocus;
              this.graph.data[j]['marker']['color'] = thisMeta.colorFocus;
              this.graph.data[j]['meta']['focus'] = true;
            } else {
              this.graph.data[j]['line']['width'] = thisMeta.widthNoFocus;
              this.graph.data[j]['marker']['color'] = thisMeta.colorNoFocus;
              this.graph.data[j]['meta']['focus'] = false;
            }
          }
        }
      } else {
        if (meta.type === 'line') {
          if (thisMeta.admin === clickedCountry) {
            if (thisMeta.type === 'line') {
              this.graph.data[j]['line']['width'] = thisMeta.widthFocus;
              this.graph.data[j]['marker']['color'] = thisMeta.colorFocus;
              this.graph.data[j]['meta']['focus'] = true;
              // const annotation = getAnnotations(this.graph.data[j].x[this.graph.data[j].x.length - 1],
              //   this.graph.data[j].y[this.graph.data[j].y.length - 1], this.graph.data[j].name);
              // if (!isNullOrUndefined(annotation['x'])) {
              //   this.graph.layout.annotations.push(annotation);
              // }
            } else if (thisMeta.type === 'marker') {
              this.graph.data[j]['visible'] = true;
              this.graph.data[j]['marker']['color'] = [thisMeta.color];
            }
          } else {
            if (thisMeta.type === 'line') {
              this.graph.data[j]['line']['width'] = thisMeta.widthNoFocus;
              this.graph.data[j]['marker']['color'] = thisMeta.colorNoFocus;
              this.graph.data[j]['meta']['focus'] = false;
            } else if (thisMeta.type === 'marker') {
              this.graph.data[j]['visible'] = false;
              this.graph.data[j]['marker']['color'] = [thisMeta.color];
            }
          }
        } else if (meta.type === 'marker') {
          if (thisMeta.type === 'marker') {
            if (thisMeta.admin === clickedCountry && thisMeta.cm_name === clickedLabel) {
              this.graph.data[j]['marker']['color'] = [thisMeta.colorFocus];
              this.graph.data[j]['meta']['focus'] = true;
              this.graph.data[j]['visible'] = true;
            } else if (thisMeta.admin === clickedCountry && thisMeta.cm_name !== clickedLabel) {
              this.graph.data[j]['marker']['color'] = [thisMeta.colorNoFocus];
              this.graph.data[j]['meta']['focus'] = false;
              this.graph.data[j]['visible'] = true;
            } else {
              this.graph.data[j]['marker']['color'] = [thisMeta.colorNoFocus];
              this.graph.data[j]['meta']['focus'] = false;
              this.graph.data[j]['visible'] = false;
            }
          } else if (thisMeta.type === 'line') {
            if (thisMeta.admin === clickedCountry) {
              this.graph.data[j]['line']['width'] = thisMeta.widthFocus;
              this.graph.data[j]['marker']['color'] = thisMeta.colorFocus;
              this.graph.data[j]['meta']['focus'] = true;
            } else {
              this.graph.data[j]['line']['width'] = thisMeta.widthNoFocus;
              this.graph.data[j]['marker']['color'] = thisMeta.colorNoFocus;
              this.graph.data[j]['meta']['focus'] = false;
            }
          }
        }
      }
    }
    this.handleRelievedShapes(meta);
    this.ref.detectChanges();
    const customMeta = {'data': {'meta': meta, 'name': clickedLabel}};
    this.relayLineSymbolClickToMapAndHistogram(meta, clickedLabel, customMeta, repeatedEmit);
  }

  private upDateAnyClickedBars() {
    if (!isNullOrUndefined(this.amClicked) && this.amClicked.length > 0) {
      for (let j = 0; j < this.graph.data.length; j++) {
        if (isNullOrUndefined(this.graph.data[j]) || this.graph.data[j]['type'] !== 'bar') {
          continue;
        }
        const colorLength = this.graph.data[j].marker.color.length;
        if (this.amClicked.length === colorLength) {
          this.amClicked = [];
        }
        const colors = [];
        for (let i = 0; i < colorLength; i++) {
          if (this.amClicked.length === 0) {
            colors.push(DEFAULT_COLOR);
          } else {
            if (this.amClicked.indexOf(this.graph.data[j]['x'][i]) > -1) {
              colors.push(DEFAULT_COLOR);
            } else {
              colors.push(transparentize('' + DEFAULT_COLOR, 0.8));
            }
          }
        }
        this.graph.data[j].marker.color = colors;
      }
    }
  }

  private _filter(data: any[], clickedCountry: string, type: string) {
    if (isNullOrUndefined(clickedCountry)) { return {}; }
    return data.filter(option => {
      return (!isNullOrUndefined(option.meta)) && (option.meta.type === type)
        && (option.meta.admin.toLowerCase() === clickedCountry.toLowerCase());
    })[0];
  }

  private relayLineSymbolClickToMapAndHistogram(meta: any, clickedLabel: string, customMeta: any,
                                                repeatedEmit: any) {
    if (isNullOrUndefined(meta) || isNullOrUndefined(clickedLabel)) {
      return;
    }
    if (meta.type === 'line') {
      if (!meta.focus) {
        this.barIsClickable = false;
        this.handleSelectedAdmin(meta.admin, customMeta, repeatedEmit);
      } else {
        this.barIsClickable = true;
        this.latlng = null;
        this.amClicked = [];
        this.updateAndEmitSelectedAttribute(repeatedEmit);
      }
    } else if (meta.type === 'marker') {
      if (!meta.focus) {
        this.barIsClickable = false;
        this.handleSelectedAdmin(meta.admin, customMeta, repeatedEmit, clickedLabel);
      } else {
        this.barIsClickable = false;
        this.handleSelectedAdmin(meta.admin, customMeta, repeatedEmit);
      }
    }
  }
  private handleSelectedAdmin(admin: string, customMeta: any, repeatedEmit: any, clickedLabel?: string) {
    if (isNullOrUndefined(this.covid19OutcomeData)) { return; }

    this.latlng = {};
    this.latlng['customMeta'] = customMeta;
    const cmImplementedByThisCountry = this.curateDataService.getCMImplementedByThisCountry(admin, this.covid19OutcomeData.cm_data);
    this.amClicked = Object.keys(cmImplementedByThisCountry);
    if (!isNullOrUndefined(clickedLabel) && clickedLabel !== 'group') {
      // this.amClicked = [clickedLabel];
    }
    if (!isNullOrUndefined(this.covid19OutcomeData.c_data) && !isNullOrUndefined(this.covid19OutcomeData.c_data[admin])
      && !isNullOrUndefined(this.covid19OutcomeData.c_data[admin]['Lat'])
      && !isNullOrUndefined(this.covid19OutcomeData.c_data[admin]['Long'])) {
      this.latlng['latlng'] = [this.covid19OutcomeData.c_data[admin]['Lat'], this.covid19OutcomeData.c_data[admin]['Long']];
    } else {
      try {
        if (this.covid19OutcomeData.c_data[admin]['Province/State'] === admin) {
          this.latlng['latlng'] = [this.covid19OutcomeData['dict'][this.covid19OutcomeData.c_data[admin]['Country/Region']][admin]['Lat'],
          this.covid19OutcomeData['dict'][this.covid19OutcomeData.c_data[admin]['Country/Region']][admin]['Long']];
        } else {
          this.latlng['latlng'] = [this.covid19OutcomeData['dict'][admin]['Lat'], this.covid19OutcomeData['dict'][admin]['Long']];
        }
      } catch (error) {
        console.log(error);
      }
    }
    if (isNullOrUndefined(this.graph) || isNullOrUndefined(this.graph.data)) {
      return;
    }
    for (let j = 0; j < this.graph.data.length; j++) {
      if (isNullOrUndefined(this.graph.data[j]) || this.graph.data[j]['type'] !== 'bar') { continue; }
      const colorLength = this.graph.data[j].marker.color.length;
      if (this.amClicked.length === colorLength) {
        this.amClicked = [];
      }
      this.updateAndEmitSelectedAttribute(repeatedEmit);
      const colors = [];
      for (let i = 0; i < colorLength; i++) {
        if (this.amClicked.length === 0) {
          colors.push(DEFAULT_COLOR);
        } else {
          if (!isNullOrUndefined(this.graph.data[j])) {
            if (this.amClicked.indexOf(this.graph.data[j]['x'][i]) > -1) {
              colors.push(DEFAULT_COLOR);
            } else {
              colors.push(transparentize('' + DEFAULT_COLOR, 0.8));
            }
          }
        }
      }
      if (isNullOrUndefined(this.graph.data[j])) { continue; }
      this.graph.data[j].marker.color = colors;
      this.ref.detectChanges();
    }
  }

  private updateAndEmitSelectedAttribute(repeatedEmit?: any) {
    if (isNullOrUndefined(this.latlng)) { this.controlAttributes.geo = this.controlAttributes.parentGeo; }
    if (!isNullOrUndefined(this.clickedLocationIdentity)) {
      this.clickedLocationIdentity['repeat'] = 'repeat';
    }
    const secondaryItems = {
      xAxis: this.controlAttributes.xAxis,
      yAxis: this.controlAttributes.yAxis,
      yScale: this.controlAttributes.yScale,
      geo: this.controlAttributes.geo,
      parentGeo: this.controlAttributes.parentGeo,
      date: this.controlAttributes.date,
      selectedCounterMeasure: this.amClicked,
      latlng: this.latlng,
      clickedLocationIdentity: this.clickedLocationIdentity,
      dataAndDataSourcesConfigs: this.controlAttributes.dataAndDataSourcesConfigs
    };
    if (isNullOrUndefined(repeatedEmit)) {
      this.selectedAttribute.emit({selectedCounterMeasure: this.amClicked, secondary: secondaryItems});
    }
  }

  private highlightTheMapClickedLocation(clickedCountry: object) {
    let data = this._filter(this.graph.data, clickedCountry['NAME'], 'line');
    if (isNullOrUndefined(data) || isNullOrUndefined(data['meta']) || isNullOrUndefined(data['meta']['admin'])) {
      data = this._filter(this.graph.data, clickedCountry['ISO_A2'], 'line');
      if (isNullOrUndefined(data) || isNullOrUndefined(data['meta']) || isNullOrUndefined(data['meta']['admin'])) {
        return;
      }
    }
    const customMeta = {'data': {'meta': data['meta'], 'name': data['meta']['admin']}};
    this.processLineSymbolClick(customMeta);
  }

  private processAutoShoLegend(hide?: any) {
    if (!isNullOrUndefined(hide)) {
      this.graph.layout.showlegend = false;
      this.resetTheLegendClickMsg(false);
    } else if (this.graph.layout.showlegend) {
      this.graph.layout.showlegend = false;
      this.resetTheLegendClickMsg(false);
    } else {
      this.graph.layout.showlegend = true;
      this.resetTheLegendClickMsg(true);
    }
    this.ref.detectChanges();
  }

  private resetTheLegendClickMsg(shown: boolean) {
    for (let i = 0; i < this.graph.layout.annotations.length; i++) {
      const annot = this.graph.layout.annotations[i];
      if (isNullOrUndefined(annot) || isNullOrUndefined(annot['meta1'])) { continue; }
      if (annot['meta1'] === 'link') {
        if (shown) {
          this.graph.layout.annotations[i].text = '<a href="">' + 'Hide legend' + '</a>';
        } else {
          this.graph.layout.annotations[i].text = '<a href="">' + 'Show legend' + '</a>';
        }
        break;
      }
    }
  }

  private handleRelievedShapes(meta: any) {
    for (let j = 0; j < this.graph.layout.shapes.length; j++) {
      if (isNullOrUndefined(this.graph.layout.shapes[j].meta)) { continue; }
      if (!meta.focus) {
        this.graph.layout.shapes[j].visible = meta.admin === this.graph.layout.shapes[j].meta.admin;
      } else if (meta.type === 'line') {
        this.graph.layout.shapes[j].visible = true;
      } else if (meta.type === 'marker') {
        this.graph.layout.shapes[j].visible = meta.admin === this.graph.layout.shapes[j].meta.admin;
      }
    }
  }
}
