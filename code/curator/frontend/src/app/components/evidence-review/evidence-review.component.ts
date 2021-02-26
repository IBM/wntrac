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

import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import { ApiService } from '../../api.service';
import {FormBuilder, Validators} from '@angular/forms';
import {
  debounceTime,
  switchMap,
} from 'rxjs/operators';
import {Observable} from 'rxjs';


@Component({
  selector: 'app-evidence-review',
  templateUrl: './evidence-review.component.html',
  styleUrls: ['./evidence-review.component.scss'],
})
export class EvidenceReviewComponent implements OnInit {

  loading = false;
  filteredCountries: Observable<string[]>;
  evidences: Array<object> = [];
  types: Array<object> = [];
  unmappedTypes: any; // types with value field type and values
  uncategorizedFailed = false;
  eventTypeValues = [];
  paginatedEvidences = [];
  pageIndex = 0;
  pageSize = 50;
  numberOfEvidences = 0;
  fetchRequestParams = {};
  formIsComplete = false;

  @ViewChild('searchResultsContainer') searchResultsContainer: ElementRef;

  evidenceFilterForm = this.fb.group({
    country: [''],
    date: [''],
    type: [''],
    value: [''],
    restriction: [''],
  });
  newEvidence = {};

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
  ) {}

  ngOnInit() {

    this.apiService.createSessionKey();
    this.apiService.getEventTypes().subscribe((types: any) => {}), ((error: Error) => {
      // some handling for failed call
      console.group('BaseComponent');
      console.log('Error getting event types');
      console.log(error);
      console.log(error.stack);
      console.groupEnd();
    });


    this.getEvidences();

    this.filteredCountries = this.evidenceFilterForm.controls.country.valueChanges
      .pipe(
        debounceTime(500),
        switchMap((value) => this.apiService.getCountryCodes(value.toLowerCase(), true))
      );

  }

  getEventTypes(forceUpdate = false) {
    this.apiService.getEventTypes(forceUpdate).subscribe((types: any) => {
      if (types) {
        this.types = this.apiService.mapEventTypes(types);
        console.log(this.types);
        const eventTypesMap = new Map();
        types.forEach(entry => {
          if (eventTypesMap.get(entry.type) === undefined) {
            let newCategories = undefined;
            if (entry.value !== 'None') {
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
              console.error('Mismatch in preexisting map value!');
            } else {
              const newCategory = {value: entry.value, official_value: entry.official_value};
              mapEntry.categories.push(newCategory);
              if (mapEntry.data_type === 'Tags') {
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
      // some handling for failed call
      console.group('BaseComponent');
      console.log('Error getting event types');
      console.log(error);
      console.log(error.stack);
      console.groupEnd();
    });
  }

  getEvidences(filters?: any): void {
    this.loading = true;

    // To prepare dropdown of event types
    this.getEventTypes();

    this.updateServerFetchRequestParams();

    this.apiService.getEvidence(this.fetchRequestParams, filters).then((evidences: any) => {
      const evidencesKey = 'evidences';
      // console.group('BaseComponent while fetching evidences');
      // console.log(...evidences[evidencesKey]);
      // console.groupEnd();
      this.evidences.push(...evidences[evidencesKey]);
      this.determineEvidenceSiblings();
      this.numberOfEvidences = this.evidences.length;
      this.loading = false;
      this.updateEvidencesList({});
    }).catch((error: Error) => {
      this.loading = false;
      this.uncategorizedFailed = true;
      // some handling for failed call
      console.group('BaseComponent while fetching evidences');
      console.log('Error getting evidences');
      console.log(error.stack);
      console.groupEnd();
    });
  }

  determineEvidenceSiblings() {
    const evenIdKey = 'even_id';
    const eventIds = this.evidences.map(evidence => evidence[evenIdKey]);
    const updatedEvidences = this.evidences.map(evidence => {
      const eventId = evidence[evenIdKey];
      const newPropertyKey = 'sibling';
      let hasSibling = false;
      let firstHit = 0;
      firstHit = eventIds.indexOf(eventId);
      if (firstHit > -1) {
        hasSibling = eventIds.indexOf(eventId, firstHit + 1) > -1;
      }
      evidence[newPropertyKey] = hasSibling;
      return evidence;
    });
    this.evidences = updatedEvidences;
  }

  reloadPage(): void {
    window.location.reload();
  }

  openValidationGuidelines(): void {
    const URL = 'https://ibm.ent.box.com/folder/112408291682';
    window.open(URL, '_blank');
  }

  filterEvidences(append?: boolean): void {
    console.log('filter evidences');
    if (!append) {
      this.evidences = [];
      this.pageIndex = 0;
    }
    const filters = this.evidenceFilterForm.value;
    if (filters.country !== '' && filters.date !== '' && filters.restriction !== '' && filters.type !== ''
      && filters.value !== '') {
      this.formIsComplete = true;
      this.newEvidence = {
        country: filters.country,
        date: filters.date,
        type: filters.type,
        value: filters.value,
        restriction: filters.restriction
      }
    } else {
      this.formIsComplete = false;
      this.newEvidence = {};
    }
    console.log(filters);
    this.getEvidences(filters);
  }

  updateEventValue() {
    this.eventTypeValues = [];
    const eventValues = this.unmappedTypes.get(this.evidenceFilterForm.controls.type.value);
    eventValues.categories?.forEach(category => {
      this.eventTypeValues.push(category.value);
    });
  }

  updateEvidencesList(event) {
    this.paginatedEvidences = [];
    if (event.hasOwnProperty('pageIndex')) {
      this.pageIndex = event.pageIndex;
      this.pageSize = event.pageSize;
      if ((((this.pageIndex + 1) * this.pageSize) + 1) > (this.evidences.length - this.pageSize)) {
        // fetch more evidences
        this.filterEvidences(true);
      }
    }
    this.paginatedEvidences = this.evidences.slice(this.pageIndex * this.pageSize, (this.pageIndex  + 1) * this.pageSize);

    if (this.searchResultsContainer) {
      this.searchResultsContainer.nativeElement.scrollTop = 0;
    }
  }

  updateServerFetchRequestParams() {
    const limitKey = 'limit';
    const offsetKey = 'offset';
    const currentLengthOfEvidences = this.evidences.length;
    this.fetchRequestParams[limitKey] = this.pageSize * 5;
    this.fetchRequestParams[offsetKey] = currentLengthOfEvidences;
  }

  resetFilters() {
    this.evidenceFilterForm.patchValue({
      country: '',
      date: '',
      type: '',
      value: '',
      restriction: '',
    });
    this.getEvidences();
  }

  updateAffectedEvidence(passedObject) {
    if (passedObject?.type === 'discardEvent') {
      const evidenceIdKey = 'evid_id';
      const deletedKey = 'deleted';
      const updatedEvidences = this.evidences.map(evidence => {
        if (evidence[evidenceIdKey] === passedObject?.properties?.evid_id) {
          evidence[deletedKey] = passedObject?.properties?.deleted;
        }
        return evidence;
      });
      this.evidences = updatedEvidences;
    } else if (passedObject?.type === 'updateEvent') {
      const evidenceEventIdKey = 'even_id';
      const evidenceIdKey = 'evid_id';
      const updatedEvidences = this.evidences.map(evidence => {
        if (evidence[evidenceEventIdKey] === passedObject?.properties?.previousEventId &&
          evidence[evidenceIdKey] === passedObject?.properties?.evidenceId) {
          evidence[evidenceEventIdKey] = passedObject?.properties?.newEventId;
        }
        return evidence;
      });
      this.evidences = updatedEvidences;
      this.determineEvidenceSiblings();
    }
    this.paginatedEvidences = this.evidences.slice(this.pageIndex * this.pageSize, (this.pageIndex  + 1) * this.pageSize);
  }

}
