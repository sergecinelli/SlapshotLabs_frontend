import { Component, input } from '@angular/core';

@Component({
  selector: 'app-loading-spinner',
  templateUrl: './loading-spinner.component.html',
  styleUrl: './loading-spinner.component.scss',
  host: {
    '[class]': '"loading-spinner loading-spinner--" + size()',
  },
})
export class LoadingSpinnerComponent {
  message = input<string>();
  size = input<'sm' | 'md' | 'lg'>('md');
}
