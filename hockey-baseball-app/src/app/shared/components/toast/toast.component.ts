import {
  Component,
  input,
  computed,
  signal,
  effect,
  OnDestroy,
  output,
  inject,
} from '@angular/core';
import { ToastType } from '../../../services/toast.service';
import { ButtonComponent } from '../buttons/button/button.component';
import { ThemeService } from '../../../services/theme.service';

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
  theme = inject(ThemeService);
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
    const currentTheme = this.theme.getCurrent();
    const red = currentTheme.colors.find((x) => x.key === 'primary');
    const green = currentTheme.colors.find((x) => x.key === 'green');
    const orange = currentTheme.colors.find((x) => x.key === 'orange');
    const blue = currentTheme.colors.find((x) => x.key === 'blue');

    switch (this.toast().type) {
      case 'success':
        return green?.value;
      case 'error':
        return red?.value;
      case 'warning':
        return orange?.value;
      case 'info':
        return blue?.value;
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
