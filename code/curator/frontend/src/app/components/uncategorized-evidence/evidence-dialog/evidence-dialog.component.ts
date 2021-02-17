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
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {ApiService} from '../../../api.service';

@Component({
  selector: 'app-evidence-dialog',
  templateUrl: './evidence-dialog.component.html',
  styleUrls: ['./evidence-dialog.component.scss'],
})
export class EvidenceDialogComponent {

  data: any =
    {
      'country': 'Error',
      'date': 'Error',
      'even_id': 'Error',
      'restriction': 'Error',
      'type': 'Error',
      'value': 'Error'
    };
  sel = 0;
  updatingDeleteField = new EventEmitter();
  processingRequest = false;

  constructor(private apiService: ApiService, private dialogRef: MatDialogRef<EvidenceDialogComponent>,
              @Inject(MAT_DIALOG_DATA) data) {
  }

  select(evidence: number): void {
    this.sel = evidence;
  }

  delete(evidenceID: string, selectedEvidence: number): void {
    try {
      this.performUpdateOfDeleteField(evidenceID, selectedEvidence, 'True');
    } catch {
      console.error(`error deleting evidence ${evidenceID}`);
      this.dialogRef.disableClose = false;
    }
  }

  undoDelete(evidenceID: string, selectedEvidence: number): void {
    try {
      this.performUpdateOfDeleteField(evidenceID, selectedEvidence, 'False');
    } catch {
      console.error(`error deleting evidence ${evidenceID}`);
      this.dialogRef.disableClose = false;
    }
  }

  performUpdateOfDeleteField(evidenceID, selectedEvidence, updateValue) {
    this.dialogRef.disableClose = true;
    this.processingRequest = true;
    this.apiService.deleteEvidence({}, evidenceID, updateValue).then((response) => {
      this.processingRequest = false;
      this.data.evidences[selectedEvidence].deleted = updateValue;
      this.updatingDeleteField.emit({
        evid_id: response.evidence.evid_id,
        deleted: updateValue
      });
      this.dialogRef.disableClose = false;
    }).catch((error: Error) => {
      console.group('Evidence Dialog');
      console.log('Error deleting evidence data for ID: ' + evidenceID);
      console.log(error.stack);
      console.groupEnd();
      this.dialogRef.disableClose = false;
    });
  }
}
