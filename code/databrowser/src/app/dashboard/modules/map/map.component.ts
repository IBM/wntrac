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

import {Component, EventEmitter, HostListener, Input, OnChanges, OnInit, Output, SimpleChange} from '@angular/core';

import * as L from 'leaflet';
import 'leaflet.markercluster';
import {MapPopUpService} from '../../../services/map-pop-up/map-pop-up.service';
import {DataLoaderService} from '../../../services/data-loader/data-loader.service';
import {isNullOrUndefined} from 'util';
import {getColor, givenISOCodeAndCountriesDictionaryGetCountryName, numberWithCommas} from '../../../functions/functions';
import {GLYPHS, MAP_POPUP_OPTIONS} from '../../../constants/map.constants';
import {DatePipe} from '@angular/common';
import {DROPDOWN_ITEMS_GLOBAL_US} from '../../../constants/general.constants';
import {environment} from '../../../../environments/environment';


@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit, OnChanges {
  @Input() markers: L.Marker[];
  @Input() height: number;
  @Input() mapPadding: number;
  @Input() showGeoJSON?: boolean;
  @Input() noClustering?: boolean;
  @Input() polyLines?: L.Polyline[];
  @Input() zoomCenterObj?: any;
  @Input() geoJSONObject?: any;
  @Input() admin1GeoJSONObject?: any;
  @Output() selectedAttribute = new EventEmitter<any>();
  @Input() controlAttributes: any;
  @Input() chartSelectedTerritory: any;
  @Input() countermeasureSimilarityBars: any;
  @Input() dict: any;
  defaultGeoJSONObject: any;
  markerClusterGroup: L.MarkerClusterGroup;
  markerClusterData: any[] = [];
  layers: L.Layer[] = [];
  map: L.Map;
  fitBounds: L.LatLngBounds;
  polygons: L.Polygon[] = [];
  innerHeight: number;
  layer1: any;
  layer0: any;
  admin1Layer: any;
  glyphOptions: any;
  selectedGlyph: string;
  dateInformation: string;
  mapbox_api_key = environment.mapbox_api_key;
  layer_link = 'https://api.mapbox.com/styles/v1/mapbox/light-v10/tiles/512/{z}/{x}/{y}@2x?access_token=';
  mapboxTiles = L.tileLayer(this.layer_link + this.mapbox_api_key, {
    maxZoom: 20,
    minZoom: 2,
    tileSize: 512,
    zoomOffset: -1,
    attribution: '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a>'
  });
  densityPartitionArray = [];
  private legend: any;
  private similarityLegend: any;

  chartSelectedFeatureStyle = {
    weight: 4,
    color: '#666',
    dashArray: '0',
    opacity: 1,
    fillOpacity: 0.6
  };

  options = {
    layers: [this.mapboxTiles],
    zoom: 2,
    zoomControl: false,
    maxBounds: [[-90, -180], [90, 180]],
    center: L.latLng([0.0, 0.0])
  };

  constructor(private mapPopUpService: MapPopUpService, private jhuDataLoaderService: DataLoaderService,
              private datePipe: DatePipe) {
    this.markerClusterGroup = L.markerClusterGroup();
    this.jhuDataLoaderService.loadWorldGeoJson().subscribe(data => {
      this.defaultGeoJSONObject = data;
    });
    this.glyphOptions = Object.values(GLYPHS);
    this.selectedGlyph = GLYPHS.choropleth.key;
  }

  ngOnInit() {
    this.innerHeight = window.innerHeight;
  }

  changeGlyph($event) {
    this.selectedAttribute.emit({selectedGlyph: $event.value, extra: 'from_map'});
  }

  ngOnChanges(changes: {[propKey: string]: SimpleChange}) {
    if (!isNullOrUndefined(changes.zoomCenterObj)) {
      if (this.map) {
        if (isNullOrUndefined(changes.zoomCenterObj.currentValue.admin)) {
          this.map.setView(changes.zoomCenterObj.currentValue.center, changes.zoomCenterObj.currentValue.zoom);
        } else {
          const thisGeoJSONFeature =  Object.keys(this.layer1['_layers']).filter(key => {
            const feature = this.layer1['_layers'][key]['feature'];
            return (feature.properties.ISO_A2 === changes.zoomCenterObj.currentValue.admin)
              || (feature.properties.NAME.toLowerCase() === changes.zoomCenterObj.currentValue.admin.toLowerCase() );
          })[0];
          if (!isNullOrUndefined(thisGeoJSONFeature)) {
            this.map.fitBounds(this.layer1['_layers'][thisGeoJSONFeature].getBounds());
          }
        }
      }
    }
    if (this.controlAttributes.xAxis === 'Date') {
      const formatedDate = this.datePipe.transform(this.controlAttributes.date, 'MMM d, y');
      this.dateInformation = `As of ${formatedDate}`;
    } else {
      const days = this.controlAttributes.date;
      const qualifier = this.controlAttributes.xAxis;
      this.dateInformation = `${days} ${qualifier}`;
    }

    if (this.noClustering) {
      this.layers = this.markers;
    } else {
      this.markerClusterData = this.markers;
    }

    this.addDefaultLayerToShowCountryBoundaries();

    if (this.polyLines && this.polyLines[0]) {
      const polyLinesGroup = L.layerGroup(this.polyLines);
      this.layers.push(polyLinesGroup);
    }

    if (this.geoJSONObject) {
      const that = this;
      let keepGoing = true;
      this.layers = [];
      this.markerClusterData = [];
      this.densityPartitionArray = [];
      this.geoJSONObject.features.forEach(feature => {
        if (!isNullOrUndefined(feature.properties['densityPartition']) && keepGoing) {
          for (let i = 0; i < 6; i++) {
            this.densityPartitionArray.push(feature.properties['densityPartition'][i]);
          }
        }
        keepGoing = false;
      });
      this.layer1 = L.geoJSON(this.geoJSONObject, {style: function(feature) {
        return that.style(feature, that.controlAttributes);
        },
        onEachFeature(feature, layer): void {
        layer.on('mouseover', (e) => that.highlightFeature(e, feature));
        layer.on('mouseout', (e) => that.resetHighlight(e));
        layer.on('click', (e) => that.zoomToFeature(e, feature));
        }});
      this.layers.push(this.layer1);
    }

    if (changes.hasOwnProperty('chartSelectedTerritory') && !changes['chartSelectedTerritory'].isFirstChange()) {
      if (isNullOrUndefined(changes.chartSelectedTerritory.currentValue)) {
        return;
      }

      this.highlightChartSelectedRegion(changes.chartSelectedTerritory.currentValue, false);
    }

    if (this.countermeasureSimilarityBars) {
      const countermeasureSimilarityGroup = L.layerGroup(this.countermeasureSimilarityBars);
      this.layers.push(countermeasureSimilarityGroup);
    }

    this.fitMapBounds();
  }

  style(feature, controlAttributes) {
    let d;
    let densityPartition;
    if (feature !== undefined && feature.properties !== undefined
      && feature.properties.densityPartition !== undefined && feature.properties.densityPartition.length > 0) {
      d = parseInt(feature.properties.density, 10);
      densityPartition = feature.properties.densityPartition;
    }
    // fill color
    const someKindOfYellow = ['#FED976', '#FEB24C', '#FD8D3C', '#FC4E2A', '#E31A1C', '#BD0026', '#800026'];
    const someKindOfBlue = ['#c6dbef', '#9ecae1', '#6baed6', '#4292c6', '#2171b5', '#08519c', '#08306b'];
    const someKindOfBlack = ['#d9d9d9', '#bdbdbd', '#969696', '#737373', '#525252', '#252525', '#000000'];
    let fillColor = someKindOfBlack[0];

    const shadingArray = someKindOfYellow;

    if (!isNullOrUndefined(d) && !isNullOrUndefined(densityPartition) &&
      (feature.properties.hasOwnProperty('counterMeasure') || controlAttributes.selectedCounterMeasure.length === 0)) {
      // Check if feature has countermeasures in selectedCounterMeasure array
      // If not we set the default shading color and return the style.
      // Hence we will be able to show countermeasure intersection on the choropleth
      if (feature.properties.hasOwnProperty('counterMeasure') && controlAttributes.selectedCounterMeasure.length > 0) {
        let featureHasSelectedCountermeasures = true;
        const featureCountermeasures = feature.properties.counterMeasure.toLowerCase().split(', ');
        featureCountermeasures.map(x => x.replace(/_/g, ' '));
        const controlSelectedCountermeasures = controlAttributes.selectedCounterMeasure;
        controlSelectedCountermeasures.map(x => x.toLowerCase());

        for (const controlSelectedCountermeasure of controlSelectedCountermeasures) {
          if (!featureCountermeasures.includes(controlSelectedCountermeasure.replace(/_/g, ' '))) {
            featureHasSelectedCountermeasures = false;
            break;
          }
        }

        if (!featureHasSelectedCountermeasures) {
          fillColor = someKindOfBlack[0];
          return {
            fillColor: fillColor,
            weight: 0.5,
            opacity: 0.6,
            color: '#ccc',
            dashArray: '2',
            fillOpacity: 0.4
          };
        }
      }
      const densityPartitionLength = densityPartition.length;
      if (d > parseInt(densityPartition[densityPartitionLength - 1], 10)) {
        fillColor = shadingArray[6];
      } else if (d >= parseInt(densityPartition[densityPartitionLength - 2], 10)) {
        fillColor = shadingArray[5];
      } else if (d >= parseInt(densityPartition[densityPartitionLength - 3], 10)) {
        fillColor = shadingArray[4];
      } else if (d >= parseInt(densityPartition[densityPartitionLength - 4], 10)) {
        fillColor = shadingArray[3];
      } else if (d >= parseInt(densityPartition[densityPartitionLength - 5], 10)) {
        fillColor = shadingArray[2];
      } else if (d >= parseInt(densityPartition[0], 10)) {
        fillColor = shadingArray[1];
      } else if (d < parseInt(densityPartition[0], 10)) {
        fillColor = shadingArray[0];
      }
    }
    return {
      fillColor: fillColor,
      weight: 0.5,
      opacity: 0.6,
      color: '#ccc',
      dashArray: '2',
      fillOpacity: 0.4
    };
  }

  highlightFeature(e, feature, noData = false) {
    const layer = e.target;

    let featureWeight = 2.5;
    let featureColor = '#999';
    let featureFillOpacity = 0.7;

    if (layer.options.weight === this.chartSelectedFeatureStyle.weight) {
      featureWeight = 5;
      featureColor = '#606060';
      featureFillOpacity = 0.7125;
    }

    layer.setStyle({
      weight: featureWeight,
      color: featureColor,
      dashArray: '',
      fillOpacity: featureFillOpacity
    });

    // create popup contents
    let customPopup = '';
    if (noData) {
      customPopup = 'No Data Available';
    } else {
      customPopup = this.mapPopUpService.makeCMPopupWithYAxisInfo(feature.properties.NAME, feature.properties.counterMeasure,
        feature.properties.startDate, feature.properties.endDate, feature.properties.densityFeature, feature.properties.density);
    }

    // specify popup options
    const popupOffsetPosition = L.point(0, -5);
    MAP_POPUP_OPTIONS['offset'] = popupOffsetPosition;

    layer.bindPopup(customPopup, MAP_POPUP_OPTIONS).openPopup(e.latlng);

    if (isNullOrUndefined(this.countermeasureSimilarityBars)) {
      if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
        layer.bringToFront();
      }
    }
    this.fitMapBounds();
  }

  resetHighlight(e, noData = false) {
    setTimeout(function() {
      e.target.closePopup();
      }, 50);
    if (noData) {
      this.admin1Layer.resetStyle(e.target);
    } else {
      this.layer1.resetStyle(e.target);
    }

    if (!isNullOrUndefined(this.chartSelectedTerritory)) {
      this.highlightChartSelectedRegion(this.chartSelectedTerritory, true);
    }
    this.fitMapBounds();
  }

  zoomToFeature(e, feature) {
    const locationIdentity = {};
    if (!isNullOrUndefined(feature.properties.ISO_A2)) {
      this.controlAttributes['geo'] = feature.properties.ISO_A2;
      locationIdentity['ISO_A2'] = feature.properties.ISO_A2;
      locationIdentity['ISO_A3'] = feature.properties.ISO_A3;
    } else {
      this.controlAttributes['geo'] = 'admin1';
      if (isNullOrUndefined(feature.properties.densityFeature)) { this.controlAttributes['geo'] = null; }
    }
    locationIdentity['NAME'] = feature.properties.NAME;
    this.selectedAttribute.emit({clickedLocationIdentity: locationIdentity, contAttr: this.controlAttributes, extra: 'from_map'});
    this.map.fitBounds(e.target.getBounds());
    this.fitMapBounds();
  }



  onMapReady (map) {
    this.map = map;

    setTimeout(() => {
      this.map.invalidateSize();
    }, 0);
    // this.map.invalidateSize();
    if (this.showGeoJSON) {
      this.map.addControl(L.control.zoom({ position: 'topright' }));
    } else {
      this.map.addControl(L.control.zoom({ position: 'topleft' }));
    }
    this.fitMapBounds();
    // this.makeLegend(map);
  }

  private makeLegend(map) {
    const legend = new (L.Control.extend({
      options: {position: 'bottomright'}
    }));

    legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'map-legend');
      const keyRanges = this.densityPartitionArray;
      div.innerHTML = '';

      // loop through the density intervals and generate a label with a colored square for each interval
      div.innerHTML +=
        '<i style="background:' + getColor(null) + '"></i> ' + 'No data' + '<br>';
      for (let i = 0; i < keyRanges.length; i++) {
        if (isNullOrUndefined(keyRanges[i]) && isNullOrUndefined(keyRanges[i + 1])) {
          continue;
        }
        div.innerHTML +=
          '<i style="background:' + getColor(keyRanges[i] + 1, keyRanges) + '"></i> ' +
          numberWithCommas(keyRanges[i]) + (!isNullOrUndefined(keyRanges[i + 1]) ? '&ndash;' + numberWithCommas(keyRanges[i + 1]) + '<br>' :
          '+ ' + this.controlAttributes.yAxis);
      }
      return div;
    };
    legend.addTo(map);
    return legend;
  }

  private makeSimilarityLegend(map) {
    const legend = new (L.Control.extend({
      options: {position: 'bottomleft'}
    }));

    const popup = L.popup({maxWidth: 200});

    let customPopup = '';
    if (isNullOrUndefined(this.controlAttributes.latlng) || isNullOrUndefined(this.controlAttributes.latlng.customMeta)
      || isNullOrUndefined(this.controlAttributes.latlng.customMeta.data)
      || isNullOrUndefined(this.controlAttributes.latlng.customMeta.data.meta)
      || isNullOrUndefined(this.controlAttributes.latlng.customMeta.data.meta.admin)) {
      customPopup = 'This shows the ratio of NPI types implemented to overall NPI types';
    } else {
      const name = givenISOCodeAndCountriesDictionaryGetCountryName(this.controlAttributes.latlng.customMeta.data.meta.admin, this.dict);
      customPopup = 'This shows the ratio of NPI types implemented to overall ' + name + ' NPI types';
    }

    legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'similarity-legend');
      div.innerHTML = '<img src="assets/images/similarity_bar.png"><span>NPI Index</span>';
      div.addEventListener('mouseover', function (event) {
        const pointXY = L.point(163, 570);
        const pointlatlng = map.containerPointToLatLng(pointXY);
        popup
          .setLatLng(pointlatlng)
          .setContent(customPopup)
          .openOn(map);
      });
      div.addEventListener('mouseout', function (event) {
        map.closePopup();
      });
      return div;
    };
    legend.addTo(map);
    return legend;
  }

  addDefaultLayerToShowCountryBoundaries() {
    let defaultGeoJSONToUse = this.defaultGeoJSONObject;
    if (!isNullOrUndefined(this.controlAttributes) && !isNullOrUndefined(this.admin1GeoJSONObject)
      && this.controlAttributes['parentGeo'] !== DROPDOWN_ITEMS_GLOBAL_US[0]) {
      defaultGeoJSONToUse = this.admin1GeoJSONObject;
      this.finishPuttingBoundaryOnDefaultLayer(defaultGeoJSONToUse);
    } else if (isNullOrUndefined(this.geoJSONObject) &&
      this.controlAttributes['parentGeo'] !== DROPDOWN_ITEMS_GLOBAL_US[0] && isNullOrUndefined(this.admin1GeoJSONObject)) {
      // this case handles showing the boundaries under spikes and bubbles
      this.jhuDataLoaderService.loadSelectedCountryAdmin1GeoJson(this.controlAttributes['parentGeo'].toLowerCase()).subscribe(data => {
        defaultGeoJSONToUse = data;
        this.admin1GeoJSONObject = defaultGeoJSONToUse;
        // since this may delay we need to overlay the polylines
        this.finishPuttingBoundaryOnDefaultLayer(defaultGeoJSONToUse, true);
      });
    } else {
      this.finishPuttingBoundaryOnDefaultLayer(defaultGeoJSONToUse);
    }
  }

  finishPuttingBoundaryOnDefaultLayer(defaultGeoJSONToUse, delayedLayer = false) {
    const that = this;

    if (defaultGeoJSONToUse) {
      const topLayerShowCountryBoundaries = L.geoJSON(defaultGeoJSONToUse, {style: {
          // fillColor: '#f6f6f3',
          fillColor: '#ffffff',
          weight: 1,
          opacity: 0.6,
          color: '#ccc',
          dashArray: '0',
          fillOpacity: 0
        },
        onEachFeature(feature, layer): void {
          layer.on('click', (e) => that.zoomToFeature(e, feature));
        }});
      this.layers = [];
      this.layer0 = topLayerShowCountryBoundaries;
      this.layers.push(topLayerShowCountryBoundaries);
      if (delayedLayer) {
        if (this.polyLines && this.polyLines[0]) {
          const polyLinesGroup = L.layerGroup(this.polyLines);
          this.layers.push(polyLinesGroup);
        }

        if (this.countermeasureSimilarityBars) {
          const countermeasureSimilarityGroup = L.layerGroup(this.countermeasureSimilarityBars);
          this.layers.push(countermeasureSimilarityGroup);
        }
      }
    }
  }

  highlightChartSelectedRegion(chartSelectedTerritory, fromHoverEvent) {
    let countryName = chartSelectedTerritory.customMeta.data.meta.admin;
    if (isNullOrUndefined(countryName)) {
      countryName = chartSelectedTerritory.customMeta.data.name;
    }

    let topLayerFeatures = null;
    topLayerFeatures = Object.values(this.layers[0]['_layers']);

    let chosenFeature = topLayerFeatures.find(x => x['feature']['properties']['ISO_A2'] === countryName);
    if (!isNullOrUndefined(this.controlAttributes.parentGeo) && this.controlAttributes.parentGeo !== DROPDOWN_ITEMS_GLOBAL_US[0]) {
      chosenFeature = topLayerFeatures.find(x => x['feature']['properties']['NAME'] === countryName);
    } else if (isNullOrUndefined(chosenFeature)) {
      // handle when event emanates from the chart
      chosenFeature = topLayerFeatures.find(x => x['feature']['properties']['NAME'] === countryName);
    }

    if (!isNullOrUndefined(chosenFeature)) {
      const leafletId = chosenFeature['_leaflet_id'];

      let featureToStyle = null;
      featureToStyle = this.layers[0]['_layers'][leafletId];

      featureToStyle.setStyle(this.chartSelectedFeatureStyle);
    }
  }

  markerClusterReady(group: L.MarkerClusterGroup) {
    this.markerClusterGroup = group;
  }

  fitMapBounds() {
    if (this.map) {
      if (!isNullOrUndefined(this.legend)) { this.map.removeControl(this.legend); }
      if (this.geoJSONObject) {
        this.legend = this.makeLegend(this.map);
      }
      if (!isNullOrUndefined(this.similarityLegend)) { this.map.removeControl(this.similarityLegend); }
      if (this.countermeasureSimilarityBars) {
        this.similarityLegend = this.makeSimilarityLegend(this.map);
      }
      if (this.polygons && this.polygons.length > 0) {
        try {
          const bounds = this.polygons[0].getBounds();
          for (let i = 1; i < this.polygons.length; i++) {
            bounds.extend(this.polygons[i].getBounds());
          }
          this.map.fitBounds(bounds, {padding: [this.mapPadding, this.mapPadding], maxZoom: 16});
        } catch (e) {
          if (this.markers && this.markers.length > 0) {
            this.map.setView(this.markers[0].getLatLng(), 13);
          }
        }
      } else if (this.markers && this.markers.length > 0) {
        const bounds = L.featureGroup(this.markers);
        // this.map.fitBounds(bounds.getBounds(), { padding: [this.mapPadding, this.mapPadding], maxZoom: 13 });
      } else if (this.polyLines && this.polyLines.length > 0) {
        const bounds = L.featureGroup(this.polyLines);
        // this.map.fitBounds(bounds.getBounds(), { padding: [this.mapPadding, this.mapPadding], maxZoom: 13});
      }
    }
  }

  getStyle() {
    if (this.showGeoJSON) {
      return {
        height: this.innerHeight + 'px'
      };
    } else {
      return {
        height: this.height + 'px'
      };
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize(event) {
    this.innerHeight = window.innerHeight;
  }

  getAsOfLength(dateInformation: string) {
    if (isNullOrUndefined(dateInformation) || dateInformation.length === 0) { return 120; }
    return Math.ceil(dateInformation.length * (132 / 18));
  }
}
