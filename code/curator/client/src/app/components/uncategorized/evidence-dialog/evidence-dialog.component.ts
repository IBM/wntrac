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

import {Component, EventEmitter, Inject, Input} from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { UncategorizedComponent } from '../uncategorized.component';

@Component({
  selector: 'evidence-dialog',
  templateUrl: './evidence-dialog.component.html',
  styleUrls: ['./evidence-dialog.component.scss'],
})
export class EvidenceDialogComponent {

  form: any;
  description: string;
  data: any =
    {
        country: 'Error',
        date: 'Error',
        even_id: 'Error',
        restriction: 'Error',
        type: 'Error',
        value: 'Error'
    };
    sel = 0;
  deletingEvidence = new EventEmitter();

  constructor(
    private dialogRef: MatDialogRef<EvidenceDialogComponent>,
    @Inject(MAT_DIALOG_DATA) data) {}

      save(type: string) {
          this.dialogRef.close(type);
      }

      select(evidence: number): void {
        this.sel = evidence;
      }

      delete(evidenceID: string, selectedEvidence: number): void {
        // call to /evidence?ev_id=<evidence id>&delete=true

        console.log(`deleting evidence ${evidenceID}`);
        try {
          this.deletingEvidence.emit(evidenceID);
          this.data.evidences[selectedEvidence].deleted = 'True';
        } catch {
          console.error(`error deleting evidence ${evidenceID}`);
        }



      }
}
