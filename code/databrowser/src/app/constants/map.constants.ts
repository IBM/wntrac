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

export const MAP_COLORS_OUTCOMES = {
  deaths: '#aaa',
  cases: '#aaa',
  recoveries: '#aaa',
  tests: '#aaa',
  hospitalization: '#aaa'
};

export const GLYPHS = {
  choropleth: {key: 'choropleth', name: 'Choropleth'},
  spikes: {key: 'spikes', name: 'Spikes'},
  bubbles: {key: 'bubbles', name: 'Bubbles'}
};

export const MAP_POPUP_OPTIONS = {
  'maxWidth': 150,
  'className' : 'custom-popup',
  'closeButton': true,
  'autoPan': false,
  'keepInView': true,
};
