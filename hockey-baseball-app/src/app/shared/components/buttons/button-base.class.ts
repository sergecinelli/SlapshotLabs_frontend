import {
  ElementRef,
  OnInit,
  AfterContentInit,
  Directive,
  inject,
  input,
  output,
  effect,
  signal,
} from '@angular/core';
import {
  ButtonMaterialIconsClass,
  ButtonMaterialSymbolsClass,
  CustomButtomStyles,
  ButtonStyleParams,
} from './button.interface';
import { ThemeService } from '../../../services/theme.service';
import { AppColor } from '../../constants/colors';
import { TooltipPosition } from '@angular/material/tooltip';

@Directive({
  host: { '[style.width]': 'width()' },
})
export abstract class ButtonBaseClass implements OnInit, AfterContentInit {
  protected static readonly BUTTON_TRANSITION =
    '0.1s cubic-bezier(0.175, 0.885, 0.32, 1.06)';

  protected getColor(color: AppColor) {
    return this.themeService.getCurrentThemeColor(color);
  }

  get rippleColor() {
    return this.themeService.getRippleColor(this.color(), 0.1);
  }

  bg = input<AppColor>('transparent');
  bghover = input<AppColor>('none');
  bgselect = input<AppColor>('none');
  br = input<AppColor>('transparent');
  brhover = input<AppColor>('none');
  brselect = input<AppColor>('none');
  color = input<AppColor>('background');
  colorhover = input<AppColor>('none');
  colorselect = input<AppColor>('none');

  opacity = input(1);
  opacityhover = input(1);
  width = input('auto');
  rounded = input(false);
  dev = input(false);
  haveContent = input(false);
  isActive = input(false);

  tooltip = input<string | null>(null);
  tooltipPos = input<TooltipPosition>('below');
  tooltipDelay = input(800);

  isDisabled = input(false);

  materialIcon = input('');
  materialIconClass = input<ButtonMaterialIconsClass>('material-icons-round');
  materialSymbolClass = input<ButtonMaterialSymbolsClass>(
    'material-symbols-rounded'
  );
  isMatSymbolClass = input(true);

  counter = input(-1);
  hasDot = input(false);
  counterColor = input<AppColor>('transparent');
  counterBgColor = input<AppColor>('transparent');

  isMatIconFill = input(false);

  protected _isMatIconFillOriginal = false;
  protected isMatIconFillCurrent = false;

  clicked = output<MouseEvent>();

  protected hasContent = signal(false);

  styles: CustomButtomStyles = {};

  protected themeService = inject(ThemeService);
  protected elRef = inject(ElementRef);

  private isMatIconFillEffect = effect(() => {
    this._isMatIconFillOriginal = this.isMatIconFill();
    this.isMatIconFillCurrent = this.isMatIconFill();
  });

  private isActiveEffect = effect(() => {
    if (this.isActive()) {
      this.applyActiveStyles();
    } else {
      this.applyDefaultStyles();
    }
  });

  ngOnInit() {
    this.updateStyles({
      display: 'flex',
      transition: ButtonBaseClass.BUTTON_TRANSITION,
      ...this.getDefaultStyles(),
    });

    if (this.isActive()) {
      this.applyActiveStyles();
    }
  }

  ngAfterContentInit() {
    this.hasContent.set(
      !!this.elRef.nativeElement.querySelector('.text')?.childNodes.length ||
        this.haveContent()
    );
  }

  protected getStyleParams(): ButtonStyleParams {
    return {
      color: this.color(),
      colorhover: this.colorhover(),
      bg: this.bg(),
      bghover: this.bghover(),
      br: this.br(),
      brhover: this.brhover(),
      opacity: this.opacity(),
      opacityhover: this.opacityhover(),
    };
  }

  protected getHoverStyles(): CustomButtomStyles {
    const params = this.getStyleParams();
    return {
      color:
        params.colorhover === 'none'
          ? this.themeService.getCurrentThemeColor(params.color)
          : this.themeService.getCurrentThemeColor(params.colorhover),
      backgroundColor:
        params.bghover === 'none'
          ? this.themeService.getCurrentThemeColor(params.bg)
          : this.themeService.getCurrentThemeColor(params.bghover),
      borderColor:
        params.brhover === 'none'
          ? this.themeService.getCurrentThemeColor(params.br)
          : this.themeService.getCurrentThemeColor(params.brhover),
      opacity: params.opacityhover,
    };
  }

  protected getDefaultStyles(): CustomButtomStyles {
    const params = this.getStyleParams();
    return {
      color: this.themeService.getCurrentThemeColor(params.color),
      backgroundColor: this.themeService.getCurrentThemeColor(params.bg),
      borderColor: this.themeService.getCurrentThemeColor(params.br),
      opacity: params.opacity,
    };
  }

  protected applyActiveStyles() {
    this.isMatIconFillCurrent = true;
    this.updateStyles(this.getHoverStyles());
  }

  protected applyDefaultStyles() {
    if (!this._isMatIconFillOriginal) this.isMatIconFillCurrent = false;
    this.updateStyles(this.getDefaultStyles());
  }

  updateStyles(styles: CustomButtomStyles) {
    this.styles = { ...this.styles, ...styles };
  }

  onMouseEnter() {
    if (this.isActive()) return;
    this.isMatIconFillCurrent = true;
    this.updateStyles(this.getHoverStyles());
  }

  onMouseLeave() {
    if (this.isActive()) return;
    this.applyDefaultStyles();
  }

  onMouseDown() {
    if (this.colorselect() !== 'none')
      this.updateStyles({
        color: this.themeService.getCurrentThemeColor(this.colorselect()),
      });
    if (this.bgselect() !== 'none')
      this.updateStyles({
        backgroundColor: this.themeService.getCurrentThemeColor(this.bgselect()),
      });
    if (this.brselect() !== 'none')
      this.updateStyles({
        borderColor: this.themeService.getCurrentThemeColor(this.brselect()),
      });
  }

  onMouseUp() {
    if (this.colorhover() !== 'none')
      this.updateStyles({
        color: this.themeService.getCurrentThemeColor(this.colorhover()),
      });
    else if (this.colorselect() !== 'none')
      this.updateStyles({
        color: this.themeService.getCurrentThemeColor(this.color()),
      });

    if (this.bghover() !== 'none')
      this.updateStyles({
        backgroundColor: this.themeService.getCurrentThemeColor(this.bghover()),
      });
    else if (this.bgselect() !== 'none')
      this.updateStyles({
        backgroundColor: this.themeService.getCurrentThemeColor(this.bg()),
      });

    if (this.brhover() !== 'none')
      this.updateStyles({
        borderColor: this.themeService.getCurrentThemeColor(this.brhover()),
      });
    else if (this.brselect() !== 'none')
      this.updateStyles({
        borderColor: this.themeService.getCurrentThemeColor(this.br()),
      });
  }

  click(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.clicked.emit(event);
  }
}
