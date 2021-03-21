/**
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

import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../api.service';
import {FormBuilder} from '@angular/forms';
import {isNotNullOrUndefined} from 'codelyzer/util/isNotNullOrUndefined';

@Component({
  selector: 'app-uncategorized-evidence',
  templateUrl: './uncategorized-evidence.component.html',
  styleUrls: ['./uncategorized-evidence.component.scss'],
})
export class UncategorizedEvidenceComponent implements OnInit {

  uncategorized: Array<object> = [];
  documentText: Array<object> = [];
  loading = false;
  evidences: Array<object> = [];
  types: Array<object> = [];
  unmappedTypes: any; // types with value field type and values
  uncategorizedFailed = false;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
  ) {}

  ngOnInit() {

    this.apiService.createSessionKey();
    this.apiService.getEventTypes().subscribe((types: any) => {}), ((error: Error) => {

    });

    const params = this.getParams(window.location.href);

    this.getUncategorizedEvidence(params);

  }

  getUncategorizedEvidence(params: any): void {
    this.loading = true;

    if (params['geo'] && params['geo'] !== '' && params['softmatch'] && params['softmatch'] === 'true') {
      var apiService = this.apiService.getSoftmatchEvidence(params['geo']);

    } else {
      var apiService = this.apiService.getUncategorizedEvidence();
    }

    apiService.then((evidenceAndDocumentText: any) => {
      this.uncategorized.push(...evidenceAndDocumentText['candidateEvidence']);
      if (evidenceAndDocumentText.hasOwnProperty('document_text')) {
        this.documentText.push(...evidenceAndDocumentText['document_text']);
      }
      this.loading = false;
    }).catch((error: Error) => {
      this.loading = false;
      this.uncategorizedFailed = true;
      // some handling for failed call
    });
  }

  getParams(url) {
    const params = {};
    const parser = document.createElement('a');
    parser.href = url;
    const query = parser.search.substring(1);
    const vars = query.split('&');
    for (let i = 0; i < vars.length; i++) {
      const pair = vars[i].split('=');
      params[pair[0]] = decodeURIComponent(pair[1]);
    }
    return params;
  }

  getEventTypes(forceUpdate = false) {
    this.apiService.getEventTypes(forceUpdate).subscribe((types: any) => {
      if (types) {
        this.types = this.apiService.mapEventTypes(types);
        const eventTypesMap = new Map();
        types.forEach(entry => {
          if (eventTypesMap.get(entry.type) === undefined) {
            let newCategories = undefined;
            if (entry.value !== 'None' && entry.official_value === 'True') {
              newCategories = [{value: entry.value, official_value: entry.official_value}];
            }
            eventTypesMap.set(entry.type,
              {
                data_type: entry.data_type,
                official_type: entry.official_type,
                integerstring: entry.integerstring,
                eventtype_id: entry.eventtype_id,
                categories: newCategories
              });
          } else {
            const mapEntry = eventTypesMap.get(entry.type);
            if (mapEntry.data_type !== entry.data_type
              || mapEntry.official_type !== entry.official_type
              || mapEntry.integerstring !== entry.integerstring
              || mapEntry.eventtype_id !== entry.eventtype_id) {
            } else {
              if (entry.official_value === 'True') {
                const newCategory = {value: entry.value, official_value: entry.official_value};
                mapEntry.categories.push(newCategory);
              }
              if (mapEntry.data_type === 'Tags' && isNotNullOrUndefined(mapEntry.categories)) {
                mapEntry.categories.sort((a, b) => (a.value.toLowerCase() > b.value.toLowerCase()) ? 1 : -1);
              }
              eventTypesMap.set(entry.type, mapEntry);
            }
          }
        });
        this.unmappedTypes = eventTypesMap;

        // TODO: Modify value field based on selected type to update values on the filter form
      }

    }), ((error: Error) => {
    });
  }

  reloadPage(): void {
    window.location.reload();
  }

  onRemove(index: number) {
    this.uncategorized.splice(index, 1);
  }

  openValidationGuidelines(): void {
    const URL = 'https://ibm.ent.box.com/folder/112408291682';
    window.open(URL, '_blank');
  }


}
