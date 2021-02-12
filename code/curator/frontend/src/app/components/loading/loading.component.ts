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

import { Component, HostBinding, Input, OnInit, ElementRef } from '@angular/core';

/**
 * Carbon "Loading" component, implemented as an Angular component
 * http://carbondesignsystem.com/components/loading/code
 *
 * Usage:
 * for the normal size:
 *   <wh-loading></wh-loading>
 *
 * There's a "done loading" animation (implemented by adding a "stop" class)
 * that can be triggred by binding to the "active" property and setting it to false.
 *   <wh-loading [active]="myActiveVar"></wh-loading>
 * and then in your component code
 *   myActiveVar = false;
 *
 * For the small version of the loader:
 *   <wh-loading small="true"></wh-loading>
 * The "small" attribute is read once on init, so it avoids the binding overhead.
 */

@Component({
  selector: 'gt-loading',
  templateUrl: './loading.component.html'
})
export class LoadingComponent implements OnInit {

  @Input() active = true;

  @HostBinding('class.bx--loading')
  loadingClass = true;

  @HostBinding('class.bx--loading--stop')
  get stopped() { return !this.active; }

  @HostBinding('class.bx--loading--small')
  isSmall: boolean;

  constructor(private  element: ElementRef) { }

  ngOnInit() {
    // set once attribute, to avoid binding
    this.isSmall = ('true' === this.element.nativeElement.getAttribute('small'));
  }

}
