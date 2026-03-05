import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private _showToast = new Subject<{
    content: string;
    type: ToastType;
    showSeconds: number;
  }>();
  showToast$ = this._showToast.asObservable();

  show(content: string, type: ToastType = 'info', showSeconds = 5): void {
    this._showToast.next({ content, type, showSeconds: showSeconds * 1000 });
  }
}
