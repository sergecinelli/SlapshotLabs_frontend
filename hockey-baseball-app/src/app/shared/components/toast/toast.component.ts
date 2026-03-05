import { Component, input, computed, signal, effect, OnDestroy, output } from '@angular/core';
import { ToastType } from '../../../services/toast.service';
import { ButtonComponent } from '../buttons/button/button.component';

export interface ToastData {
  id: string;
  content: string;
  type: ToastType;
  showSeconds: number;
}

@Component({
  selector: 'app-toast',
  imports: [ButtonComponent],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.scss',
})
export class ToastComponent implements OnDestroy {
  toast = input.required<ToastData>();
  closed = output<string>();

  protected isVisible = signal(false);
  protected isRemoving = signal(false);
  private hideTimeout: ReturnType<typeof setTimeout> | null = null;

  protected icon = computed(() => {
    switch (this.toast().type) {
      case 'success':
        return 'check_circle';
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
    }
  });

  protected toastClass = computed(() => `toast toast-${this.toast().type}`);

  protected borderColor = computed(() => {
    switch (this.toast().type) {
      case 'success':
        return '#4caf50';
      case 'error':
        return '#f44336';
      case 'warning':
        return '#ff9800';
      case 'info':
        return '#2196f3';
    }
  });

  constructor() {
    effect(() => {
      if (this.toast()) {
        requestAnimationFrame(() => {
          this.isVisible.set(true);
          const showSeconds = this.toast().showSeconds;
          if (showSeconds > 0) {
            this.hideTimeout = setTimeout(() => this.close(), showSeconds);
          }
        });
      }
    });
  }

  close(): void {
    if (this.isRemoving()) return;
    if (this.hideTimeout) clearTimeout(this.hideTimeout);

    this.isRemoving.set(true);

    setTimeout(() => {
      this.closed.emit(this.toast().id);
    }, 800);
  }

  ngOnDestroy(): void {
    if (this.hideTimeout) clearTimeout(this.hideTimeout);
  }
}
