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

import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';



import {
  MatButtonModule, MatCheckboxModule, MatGridListModule, MatCardModule,
  MatDividerModule, MatListModule, MatSelectModule, MatIconModule, MatExpansionModule, MatSliderModule, MatBadgeModule
} from '@angular/material';

import { DashboardComponent } from './dashboard/dashboard.component';
import { ControlPanelComponent } from './dashboard/modules/control-panel/control-panel.component';
import { MapComponent } from './dashboard/modules/map/map.component';
import { GraphComponent } from './dashboard/modules/graph/graph.component';

import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {Ng5SliderModule} from 'ng5-slider';
import * as PlotlyJS from 'plotly.js-basic-dist';
import { PlotlyModule } from 'angular-plotly.js';
import {LeafletModule} from '@asymmetrik/ngx-leaflet';
import {LeafletMarkerClusterModule} from '@asymmetrik/ngx-leaflet-markercluster';
import {ChartCovidService} from './services/chart-covid/chart-covid.service';
import {CurateDataService} from './services/curate-data/curate-data.service';
import {DataLoaderService} from './services/data-loader/data-loader.service';
import {MapMarkerService} from './services/map-marker/map-marker.service';
import {MapPopUpService} from './services/map-pop-up/map-pop-up.service';
import {HttpClientModule} from '@angular/common/http';
import {DatePipe} from '@angular/common';
import {PlotlyJsComponent} from './dashboard/modules/plotly-js/plotly-js.component';
import {NgProgressModule} from '@ngx-progressbar/core';
import {NgProgressHttpModule} from '@ngx-progressbar/http';
import {LoaderComponent} from './loader/loader.component';

PlotlyModule.plotlyjs = PlotlyJS;

@NgModule({
  declarations: [
    AppComponent,
    DashboardComponent,
    ControlPanelComponent,
    MapComponent,
    GraphComponent,
    PlotlyJsComponent,
    LoaderComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    MatButtonModule, MatCheckboxModule, MatGridListModule, MatCardModule, MatDividerModule, MatListModule,
    MatSelectModule, MatIconModule, MatExpansionModule, MatSliderModule, MatBadgeModule,
    AppRoutingModule, FormsModule, ReactiveFormsModule,
    NgProgressModule,
    NgProgressHttpModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    NgbModule,
    Ng5SliderModule,
    PlotlyModule,
    LeafletModule.forRoot(),
    LeafletMarkerClusterModule.forRoot(),
    NgbModule
  ],
  providers: [
    ChartCovidService,
    CurateDataService,
    DataLoaderService,
    MapMarkerService,
    MapPopUpService,
    DatePipe],
  bootstrap: [AppComponent]
})
export class AppModule { }
