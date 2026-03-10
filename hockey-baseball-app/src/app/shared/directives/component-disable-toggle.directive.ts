import { Directive, ElementRef, Renderer2, inject, input, effect } from '@angular/core';

@Directive({
  selector: '[appDisableToggle]',
  host: {
    '(keydown)': 'handleKeyboardEvent($event)',
    '(click)': 'handleClickEvent($event)',
  },
})
export class ComponentDisableToggleDirective {
  disableOpacity = input(0.55);
  animateDisable = input(true);
  appDisableToggle = input(false);
  keepPointerEvents = input(false);

  private isDisabled = false;
  private elementRef = inject(ElementRef);
  private renderer = inject(Renderer2);

  private disableEffect = effect(() => {
    const value = this.appDisableToggle();
    const keepPointer = this.keepPointerEvents();
    this.isDisabled = value;

    if (this.animateDisable()) {
      this.renderer.setStyle(this.elementRef.nativeElement, 'transition', 'opacity 0.3s ease');
    } else {
      this.renderer.removeStyle(this.elementRef.nativeElement, 'transition');
    }

    if (this.isDisabled) {
      this.renderer.setStyle(
        this.elementRef.nativeElement,
        'opacity',
        String(this.disableOpacity())
      );
      this.renderer.setStyle(this.elementRef.nativeElement, 'user-select', 'none');
      if (!keepPointer) {
        this.renderer.setStyle(this.elementRef.nativeElement, 'pointer-events', 'none');
      }
      this.renderer.setStyle(this.elementRef.nativeElement, 'cursor', 'default');
    } else {
      this.renderer.setStyle(this.elementRef.nativeElement, 'opacity', null);
      this.renderer.setStyle(this.elementRef.nativeElement, 'user-select', null);
      this.renderer.setStyle(this.elementRef.nativeElement, 'pointer-events', null);
      this.renderer.setStyle(this.elementRef.nativeElement, 'cursor', 'pointer');
    }
  });

  handleClickEvent(event: MouseEvent) {
    if (this.isDisabled) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  handleKeyboardEvent(event: KeyboardEvent) {
    if (this.isDisabled) {
      event.preventDefault();
      event.stopPropagation();
    }
  }
}
