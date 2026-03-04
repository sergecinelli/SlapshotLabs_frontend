import { AfterViewInit, Directive, ElementRef, inject, output } from '@angular/core';

@Directive({
  selector: '[appOutsideClick]',
  host: { '(document:click)': 'onClick($event)' },
})
export class OutsideClickDirective implements AfterViewInit {
  private elementRef = inject(ElementRef);
  private isInit = false;

  appOutsideClick = output<void>();

  ngAfterViewInit() {
    setTimeout(() => {
      this.isInit = true;
    }, 1);
  }

  onClick(event: Event): void {
    if (!this.isInit) return;

    const clickedInside = this.elementRef.nativeElement.contains(event.target);
    if (!clickedInside) {
      this.appOutsideClick.emit();
    }
  }
}
