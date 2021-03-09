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

import {Injectable} from '@angular/core';
import {HttpClient, HttpErrorResponse} from '@angular/common/http';
import {BehaviorSubject} from 'rxjs/internal/BehaviorSubject';
import {Observable} from 'rxjs';
import {environment} from '../environments/environment';
import moment from 'moment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  constructor(
    private http: HttpClient
  ) {
  }

  private dataUrl = environment.dataUrl;
  private sessionKey;
  private eventSubject: Map<string, BehaviorSubject<Array<string>>> = new Map<string, BehaviorSubject<Array<string>>>(null);

  createSessionKey(): void {
    // create a random number and store it in localStorage - this is how we identify the user when calling APIs
    this.sessionKey = localStorage.getItem('sessionKey');
    if (!this.sessionKey) {
      this.sessionKey = Math.random().toString(36).substring(2);
      localStorage.setItem('sessionKey', this.sessionKey);
    }
  }

  // get a list of CandidateEvidence that hasn't yet been associated with an Event. Limit to 20
  getUncategorizedEvidence(): Promise<any> {
    return this.http.get(this.dataUrl + 'candidateEvidence?sessionKey=' + this.sessionKey + '&limit=20&unassociated=true')
      .toPromise()
      .then((evidenceAndDocumentText: Array<object>) => {
        console.log('in api.service evidenceAndDocumentText', evidenceAndDocumentText);
        return evidenceAndDocumentText;
      })
      .catch((error: Error) => {
        return Promise.reject(this.makeErrorMessage(error, 'apiService(getUncategorizedEvidence)'));
      });
  }


  // get a list of CandidateEvidence that hasn't yet been associated with an Event. Limit to 20
  getSoftmatchEvidence(geo): Promise<any> {
    return this.http.get(this.dataUrl + 'candidateEvidence?softmatch=true&geo=' + geo)
      .toPromise()
      .then((evidenceAndDocumentText: Array<object>) => {
        console.log('in api.service evidenceAndDocumentText', evidenceAndDocumentText);
        return evidenceAndDocumentText;
      })
      .catch((error: Error) => {
        return Promise.reject(this.makeErrorMessage(error, 'apiService(getSoftmatchEvidence)'));
      });
  }

  discardCandidateEvidence(formData, evId: string, discard = 'true'): Promise<any> {
    formData.sessionKey = this.sessionKey;
    formData.evid_id = evId;
    formData.discard = discard;
    if (discard === 'false') {
      formData.restore = 'true';
    }
    const httpOptions = {
      params: {
        sessionKey: this.sessionKey,
        evid_id: evId,
        discard: formData.discard,
        restore: formData.restore
      }
    };

    return this.http
      .post(this.dataUrl + 'candidateEvidence', formData, httpOptions)
      //      .post(this.dataUrl + 'candidateEvidence?discard=true&sessionKey='+ this.sessionKey +'&evid_id='+ evId,formData, httpOptions)
      .toPromise()
      .then((response: any) => {
        return response;
      })
      .catch((error: Error) => {
        return Promise.reject(this.makeErrorMessage(error, 'apiService(deleteCandidateEvidence)'));
      });
  }

  // deletes existing evidence from the database
  deleteEvidence(formData, id: string, deleted = 'True'): Promise<any> {
    formData.sessionKey = this.sessionKey;
    formData.id = id;
    formData.delete = deleted;
    const httpOptions = {
      params: {
        sessionKey: formData.sessionKey,
        id: formData.id,
        delete: formData.delete,
      }
    };

    return this.http
      .post(this.dataUrl + 'evidence', formData, httpOptions)
      //      .post(this.dataUrl + 'candidateEvidence?discard=true&sessionKey='+ this.sessionKey +'&evid_id='+ evId,formData, httpOptions)
      .toPromise()
      .then((response: any) => {
        return response;
      })
      .catch((error: Error) => {
        return Promise.reject(this.makeErrorMessage(error, 'apiService(deleteEvidence)'));
      });
  }


  // calling this will either associate an evidence to an existing event or promote it as a new event
  updateCandidateEvidence(formData, evId: string, sentId: string): Promise<any> {
    formData.sessionKey = this.sessionKey;
    formData.evid_id = evId;
    formData.sent_id = sentId;
    const httpOptions = {
      params: {
        sessionKey: this.sessionKey,
        evid_id: evId,
        country: formData.country,
        date: formData.date,
        restriction: formData.restriction,
        type: formData.type,
        value: formData.value,
        other_value: formData.other_value,
        citation_url: formData.citation_url,
        fine_grained_location: formData.fine_grained_location,
        anno_provided_url: formData.anno_provided_url,
        approx_date_bool: formData.approx_date_bool,
        isNewType: formData.newType,
        isNewValue: formData.newValue,
        valueHasTags: formData.valueHasTags
      }
    };
    console.log('candidateEvidence Options');
    console.log(httpOptions);
    return this.http
      .post(this.dataUrl + 'candidateEvidence', formData, httpOptions)
      // .post(this.dataUrl + 'candidateEvidence', {}, httpOptions)
      .toPromise()
      .then((response: any) => {
        return response;
      })
      .catch((error: Error) => {
        return Promise.reject(this.makeErrorMessage(error, 'apiService(saveCandidateEvidence)'));
      });
  }

  updateEvidence(formData, Id: string): Promise<any> {
    formData.sessionKey = this.sessionKey;
    const httpOptions = {
      params: {
        id: Id,
        sessionKey: this.sessionKey,
        country: formData.country,
        approx_date_bool: formData.approx_date_bool,
        date: formData.date,
        restriction: formData.restriction,
        type: formData.type,
        value: formData.value,
        other_value: formData.other_value,
        citation_url: formData.citation_url,
        anno_provided_url: formData.anno_provided_url,
        fine_grained_location: formData.fine_grained_location
      }
    };
    console.log('Evidence Options');
    console.log(httpOptions);
    return this.http
      .post(this.dataUrl + 'evidence',
        {},
        httpOptions)
      .toPromise()
      .then((response: any) => {
        return response;
      })
      .catch((error: Error) => {
        return Promise.reject(this.makeErrorMessage(error, 'apiService(updateEvidence)'));
      });
  }

  promoteToEvent(formData, evId: string): Promise<any> {
    const httpOptions = {
      params: {
        sessionKey: this.sessionKey,
        evid_id: evId,
        promote: 'true',
        type: formData.type,
        other_value: formData.other_value,
        // isNewType: formData.newType,
        // isNewValue: formData.newValue, removed because CE update handles this
      }
    };
    console.log('promoteToEventOptions');
    console.log(httpOptions);
    return this.http
      .post(this.dataUrl + 'event' + '?evid_id=' + evId + '&promote=true', null, httpOptions)
      .toPromise()
      .then((response: any) => {
        console.log(response);
        return response;
      })
      .catch((error: Error) => {
        return Promise.reject(this.makeErrorMessage(error, 'apiService(promoteToEvent)'));
      });


  }


  // check to see if candidate evidence can be associated to an existing event automatically
  checkAssociation(formData, evId: string, sentId: string): Promise<any> {
    formData.sessionKey = this.sessionKey;
    formData.evid_id = evId;
    formData.sent_id = sentId;
    return this.http
      .get(this.dataUrl + 'checkAssociation' + '?evid_id=' + evId)
      .toPromise()
      .then((response: any) => {
        console.log(response);
        return response;
      })
      .catch((error: Error) => {
        return Promise.reject(this.makeErrorMessage(error, 'apiService(checkAssociation)'));
      });
  }

  // Find matching events to candidate event ID
  getEvent(formData, eventID: string, sentId: string): Promise<any> {
    formData.sessionKey = this.sessionKey;
    formData.evid_id = eventID;
    formData.sent_id = sentId;
    return this.http
      .get(this.dataUrl + 'event' + '?id=' + eventID)
      .toPromise()
      .then((response: any) => {
        console.log(response);
        return response;
      })
      .catch((error: Error) => {
        return Promise.reject(this.makeErrorMessage(error, 'apiService(getEvent)'));
      });
  }

  // get a list of CountryCodes to use in autocompletes
  getCountryCodes(value: string, fullValues = false): Promise<any> {
    return this.http.get(this.dataUrl + 'geo?q=' + value)
      .toPromise()
      .then((countries: Array<object>) => {
        return this.mapCountryCodes(countries, fullValues);
      })
      .catch((error: Error) => {
        return Promise.reject(this.makeErrorMessage(error, 'apiService(getCountryCodes)'));
      });
  }


  // map into format that we need for dropdowns
  mapCountryCodes(countryCodes: Array<any>, fullValues): Array<string> {
    const mappedCountries = countryCodes.map((country) => {
      if (fullValues) {
        return country;
      } else {
        return country.code;
      }
      // if (country.State === "") {
      //   return `${country.country}`;
      // } else {
      //   return `${country.code}`;
      // }
    });
    return mappedCountries;
  }

  // get a list of Event types along with the value type for the form
  getEventTypes(forceUpdate = false): Observable<any> {
    const name = 'eventType';
    if (this.eventSubject.has(name) && !forceUpdate) {
      // console.log('Using cached HTTP results for events')
      return this.eventSubject.get(name);
    } else {
      this.eventSubject.set(name, new BehaviorSubject<Array<any>>(null));
      // console.log('Making HTTP call for events')
      this.getEventSubjects(name);
      return this.eventSubject.get(name);
    }
  }

  // map into format that we need for autocomplete
  mapEventTypes(types: Array<any>): Array<any> {
    const mappedTypes = types.map((entry) => {
      // return {type: entry['type'], data_type: entry['data_type'], official_type: entry['official_type']}
      return entry.type;
    });
    return [...new Set(mappedTypes)];
  }

  private getEventSubjects(name: string): void {
    this.makeEventHTTPCall(name).then((items: any) => {
      this.eventSubject.get(name).next(items);
    })
      .catch((error: Error) => {
        this.eventSubject.get(name).error(this.makeErrorMessage(error, 'apiService(getEventSubjects)'));
      });
  }

  private makeEventHTTPCall(name: string): Promise<any> {
    return this.http.get(this.dataUrl + name)
      .toPromise()
      .then((events: any) => {
        return Promise.resolve(events);
      })
      .catch((error: Error) => {
        return Promise.reject(this.makeErrorMessage(error, 'apiService(makeEventHTTPCall)'));
      });
  }

  private makeErrorMessage(reason: Error | HttpErrorResponse, className: string): Error {
    let str = null;

    if (reason instanceof Error) {
      str = className + ' encountered an error: ' + reason.message;
    } else if (reason instanceof HttpErrorResponse) {
      if (reason.error instanceof Error) {
        str = className + ' encountered an error: ' + reason.error.message;
      } else {
        str = className + ' encountered an abnormal HTTP status: (' + reason.status + ') ' + reason.statusText;
      }
    } else {
      str = className + ' encountered an unknown error';
    }

    return new Error(str);
  }

  getEvidence(fetchRequestParams, filters?: any): Promise<any> {

    const limit = fetchRequestParams.limit;
    const offset = fetchRequestParams.offset;
    let path = this.dataUrl + 'evidence?sessionKey=' + this.sessionKey + '&limit=' + limit + '&offset=' + offset + '&';
    // let path = this.dataUrl + 'evidence?sessionKey=' + this.sessionKey + '&limit=50&';
    for (const filter in filters) {
      if (!((filters[filter] === null) || (filters[filter] === '') || (filters[filter] === '-'))) {

        if (filter === 'date') {
          filters[filter] = this.fixDate(filters[filter]);
        }
        console.log(filter, filters[filter]);
        path += filter + '=' + filters[filter] + '&';
      }
    }

    return this.http.get(path)
      .toPromise()
      .then((evidences: Array<object>) => {
        // console.log('in api.service getEvidence', evidences);
        return evidences;
      })
      .catch((error: Error) => {
        return Promise.reject(this.makeErrorMessage(error, 'apiService(getEvidence)'));
      });

  }

  fixDate(date) {
    if (moment(date).isValid()) {
      date = moment(date).format('YYYY-MM-DD');
    }
    return date;
  }

  insertEvidence(formData): Promise<any> {
    formData.sessionKey = this.sessionKey;
    const httpOptions = {
      params: {
        sessionKey: this.sessionKey,
        country: formData.country,
        approx_date_bool: formData.approx_date_bool,
        date: formData.date,
        restriction: formData.restriction,
        type: formData.type,
        value: formData.value,
        other_value: formData.other_value,
        citation_url: formData.citation_url,
        anno_provided_url: formData.anno_provided_url,
        fine_grained_location: formData.fine_grained_location,
        text: formData.text
      }
    };
    console.log('Evidence Options');
    console.log(httpOptions);
    return this.http
      .post(this.dataUrl + 'insertEvidence',
        {},
        httpOptions)
      .toPromise()
      .then((response: any) => {
        return response;
      })
      .catch((error: Error) => {
        return Promise.reject(this.makeErrorMessage(error, 'apiService(insertEvidence)'));
      });
  }
}
