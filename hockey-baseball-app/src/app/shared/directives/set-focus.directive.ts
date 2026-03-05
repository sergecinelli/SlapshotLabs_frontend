import { Directive, ElementRef, Renderer2, OnInit, inject } from '@angular/core';

@Directive({
  selector: '[appSetFocus]',
})
export class SetFocusDirective implements OnInit {
  private renderer = inject(Renderer2);
  private el = inject(ElementRef);

  ngOnInit(): void {
    setTimeout(() => {
      this.renderer.setAttribute(this.el.nativeElement, 'tabindex', '1');
      this.el.nativeElement.focus();
    }, 1);
  }
}
