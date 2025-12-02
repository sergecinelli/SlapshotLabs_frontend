import { Directive, ElementRef, HostListener, Input, Renderer2, inject } from '@angular/core';

@Directive({
  selector: '[appDisableToggle]',
  standalone: true,
})
export class ComponentDisableToggleDirective {
  @Input() disableOpacity = 0.55;
  @Input() animateDisable = true;

  private isDisabled = false;
  private elementRef = inject(ElementRef);
  private renderer = inject(Renderer2);

  @Input() set appDisableToggle(value: boolean) {
    this.isDisabled = value;

    if (this.animateDisable) {
      this.renderer.setStyle(this.elementRef.nativeElement, 'transition', 'opacity 0.3s ease');
    } else {
      this.renderer.removeStyle(this.elementRef.nativeElement, 'transition');
    }

    if (this.isDisabled) {
      this.renderer.setStyle(this.elementRef.nativeElement, 'opacity', String(this.disableOpacity));
      this.renderer.setStyle(this.elementRef.nativeElement, 'user-select', 'none');
      this.renderer.setStyle(this.elementRef.nativeElement, 'pointer-events', 'none');
    } else {
      this.renderer.setStyle(this.elementRef.nativeElement, 'opacity', null);
      this.renderer.setStyle(this.elementRef.nativeElement, 'user-select', null);
      this.renderer.setStyle(this.elementRef.nativeElement, 'pointer-events', null);
    }
  }

  @HostListener('keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (this.isDisabled) {
      event.preventDefault();
      event.stopPropagation();
    }
  }
}

