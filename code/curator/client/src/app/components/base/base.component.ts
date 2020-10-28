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

@Component({
  selector: 'app-root',
  templateUrl: './base.component.html',
  styleUrls: ['./base.component.scss']
})
export class BaseComponent implements OnInit {

  uncategorized: Array<object> = [];
  documentText: Array<object> = [];

  // loading vars
  loading = false;
  failedToLoad = false;
  uncategorizedFailed = false;
  saving = false;
  viewerMode: boolean;

  constructor(
    private apiService: ApiService,
  ) {}

  ngOnInit() {
    this.apiService.createSessionKey();
    this.apiService.getEventTypes().subscribe((types: any) => {}), ((error: Error) => {
    });

    this.getUncategorizedEvidence(); // get the initial evidence
  }

  onRemove(index: number) {
    this.uncategorized.splice(index, 1);
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

  getUncategorizedEvidence(): void {
    this.loading = true;

    const params = this.getParams(window.location.href);

    if(params['geo'] && params['geo']!='' && params['softmatch'] && params['softmatch']==='true'){
      var apiService = this.apiService.getSoftmatchEvidence(params['geo'])
      this.viewerMode = true;

    } else {
      var apiService = this.apiService.getUncategorizedEvidence()
      this.viewerMode = false;
    }

    apiService.then((evidenceAndDocumentText: any) => {
      this.uncategorized.push(...evidenceAndDocumentText['candidateEvidence']);
      this.documentText.push(...evidenceAndDocumentText['document_text']);
      this.loading = false;
    }).catch((error: Error) => {
      this.loading = false;
      this.uncategorizedFailed = true;
    });
  }

  reloadPage(): void {
    window.location.reload();
  }

  openValidationGuidelines(): void {
    const URL = 'https://ibm.ent.box.com/folder/112408291682';
    window.open(URL, '_blank');
  }

}
