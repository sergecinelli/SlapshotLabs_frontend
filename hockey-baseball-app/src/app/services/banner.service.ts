import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class BannerService {
  private refreshBannerSubject = new Subject<void>();

  // Observable that components can subscribe to
  refreshBanner$ = this.refreshBannerSubject.asObservable();

  // Method to trigger banner refresh
  triggerRefresh(): void {
    this.refreshBannerSubject.next();
  }
}
