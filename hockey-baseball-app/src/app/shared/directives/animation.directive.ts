import {
  Directive,
  ElementRef,
  Renderer2,
  OnDestroy,
  inject,
  input,
  effect,
  signal,
} from '@angular/core';

@Directive({
  selector: '[appAnimate]',
})
export class AnimationDirective implements OnDestroy {
  private elementRef = inject(ElementRef);
  private renderer = inject(Renderer2);

  private loadingTimeout!: ReturnType<typeof setTimeout>;
  private delayTimeout!: ReturnType<typeof setTimeout>;

  private isLoading = signal(false);
  private showAnimation = signal(false);
  private hideAnimation = signal(false);

  animateInit = input<boolean>(true);
  delayShowAnimation = input<number>(0);
  delayHideAnimation = input<number>(0);
  animationShowTransitionMS = input<number>(500);
  animationHideTransitionMS = input<number>(500);
  animateToggle = input<boolean | null>(null);

  private _animateToggleValue = signal<boolean | null>(null);
  private _isFirstChange = true;

  constructor() {
    effect(() => {
      const value = this.animateToggle();
      if (value === null || value === this._animateToggleValue()) return;
      this._animateToggleValue.set(value);

      const isFirstChange = this._isFirstChange;
      this._isFirstChange = false;

      if (this.skipInitAnimationIfRequire(value, isFirstChange)) return;

      clearTimeout(this.delayTimeout);

      const delay = value ? this.delayShowAnimation() : this.delayHideAnimation();

      this.delayTimeout = setTimeout(() => {
        if (value) {
          this.startAnimation();
          this.loadingTimeout = setTimeout(() => this.start(), this.animationShowTransitionMS());
        } else {
          clearTimeout(this.loadingTimeout);
          if (!this.isLoading() && !this.showAnimation()) return;
          this.endAnimation();
          setTimeout(() => this.end(), this.animationHideTransitionMS());
        }
      }, delay);
    });
  }

  private start(): void {
    this.showAnimation.set(false);
    this.hideAnimation.set(false);
    this.isLoading.set(true);

    this.renderer.addClass(this.elementRef.nativeElement, 'show');
    this.renderer.removeClass(this.elementRef.nativeElement, 'showAnimation');
    this.renderer.removeClass(this.elementRef.nativeElement, 'hide');
    this.renderer.removeClass(this.elementRef.nativeElement, 'hideAnimation');
  }

  private startAnimation(): void {
    this.showAnimation.set(true);
    this.hideAnimation.set(false);
    this.isLoading.set(false);

    this.renderer.removeClass(this.elementRef.nativeElement, 'show');
    this.renderer.addClass(this.elementRef.nativeElement, 'showAnimation');
    this.renderer.removeClass(this.elementRef.nativeElement, 'hide');
    this.renderer.removeClass(this.elementRef.nativeElement, 'hideAnimation');
  }

  private end(): void {
    this.showAnimation.set(false);
    this.hideAnimation.set(false);
    this.isLoading.set(false);

    this.renderer.removeClass(this.elementRef.nativeElement, 'show');
    this.renderer.removeClass(this.elementRef.nativeElement, 'showAnimation');
    this.renderer.addClass(this.elementRef.nativeElement, 'hide');
    this.renderer.removeClass(this.elementRef.nativeElement, 'hideAnimation');
  }

  private endAnimation(): void {
    this.showAnimation.set(false);
    this.hideAnimation.set(true);
    this.isLoading.set(true);

    this.renderer.removeClass(this.elementRef.nativeElement, 'show');
    this.renderer.removeClass(this.elementRef.nativeElement, 'showAnimation');
    this.renderer.removeClass(this.elementRef.nativeElement, 'hide');
    this.renderer.addClass(this.elementRef.nativeElement, 'hideAnimation');
  }

  private skipInitAnimationIfRequire(value: boolean | null, isFirstChange: boolean): boolean {
    const animateInitValue = this.animateInit();
    const isSkip = !animateInitValue && value && isFirstChange;
    if (isSkip) {
      this.start();
    }
    return !!isSkip;
  }

  ngOnDestroy(): void {
    clearTimeout(this.delayTimeout);
    clearTimeout(this.loadingTimeout);
  }
}
