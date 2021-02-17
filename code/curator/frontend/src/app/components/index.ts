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

import { BaseComponent } from './base/base.component';
import { UncategorizedEvidenceComponent } from './uncategorized-evidence/uncategorized-evidence.component';
import { LoadingComponent } from './loading/loading.component';
import { EvidenceReviewComponent } from './evidence-review/evidence-review.component';
import {GenericEvidenceComponent} from './generic-evidence/generic-evidence.component';


export {
  BaseComponent,
  UncategorizedEvidenceComponent,
  LoadingComponent,
  EvidenceReviewComponent,
  GenericEvidenceComponent
};

export const ALL_COMPONENTS = [
  BaseComponent,
  UncategorizedEvidenceComponent,
  LoadingComponent,
  EvidenceReviewComponent,
  GenericEvidenceComponent
];
