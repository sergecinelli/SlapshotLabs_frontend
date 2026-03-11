import { Component, ViewEncapsulation, inject, input, effect } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AppColor } from '../../constants/colors';
import { ThemeService } from '../../../services/theme.service';
import { AnimationDirective } from '../../directives/animation.directive';

@Component({
  selector: 'app-empty-label',
  imports: [AnimationDirective],
  templateUrl: './empty-label.component.html',
  styleUrl: './empty-label.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class EmptyLabelComponent {
  private themeService = inject(ThemeService);

  text = input<string>();
  isShow = input.required<boolean>();

  icon = input<string>();
  color = input<AppColor>();
  bgColor = input<AppColor>();
  position = input<'center' | 'top'>('center');

  delayShowAnimation = input<number>(0);
  animationShowTransitionMS = input<number>(500);
  animationHideTransitionMS = input<number>(500);

  protected _backgroundColor = '';
  protected _color = '';

  private themeChanged = toSignal(this.themeService.themeChanged$, {
    initialValue: this.themeService.getCurrent(),
  });

  constructor() {
    effect(() => {
      this.themeChanged();
      this._color = this.themeService.getCurrentThemeColor(this.color() as AppColor);
      this._backgroundColor = this.themeService.getCurrentThemeColor(this.bgColor() as AppColor);
    });
  }
}
