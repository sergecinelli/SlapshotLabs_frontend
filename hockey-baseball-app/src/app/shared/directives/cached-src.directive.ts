import { Directive, ElementRef, OnDestroy, Renderer2, effect, inject, input } from '@angular/core';
import { Subscription } from 'rxjs';
import { ImageCacheService } from '../../services/image-cache.service';

@Directive({
  selector: 'img[appCachedSrc]',
})
export class CachedSrcDirective implements OnDestroy {
  appCachedSrc = input.required<string>();

  private imageCacheService = inject(ImageCacheService);
  private elementRef = inject(ElementRef<HTMLImageElement>);
  private renderer = inject(Renderer2);
  private subscription: Subscription | null = null;

  constructor() {
    effect(() => {
      const url = this.appCachedSrc();
      this.cleanup();

      if (!url) return;

      this.renderer.addClass(this.elementRef.nativeElement, 'cached-img-loading');

      this.subscription = this.imageCacheService.getImage(url).subscribe((blobUrl) => {
        this.renderer.setProperty(this.elementRef.nativeElement, 'src', blobUrl);
        this.renderer.removeClass(this.elementRef.nativeElement, 'cached-img-loading');
      });
    });
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  private cleanup(): void {
    this.subscription?.unsubscribe();
    this.subscription = null;
  }
}
