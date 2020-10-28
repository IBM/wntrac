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


import { Component, DebugElement } from '@angular/core';
import { async, ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { LoadingComponent } from './loading.component';

@Component({
  selector: `gt-loading-wrapper`,
  template:
  `<gt-loading
    [active]='active'></gt-loading>`
})
class LoadingWrapperComponent {
  active = true;
}

describe('LoadingComponent', () => {

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ LoadingComponent, LoadingWrapperComponent ]
    })
    .compileComponents();
  }));

  describe('normal size', () => {
    let component: LoadingWrapperComponent;
    let fixture: ComponentFixture<LoadingWrapperComponent>;

    beforeEach(() => {
      fixture = TestBed.createComponent(LoadingWrapperComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should be created', () => {
      const loadingEl: DebugElement = fixture.debugElement.query(By.css('.bx--loading'));
      expect(loadingEl.componentInstance).toBeTruthy();
      expect(loadingEl.nativeElement.classList).not.toContain('bx--loading--stop');
      expect(loadingEl.nativeElement.classList).not.toContain('bx--loading--small');
    });

    it('should add a stop class when active is false', fakeAsync(() => {
      component.active = false;
      fixture.detectChanges();
      tick();
      const loadingEl: DebugElement = fixture.debugElement.query(By.css('.bx--loading'));
      expect(loadingEl.nativeElement.classList).toContain('bx--loading--stop');
    }));

  });

});
