import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { ToastService } from '../../../services/toast.service';
import { ToastComponent, ToastData } from './toast.component';

@Component({
  selector: 'app-toast-container',
  imports: [ToastComponent],
  templateUrl: './toast-container.component.html',
  styleUrl: './toast-container.component.scss',
})
export class ToastContainerComponent implements OnInit, OnDestroy {
  private toastService = inject(ToastService);

  protected toasts = signal<ToastData[]>([]);

  private subscription: Subscription | null = null;

  ngOnInit(): void {
    this.subscription = this.toastService.showToast$.subscribe((data) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      this.toasts.update((current) => [...current, { ...data, id }]);
    });
  }

  removeToast(id: string): void {
    this.toasts.update((current) => current.filter((t) => t.id !== id));
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
