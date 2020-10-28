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

export const environment = {
  production: true,
  internalExternal: false,
  AVAILABLE_ADMIN1_GEOJSON: ['us'],
  ADMIN1_MEASURES_DATA: `assets/data/outcome/`,
  POP_SIZE_DICTIONARY: `assets/data/dictionary/country_dictionary.json`,
  ADMINS_NEEDING_SPECIAL_HANDLING_OF_ZOOM: ['US', 'FR', 'YT', 'SM', 'GF'],
  mapbox_api_key: ''
};
