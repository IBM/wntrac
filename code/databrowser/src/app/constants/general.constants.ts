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

export const DROPDOWN_ITEMS_X_AXIS = [
  'Date',
  'Days Since ...'
];

export const DROPDOWN_ITEMS_Y_AXIS = [
  'Confirmed Cases',
  'Confirmed Deaths',
  'Recoveries',
  'Testing',
  'Hospitalization'
];

export const DROPDOWN_ITEMS_Y_AXIS_EXTENDED = [
  {name: 'Confirmed Cases', disabled: false},
  {name: 'Confirmed Deaths', disabled: false},
  {name: 'Recoveries', disabled: false},
  {name: 'Testing', disabled: false},
  {name: 'Hospitalization', disabled: false}
];

export const DROPDOWN_ITEMS_Y_SCALE = [
  'Linear Scale',
  'Log Scale'
];

export const DROPDOWN_ITEMS_GLOBAL_US = [
  'Global',
  'US'
];

export const MEASURES_DATA_SOURCES = [
  'CEDP',
  'JHU'
];

export const COUNTERMEASURES_RESTRICTION_TYPES = [
  'Imposed & Lifted',
  'Imposed',
  'Lifted'
];

export const MEASURES_DATA_POP_SIZE = [
  'None',
  'Per 100k'
];

export const IMPORTANT_DATES = {
  start: new Date(2020, 0, 22),
  current: new Date(2020, 5, 5)
};
export const ZOOM_LEVELS_FOR_ADMINS_NEEDING_SPECIAL_HANDLING_OF_ZOOM = {
  SM: 10,
  YT: 10,
  GF: 7,
  FR: 5,
  US: 4,
  CN: 4,
  CA: 3,
};

export const LANDING_PAGE_URL = 'https://ibm.github.io/wntrac/';
