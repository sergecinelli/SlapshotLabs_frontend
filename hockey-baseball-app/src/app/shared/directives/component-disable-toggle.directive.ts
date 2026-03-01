import { Directive, ElementRef, Renderer2, inject, input, effect } from '@angular/core';

@Directive({
  selector: '[appDisableToggle]',
  host: { '(keydown)': 'handleKeyboardEvent($event)' },
})
export class ComponentDisableToggleDirective {
  disableOpacity = input(0.55);
  animateDisable = input(true);
  appDisableToggle = input(false);

  private isDisabled = false;
  private elementRef = inject(ElementRef);
  private renderer = inject(Renderer2);

  private disableEffect = effect(() => {
    const value = this.appDisableToggle();
    this.isDisabled = value;

    if (this.animateDisable()) {
      this.renderer.setStyle(this.elementRef.nativeElement, 'transition', 'opacity 0.3s ease');
    } else {
      this.renderer.removeStyle(this.elementRef.nativeElement, 'transition');
    }

    if (this.isDisabled) {
      this.renderer.setStyle(this.elementRef.nativeElement, 'opacity', String(this.disableOpacity()));
      this.renderer.setStyle(this.elementRef.nativeElement, 'user-select', 'none');
      this.renderer.setStyle(this.elementRef.nativeElement, 'pointer-events', 'none');
      this.renderer.setStyle(this.elementRef.nativeElement, 'cursor', 'not-allowed');
    } else {
      this.renderer.setStyle(this.elementRef.nativeElement, 'opacity', null);
      this.renderer.setStyle(this.elementRef.nativeElement, 'user-select', null);
      this.renderer.setStyle(this.elementRef.nativeElement, 'pointer-events', null);
      this.renderer.setStyle(this.elementRef.nativeElement, 'cursor', 'pointer');
    }
  });

  handleKeyboardEvent(event: KeyboardEvent) {
    if (this.isDisabled) {
      event.preventDefault();
      event.stopPropagation();
    }
  }
}
