// my-feature.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core'
import { CommonModule } from '@angular/common'

@Component({
  selector: 'ocx-shell-my-feature',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toolbar">
      <button>Testing</button>
    </div>
  `,
  styles: [`
    button {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
    }
  `]
})
export class MyFeatureComponent implements OnInit, OnDestroy {

  ngOnInit() {
    console.log('MyFeatureComponent initialized')
  }

  ngOnDestroy() {
    console.log('MyFeatureComponent destroyed')
  }
}