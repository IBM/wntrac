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

import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChange } from '@angular/core';
import { isNullOrUndefined } from 'util';
import { DatePipe } from '@angular/common';
import {NgbModal, ModalDismissReasons} from '@ng-bootstrap/ng-bootstrap';
import {
  COUNTERMEASURES_RESTRICTION_TYPES,
  DROPDOWN_ITEMS_GLOBAL_US,
  DROPDOWN_ITEMS_X_AXIS,
  DROPDOWN_ITEMS_Y_AXIS, DROPDOWN_ITEMS_Y_AXIS_EXTENDED,
  DROPDOWN_ITEMS_Y_SCALE, IMPORTANT_DATES, MEASURES_DATA_POP_SIZE, MEASURES_DATA_SOURCES
} from '../../../constants/general.constants';
import {
  getDaysBetweenTimestampInDays,
  getDaysBtnCurrentMillsAndGivenMills,
  getTheLatestDateOrDayForTheGivenData
} from '../../../functions/functions';
import { LabelType, Options } from 'ng5-slider';
import { ChartCovidService } from '../../../services/chart-covid/chart-covid.service';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {environment} from '../../../../environments/environment';

@Component({
  selector: 'app-control-panel',
  templateUrl: './control-panel.component.html',
  styleUrls: ['./control-panel.component.scss']
})
export class ControlPanelComponent implements OnInit, OnChanges {
  @Output() selectedAttribute = new EventEmitter<any>();
  @Input() controlAttributes: any;
  @Input() covid19OutcomeData: any;
  DROPDOWN_ITEMS_X_AXIS = DROPDOWN_ITEMS_X_AXIS;
  CURRENT_DROPDOWN_ITEMS_X_AXIS = DROPDOWN_ITEMS_X_AXIS[0];
  CURRENT_DROPDOWN_ITEMS_Y_AXIS = DROPDOWN_ITEMS_Y_AXIS[0];
  DROPDOWN_ITEMS_Y_AXIS_EXTENDED = DROPDOWN_ITEMS_Y_AXIS_EXTENDED;
  DROPDOWN_ITEMS_Y_SCALE = DROPDOWN_ITEMS_Y_SCALE;
  CURRENT_DROPDOWN_ITEMS_Y_SCALE = DROPDOWN_ITEMS_Y_SCALE[0];
  DROPDOWN_ITEMS_GLOBAL_US = DROPDOWN_ITEMS_GLOBAL_US;
  CURRENT_DROPDOWN_ITEMS_GLOBAL_US = DROPDOWN_ITEMS_GLOBAL_US[0];
  MEASURES_DATA_POP_SIZE = MEASURES_DATA_POP_SIZE;
  date;
  dateRange: Date[];
  startValue: number;
  value: number;
  options: Options;
  counter;
  play = true;
  interval: any;
  playPauseButton = 'play_circle_outline';
  private amClicked = [];
  latlng;
  clickedLocationIdentity;
  closeResult: string;
  formGroup: FormGroup;
  measuresDataSourcesList = MEASURES_DATA_SOURCES;
  countermeasureRestrictionList = COUNTERMEASURES_RESTRICTION_TYPES;
  dataAndDataSourcesConfigs = {measuresDataSources: MEASURES_DATA_SOURCES, verifiedCMData: true, topKAdmins: 15, topKCm: 5, kDays: 7,
    per100kPop: false, showSimilarityBars: true, countermeasureRestriction: COUNTERMEASURES_RESTRICTION_TYPES[0]};
  ceil;
  CURRENT_MEASURES_DATA_POP_SIZE = this.getCurrentPopSizeStatus();
  internal = environment.internalExternal;

  constructor(private chartCovidService: ChartCovidService,
              private ref: ChangeDetectorRef,
              private datePipe: DatePipe,
              private modalService: NgbModal,
              private _formBuilder: FormBuilder) {
  }

  ngOnInit() {
    this.setDaySlider();
    if (isNullOrUndefined(this.covid19OutcomeData)) {
      return;
    }
    if (!isNullOrUndefined(this.controlAttributes)) {
      this.CURRENT_DROPDOWN_ITEMS_GLOBAL_US = this.controlAttributes.geo;
      this.CURRENT_DROPDOWN_ITEMS_X_AXIS = this.controlAttributes.xAxis;
      this.CURRENT_DROPDOWN_ITEMS_Y_AXIS = this.controlAttributes.yAxis;
      this.CURRENT_DROPDOWN_ITEMS_Y_SCALE = this.controlAttributes.yScale;
      this.date = this.controlAttributes.date;
      this.amClicked = this.controlAttributes.selectedCounterMeasure;
      this.latlng = this.controlAttributes.latlng;
      this.clickedLocationIdentity = this.controlAttributes.clickedLocationIdentity;
      this.dataAndDataSourcesConfigs = this.controlAttributes.dataAndDataSourcesConfigs;
      if (this.CURRENT_DROPDOWN_ITEMS_X_AXIS === this.DROPDOWN_ITEMS_X_AXIS[0]) {
        this.setDateSlider();
      } else {
        this.setDaySlider();
      }
    }
    this.disableEmptyYAxisLabels();
    this.DROPDOWN_ITEMS_X_AXIS[1] = 'Days Since First ' + this.CURRENT_DROPDOWN_ITEMS_Y_AXIS;
    const latestTime = getTheLatestDateOrDayForTheGivenData(this.covid19OutcomeData, this.controlAttributes);
    if (isNullOrUndefined(latestTime) || this.ceil === +latestTime) { return; }
    this.setCeil(latestTime);
  }

  ngOnChanges(changes: { [propKey: string]: SimpleChange }) {
    if (changes['controlAttributes'] && !changes['controlAttributes'].isFirstChange()) {
      if (!isNullOrUndefined(this.controlAttributes)) {
        this.CURRENT_DROPDOWN_ITEMS_GLOBAL_US = this.controlAttributes.geo;
        this.CURRENT_DROPDOWN_ITEMS_X_AXIS = this.controlAttributes.xAxis;
        this.CURRENT_DROPDOWN_ITEMS_Y_AXIS = this.controlAttributes.yAxis;
        this.CURRENT_DROPDOWN_ITEMS_Y_SCALE = this.controlAttributes.yScale;
        this.date = this.controlAttributes.date;
        this.amClicked = this.controlAttributes.selectedCounterMeasure;
        this.latlng = this.controlAttributes.latlng;
        this.clickedLocationIdentity = this.controlAttributes.clickedLocationIdentity;
        this.dataAndDataSourcesConfigs = this.controlAttributes.dataAndDataSourcesConfigs;
      }
    }
    if (changes['covid19OutcomeData'] && !changes['covid19OutcomeData'].isFirstChange()) {
      this.CURRENT_DROPDOWN_ITEMS_GLOBAL_US = this.controlAttributes.geo;
    }
    this.disableEmptyYAxisLabels();
    this.DROPDOWN_ITEMS_X_AXIS[1] = 'Days Since First ' + this.CURRENT_DROPDOWN_ITEMS_Y_AXIS;
    const latestTime = getTheLatestDateOrDayForTheGivenData(this.covid19OutcomeData, this.controlAttributes);
    if (isNullOrUndefined(latestTime) || this.ceil === latestTime) { return; }
    this.setCeil(latestTime);
  }

  xAxisDropdownChangeListener($event) {
    if ($event.value === this.DROPDOWN_ITEMS_X_AXIS[0]) {
      this.setDateSlider();
    } else {
      this.setDaySlider();
    }
    const secondaryItems = {
      xAxis: $event.value,
      yAxis: this.CURRENT_DROPDOWN_ITEMS_Y_AXIS,
      yScale: this.CURRENT_DROPDOWN_ITEMS_Y_SCALE,
      geo: this.CURRENT_DROPDOWN_ITEMS_GLOBAL_US,
      parentGeo: this.controlAttributes.parentGeo,
      date: this.date,
      selectedCounterMeasure: this.amClicked,
      latlng: this.latlng,
      clickedLocationIdentity: this.clickedLocationIdentity,
      dataAndDataSourcesConfigs: this.controlAttributes.dataAndDataSourcesConfigs,
    };
    this.selectedAttribute.emit({ xAxis: $event.value, secondary: secondaryItems });
  }

  yAxisDropdownChangeListener($event) {
    this.upDateYAxisAndSubmit($event.value);
  }

  private upDateYAxisAndSubmit(value) {
    this.DROPDOWN_ITEMS_X_AXIS[1] = 'Days Since First ' + this.CURRENT_DROPDOWN_ITEMS_Y_AXIS;
    if (this.CURRENT_DROPDOWN_ITEMS_X_AXIS !== this.DROPDOWN_ITEMS_X_AXIS[0]) {
      this.CURRENT_DROPDOWN_ITEMS_X_AXIS = this.DROPDOWN_ITEMS_X_AXIS[1];
    }
    const secondaryItems = {
      xAxis: this.CURRENT_DROPDOWN_ITEMS_X_AXIS,
      yAxis: value,
      yScale: this.CURRENT_DROPDOWN_ITEMS_Y_SCALE,
      geo: this.CURRENT_DROPDOWN_ITEMS_GLOBAL_US,
      parentGeo: this.controlAttributes.parentGeo,
      date: this.date,
      selectedCounterMeasure: this.amClicked,
      latlng: this.latlng,
      clickedLocationIdentity: this.clickedLocationIdentity,
      dataAndDataSourcesConfigs: this.controlAttributes.dataAndDataSourcesConfigs,
    };
    this.selectedAttribute.emit({ yAxis: value, secondary: secondaryItems });
  }

  yScaleDropdownChangeListener($event) {
    const secondaryItems = {
      xAxis: this.CURRENT_DROPDOWN_ITEMS_X_AXIS,
      yAxis: this.CURRENT_DROPDOWN_ITEMS_Y_AXIS,
      yScale: $event.value,
      geo: this.CURRENT_DROPDOWN_ITEMS_GLOBAL_US,
      parentGeo: this.controlAttributes.parentGeo,
      date: this.date,
      selectedCounterMeasure: this.amClicked,
      latlng: this.latlng,
      clickedLocationIdentity: this.clickedLocationIdentity,
      dataAndDataSourcesConfigs: this.controlAttributes.dataAndDataSourcesConfigs,
    };
    this.selectedAttribute.emit({yScale: $event.value, secondary: secondaryItems});
  }

  resetToAllCountries($event) {
    this.CURRENT_DROPDOWN_ITEMS_GLOBAL_US = this.DROPDOWN_ITEMS_GLOBAL_US[0];
    this.amClicked = [];
    const secondaryItems = {
      xAxis: this.CURRENT_DROPDOWN_ITEMS_X_AXIS,
      yAxis: this.CURRENT_DROPDOWN_ITEMS_Y_AXIS,
      yScale: this.CURRENT_DROPDOWN_ITEMS_Y_SCALE,
      geo: DROPDOWN_ITEMS_GLOBAL_US[0],
      parentGeo: DROPDOWN_ITEMS_GLOBAL_US[0],
      date: this.date,
      selectedCounterMeasure: [],
      latlng: null,
      clickedLocationIdentity: null,
      dataAndDataSourcesConfigs: this.controlAttributes.dataAndDataSourcesConfigs,
    };
    this.selectedAttribute.emit({ geo: this.CURRENT_DROPDOWN_ITEMS_GLOBAL_US, secondary: secondaryItems });
  }

  valueChange(value): void {
    // if (this.value >= this.EndValue) {
    //   this.playPause(true);
    // } else {
    this.date = value;
    const secondaryItems = {
      xAxis: this.CURRENT_DROPDOWN_ITEMS_X_AXIS,
      yAxis: this.CURRENT_DROPDOWN_ITEMS_Y_AXIS,
      yScale: this.CURRENT_DROPDOWN_ITEMS_Y_SCALE,
      geo: this.CURRENT_DROPDOWN_ITEMS_GLOBAL_US,
      parentGeo: this.controlAttributes.parentGeo,
      date: this.date,
      selectedCounterMeasure: this.amClicked,
      latlng: this.latlng,
      clickedLocationIdentity: this.clickedLocationIdentity,
      dataAndDataSourcesConfigs: this.controlAttributes.dataAndDataSourcesConfigs,
    };
    this.selectedAttribute.emit({ date: value, secondary: secondaryItems });
    // }
  }

  measuresDataSourcesChangeListener(mds: string) {
    this.dataAndDataSourcesConfigs.measuresDataSources = this.formGroup.controls['measuresDataSources'].value;
  }

  countermeasureRestrictionChangeListener(cr: string) {
    this.dataAndDataSourcesConfigs.countermeasureRestriction = this.formGroup.controls['countermeasureRestriction'].value;
  }

  showSimilarityBars($event) {
    this.dataAndDataSourcesConfigs.showSimilarityBars = $event.checked;
  }

  showPer100kPop($event) {
    this.dataAndDataSourcesConfigs.per100kPop = this.getCurrentPopSizeStatus($event.value);
    this.updateAndEmitDataAndDataSourcesConfigs(true);
  }

  onInputADChange($event) {
    this.dataAndDataSourcesConfigs.topKAdmins = $event.value;
    this.sendConfigsHoldAttributes();
  }

  onInputCMChange($event) {
    this.dataAndDataSourcesConfigs.topKCm = $event.value;
    this.sendConfigsHoldAttributes();
  }

  onInputKDaysChange($event) {
    this.dataAndDataSourcesConfigs.kDays = $event.value;
    this.sendConfigsHoldAttributes();
  }

  private setupForm() {
    this.formGroup = this._formBuilder.group({
      measuresDataSources: ['', [Validators.required]],
      countermeasureRestriction: ['', [Validators.required]],
    });
  }

  private setValues() {
    this.formGroup.controls['measuresDataSources'].setValue(this.dataAndDataSourcesConfigs.measuresDataSources);
    this.formGroup.controls['countermeasureRestriction'].setValue(this.dataAndDataSourcesConfigs.countermeasureRestriction);
  }

  private getCurrentPopSizeStatus(status?: string): any {
    if (!isNullOrUndefined(status)) {
      if (status === MEASURES_DATA_POP_SIZE[0]) { return false; } else if (status === MEASURES_DATA_POP_SIZE[1]) { return true; }
    }
    if (isNullOrUndefined(this.dataAndDataSourcesConfigs) || this.dataAndDataSourcesConfigs.per100kPop === false) {
      return MEASURES_DATA_POP_SIZE[0];
    } else { return MEASURES_DATA_POP_SIZE[1]; }
  }

  private sendConfigsHoldAttributes() {
    const secondaryItems = {
      xAxis: this.CURRENT_DROPDOWN_ITEMS_X_AXIS,
      yAxis: this.CURRENT_DROPDOWN_ITEMS_Y_AXIS,
      yScale: this.CURRENT_DROPDOWN_ITEMS_Y_SCALE,
      geo: this.CURRENT_DROPDOWN_ITEMS_GLOBAL_US,
      parentGeo: this.controlAttributes.parentGeo,
      date: this.date,
      selectedCounterMeasure: this.amClicked,
      latlng: this.latlng,
      clickedLocationIdentity: this.clickedLocationIdentity,
      dataAndDataSourcesConfigs: this.dataAndDataSourcesConfigs,
    };
    this.selectedAttribute.emit({dataAndDataSourcesConfigsHold: this.dataAndDataSourcesConfigs, secondary: secondaryItems});
  }

  private updateAndEmitDataAndDataSourcesConfigs(normalise: boolean) {
    const secondaryItems = {
      xAxis: this.CURRENT_DROPDOWN_ITEMS_X_AXIS,
      yAxis: this.CURRENT_DROPDOWN_ITEMS_Y_AXIS,
      yScale: this.CURRENT_DROPDOWN_ITEMS_Y_SCALE,
      geo: this.CURRENT_DROPDOWN_ITEMS_GLOBAL_US,
      parentGeo: this.controlAttributes.parentGeo,
      date: this.date,
      selectedCounterMeasure: this.amClicked,
      latlng: this.latlng,
      clickedLocationIdentity: this.clickedLocationIdentity,
      dataAndDataSourcesConfigs: this.dataAndDataSourcesConfigs,
    };
    this.selectedAttribute.emit({dataAndDataSourcesConfigs: this.dataAndDataSourcesConfigs, secondary: secondaryItems,
    normaliseChange: normalise});
  }

  private setCeil(latestTime: number) {
    this.ceil = latestTime;
    if (latestTime < 1000000) { this.setDaySlider(latestTime); } else { this.setDateSlider(latestTime); }
  }

  private disableEmptyYAxisLabels() {
    DROPDOWN_ITEMS_Y_AXIS_EXTENDED[1].disabled = !this.covid19OutcomeData.hasOwnProperty('d_data')
      || isNullOrUndefined(this.covid19OutcomeData['d_data']) || Object.keys(this.covid19OutcomeData['d_data']).length < 1;
    DROPDOWN_ITEMS_Y_AXIS_EXTENDED[0].disabled = !this.covid19OutcomeData.hasOwnProperty('c_data')
      || isNullOrUndefined(this.covid19OutcomeData['c_data']) || Object.keys(this.covid19OutcomeData['c_data']).length < 1;
    if (!this.covid19OutcomeData.hasOwnProperty('r_data') || isNullOrUndefined(this.covid19OutcomeData['r_data'])
      || Object.keys(this.covid19OutcomeData['r_data']).length < 1) {
      DROPDOWN_ITEMS_Y_AXIS_EXTENDED[2].disabled = true;
      if (this.CURRENT_DROPDOWN_ITEMS_Y_AXIS === DROPDOWN_ITEMS_Y_AXIS[2]) {
        this.CURRENT_DROPDOWN_ITEMS_Y_AXIS = DROPDOWN_ITEMS_Y_AXIS[0];
        this.upDateYAxisAndSubmit(this.CURRENT_DROPDOWN_ITEMS_Y_AXIS);
      }
    } else {
      DROPDOWN_ITEMS_Y_AXIS_EXTENDED[2].disabled = false;
    }
    if (!this.covid19OutcomeData.hasOwnProperty('t_data') || isNullOrUndefined(this.covid19OutcomeData['t_data'])
      || Object.keys(this.covid19OutcomeData['t_data']).length < 1) {
      DROPDOWN_ITEMS_Y_AXIS_EXTENDED[3].disabled = true;
      if (this.CURRENT_DROPDOWN_ITEMS_Y_AXIS === DROPDOWN_ITEMS_Y_AXIS[3]) {
        this.CURRENT_DROPDOWN_ITEMS_Y_AXIS = DROPDOWN_ITEMS_Y_AXIS[0];
        this.upDateYAxisAndSubmit(this.CURRENT_DROPDOWN_ITEMS_Y_AXIS);
      }
    } else {
      DROPDOWN_ITEMS_Y_AXIS_EXTENDED[3].disabled = false;
    }
    if (!this.covid19OutcomeData.hasOwnProperty('h_data') || isNullOrUndefined(this.covid19OutcomeData['h_data'])
      || Object.keys(this.covid19OutcomeData['h_data']).length < 1) {
      DROPDOWN_ITEMS_Y_AXIS_EXTENDED[4].disabled = true;
      if (this.CURRENT_DROPDOWN_ITEMS_Y_AXIS === DROPDOWN_ITEMS_Y_AXIS[4]) {
        this.CURRENT_DROPDOWN_ITEMS_Y_AXIS = DROPDOWN_ITEMS_Y_AXIS[0];
        this.upDateYAxisAndSubmit(this.CURRENT_DROPDOWN_ITEMS_Y_AXIS);
      }
    } else {
      DROPDOWN_ITEMS_Y_AXIS_EXTENDED[4].disabled = false;
    }
  }

  private setDateSlider(ceil?: number) {
    if (isNullOrUndefined(ceil)) { ceil = IMPORTANT_DATES.current.getTime(); this.ceil = ceil; }
    this.date = ceil;
    this.dateRange = this.createDateRange(ceil);
    this.startValue = this.dateRange[0].getTime();
    //  this.EndValue = this.dateRange[89].getTime();

    this.value = this.dateRange[this.dateRange.length - 1].getTime();
    this.options = {
      stepsArray: this.dateRange.map((date: Date) => {
        return { value: date.getTime() };
      }),
      translate: (value: number, label: LabelType): string => {
        if (label === LabelType.Low) {
          return this.datePipe.transform(new Date(value), 'yyyy-MM-dd');
        } else { return ''; }

      }
    };
    this.counter = getDaysBetweenTimestampInDays(this.ceil, this.startValue);
    this.valueChange(this.ceil);
  }

  private setDaySlider(ceil?: number) {
    if (isNullOrUndefined(ceil)) { ceil = getDaysBtnCurrentMillsAndGivenMills(IMPORTANT_DATES.start.getTime()); }
    this.date = ceil;
    this.startValue = 1;
    this.value = ceil;
    this.options = {
      floor: 1,
      ceil: ceil,
      translate: (value: number, label: LabelType): string => {
        if (label === LabelType.Low) {
          return 'Day ' + value;
        } else { return ''; }
      }
    };
    this.counter = 0;
  }

  createDateRange(ceil?: number): Date[] {
    const dates: Date[] = [];
    const firstDate: Date = IMPORTANT_DATES.start;
    let numberOfDays;
    if (isNullOrUndefined(ceil)) { numberOfDays = getDaysBtnCurrentMillsAndGivenMills(firstDate.getTime()); } else {
      numberOfDays = getDaysBetweenTimestampInDays(ceil, firstDate.getTime()); }
    for (let i = 0; i <= numberOfDays; i++) {
      const thisDate = new Date(firstDate.getTime());
      thisDate.setDate(firstDate.getDate() + i);
      dates.push(thisDate);
    }
    return dates;
  }

  open(content) {
    this.setupForm();
    this.setValues();
    this.modalService.open(content, {ariaLabelledBy: 'modal-basic-title',  size: 'sm'}).result.then((result) => {
      this.closeResult = `Closed with: ${result}`;
      // at this point this dataAndDataSourcesConfigs will be sent as an attribute
      if (result === 'Set to default click') {
        this.dataAndDataSourcesConfigs = {measuresDataSources: MEASURES_DATA_SOURCES, verifiedCMData: true, topKAdmins: 15, topKCm: 5,
          kDays: 7, per100kPop: this.getCurrentPopSizeStatus(this.CURRENT_MEASURES_DATA_POP_SIZE), showSimilarityBars: true,
          countermeasureRestriction: COUNTERMEASURES_RESTRICTION_TYPES[0]};
      }
      this.updateAndEmitDataAndDataSourcesConfigs(false);
    }, (reason) => {
      this.closeResult = `Dismissed ${this.getDismissReason(reason)}`;
    });
  }

  private getDismissReason(reason: any): string {
    if (reason === ModalDismissReasons.ESC) {
      return 'by pressing ESC';
    } else if (reason === ModalDismissReasons.BACKDROP_CLICK) {
      return 'by clicking on a backdrop';
    } else {
      return  `with: ${reason}`;
    }
  }

  /**
   * implements a count down that delays for 1000ms
   */
  startCountDown(seconds) {
    this.counter = seconds;
    this.interval = setInterval(() => {
      this.counter--;
      if (this.CURRENT_DROPDOWN_ITEMS_X_AXIS === this.DROPDOWN_ITEMS_X_AXIS[0]) {
        this.value = this.value + (1000 * 60 * 60 * 24);

        if (this.counter < 0 || this.value > this.ceil) {
          this.playPause(true);
          console.log('Ding!');
        }
      } else {
        this.value = this.value + (1);
        if (this.counter < 0 || this.value > this.ceil) {
          this.playPause(true);
          console.log('Ding!');
        }
      }
    }, 500);
  }

  /**
   * start and stop the play button so as to navigate through the timeline
   */
  playPause(clear?) {
    if (clear) {
      this.value = this.ceil;
      clearInterval(this.interval);
      this.counter = 0;
      this.play = true;
      this.playPauseButton = 'play_circle_outline';
    } else if (this.play) {
      // TODO: disable click for like 5 secs
      // start counter
      if (this.CURRENT_DROPDOWN_ITEMS_X_AXIS === this.DROPDOWN_ITEMS_X_AXIS[0]) {
        this.counter = getDaysBetweenTimestampInDays(this.ceil, this.value);
      } else {
        this.counter = this.ceil - this.value;
      }
      this.startCountDown(this.counter);
      // set play to false
      this.play = false;
      // set icon to pause
      this.playPauseButton = 'pause_circle_outline';
    } else if (!this.play) {
      // TODO: disable click for like 5 secs
      // pause counter
      clearInterval(this.interval);
      // set play to true
      this.play = true;
      // set icon to play
      this.playPauseButton = 'play_circle_outline';
    }
  }
}
