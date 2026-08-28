import { CommonModule } from '@angular/common'
import { ChangeDetectorRef, Component, inject, Input, NgZone, OnInit, viewChild } from '@angular/core'
import { UntilDestroy } from '@ngneat/until-destroy'
import { ReplaySubject } from 'rxjs'

import { AngularAcceleratorModule } from '@onecx/angular-accelerator'
import { Message, PortalMessageService } from '@onecx/angular-integration-interface'
import {
  AngularRemoteComponentsModule,
  ocxRemoteComponent,
  ocxRemoteWebcomponent
} from '@onecx/angular-remote-components'
import { REMOTE_COMPONENT_CONFIG, RemoteComponentConfig } from '@onecx/angular-utils'
import { MessageService } from 'primeng/api'
import { PrimeNG } from 'primeng/config'
import { ToastModule } from 'primeng/toast'

// Should be moved out of shell to another repo later, so that primeNG dependency can be started to be removed from shell
@Component({
  selector: 'ocx-shell-toast',
  templateUrl: './shell-toast.component.html',
  standalone: true,
  imports: [AngularRemoteComponentsModule, CommonModule, AngularAcceleratorModule, ToastModule],
  providers: [{ provide: REMOTE_COMPONENT_CONFIG, useValue: new ReplaySubject<string>(1) }, MessageService]
})
@UntilDestroy()
export class OneCXShellToastComponent implements ocxRemoteComponent, ocxRemoteWebcomponent, OnInit {
  private readonly rcConfig = inject<ReplaySubject<RemoteComponentConfig>>(REMOTE_COMPONENT_CONFIG)
  private readonly primengConfig: PrimeNG = inject(PrimeNG)
  private readonly messageService = inject(MessageService)
  private readonly portalMessageService = inject(PortalMessageService)
  private readonly ngZone = inject(NgZone)
  private readonly cdr = inject(ChangeDetectorRef)
  private readonly toastRef = viewChild('toast', { read: ChangeDetectorRef })

  @Input() set ocxRemoteComponentConfig(rcConfig: RemoteComponentConfig) {
    this.ocxInitRemoteComponent(rcConfig)
  }

  constructor() {
    const solution = Number(localStorage.getItem('solution') ?? '0')
    if (solution === 0) {
      this.solutionDefault()
    } else if (solution === 1) {
      this.solutionOne()
    } else if (solution === 2) {
      this.solutionTwo()
    } else if (solution === 3) {
      this.solutionThree()
    } else if (solution === 4) {
      this.solutionFour()
    } else {
      localStorage.setItem('solution', '0')
      console.warn('Unknown solution number, defaulting to solutionDefault()')
      this.solutionDefault()
    }
  }

  solutionDefault() {
    this.portalMessageService.message$.subscribe((message: Message) => {
      console.log('[Testing Toast] BUG inside Angular zone: Bug: ', NgZone.isInAngularZone(), '| message:', message)
      this.messageService.add(message)
    })
  }

  solutionOne() {
    this.portalMessageService.message$.subscribe((message: Message) => {
      console.log('[Testing Toast] SOL1 inside Angular zone: Bug: ', NgZone.isInAngularZone(), '| message:', message)
      this.ngZone.run(() => this.messageService.add(message))
    })
  }

  solutionTwo() {
    this.portalMessageService.message$.subscribe((message: Message) => {
      console.log('[Testing Toast] SO2 inside Angular zone: Bug: ', NgZone.isInAngularZone(), '| message:', message)
      setTimeout(() => this.messageService.add(message))
    })
  }

  solutionThree() {
    this.portalMessageService.message$.subscribe((message: Message) => {
      console.log('[Testing Toast] SO3 inside Angular zone: Bug: ', NgZone.isInAngularZone(), '| message:', message)
      this.messageService.add(message)
      setTimeout(() => this.toastRef()?.detectChanges())
    })
  }

  solutionFour() {
    this.portalMessageService.message$.subscribe((message: Message) => {
      console.log('[Testing Toast] SO4 inside Angular zone: Bug: ', NgZone.isInAngularZone(), '| message:', message)
      this.messageService.add(message)
      setTimeout(() => this.cdr.detectChanges())
    })
  }

  ngOnInit() {
    this.primengConfig.ripple.set(true)
  }

  public ocxInitRemoteComponent(rcConfig: RemoteComponentConfig) {
    this.rcConfig.next(rcConfig)
  }
}
