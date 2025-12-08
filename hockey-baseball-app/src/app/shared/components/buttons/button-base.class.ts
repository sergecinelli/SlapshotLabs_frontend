import {
  ElementRef,
  HostBinding,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
  AfterContentInit,
  Directive,
  Output,
  EventEmitter,
  inject,
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

@Directive()
export abstract class ButtonBaseClass
  implements OnInit, OnChanges, AfterContentInit
{
  protected static readonly BUTTON_TRANSITION =
    '0.1s cubic-bezier(0.175, 0.885, 0.32, 1.06)';

  protected getColor(color: AppColor) {
    return this.themeService.getCurrentThemeColor(color);
  }

  get rippleColor() {
    return this.themeService.getRippleColor(this.color, 0.1);
  }

  @Input() bg: AppColor = 'transparent';
  @Input() bghover: AppColor = 'none';
  @Input() bgselect: AppColor = 'none';
  @Input() br: AppColor = 'transparent';
  @Input() brhover: AppColor = 'none';
  @Input() brselect: AppColor = 'none';
  @Input() color: AppColor = 'background';
  @Input() colorhover: AppColor = 'none';
  @Input() colorselect: AppColor = 'none';

  @Input() opacity = 1;
  @Input() opacityhover = 1;
  @Input() width = 'auto';
  @Input() rounded = false;
  @Input() dev = false;
  @Input() haveContent = false;
  @Input() isActive = false;

  @Input() tooltip: string | null = null;
  @Input() tooltipPos: TooltipPosition = 'below';
  @Input() tooltipDelay = 800;

  @Input() isDisabled = false;

  @Input() materialIcon = '';
  @Input() materialIconClass: ButtonMaterialIconsClass = 'material-icons-round';
  @Input() materialSymbolClass: ButtonMaterialSymbolsClass =
    'material-symbols-rounded';
  @Input() isMatSymbolClass = true;

  @Input() counter = -1;
  @Input() hasDot = false;
  @Input() counterColor: AppColor = 'transparent';
  @Input() counterBgColor: AppColor = 'transparent';

  protected _isMatIconFillOriginal = false;
  protected isMatIconFillCurrent = false;
  @Input() set isMatIconFill(value: boolean) {
    this._isMatIconFillOriginal = value;
    this.isMatIconFillCurrent = value;
  }
  get isMatIconFill() {
    return this._isMatIconFillOriginal;
  }

  @HostBinding('style.width')
  get getWidth(): string {
    return this.width;
  }

  @Output() clicked = new EventEmitter<MouseEvent>();

  styles: CustomButtomStyles = {};

  protected themeService = inject(ThemeService);
  protected elRef = inject(ElementRef);

  ngOnInit() {
    this.updateStyles({
      display: 'flex',
      transition: ButtonBaseClass.BUTTON_TRANSITION,
      ...this.getDefaultStyles(),
    });

    if (this.isActive) {
      this.applyActiveStyles();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isActive']) {
      if (this.isActive) {
        this.applyActiveStyles();
      } else {
        this.applyDefaultStyles();
      }
    }
  }

  ngAfterContentInit() {
    this.haveContent =
      !!this.elRef.nativeElement.querySelector('.text')?.childNodes.length;
  }

  protected getStyleParams(): ButtonStyleParams {
    return {
      color: this.color,
      colorhover: this.colorhover,
      bg: this.bg,
      bghover: this.bghover,
      br: this.br,
      brhover: this.brhover,
      opacity: this.opacity,
      opacityhover: this.opacityhover,
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
    if (this.isActive) return;
    this.isMatIconFillCurrent = true;
    this.updateStyles(this.getHoverStyles());
  }

  onMouseLeave() {
    if (this.isActive) return;
    this.applyDefaultStyles();
  }

  onMouseDown() {
    if (this.colorselect !== 'none')
      this.updateStyles({
        color: this.themeService.getCurrentThemeColor(this.colorselect),
      });
    if (this.bgselect !== 'none')
      this.updateStyles({
        backgroundColor: this.themeService.getCurrentThemeColor(this.bgselect),
      });
    if (this.brselect !== 'none')
      this.updateStyles({
        borderColor: this.themeService.getCurrentThemeColor(this.brselect),
      });
  }

  onMouseUp() {
    if (this.colorhover !== 'none')
      this.updateStyles({
        color: this.themeService.getCurrentThemeColor(this.colorhover),
      });
    else if (this.colorselect !== 'none')
      this.updateStyles({
        color: this.themeService.getCurrentThemeColor(this.color),
      });

    if (this.bghover !== 'none')
      this.updateStyles({
        backgroundColor: this.themeService.getCurrentThemeColor(this.bghover),
      });
    else if (this.bgselect !== 'none')
      this.updateStyles({
        backgroundColor: this.themeService.getCurrentThemeColor(this.bg),
      });

    if (this.brhover !== 'none')
      this.updateStyles({
        borderColor: this.themeService.getCurrentThemeColor(this.brhover),
      });
    else if (this.brselect !== 'none')
      this.updateStyles({
        borderColor: this.themeService.getCurrentThemeColor(this.br),
      });
  }

  click(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.clicked.emit(event);
  }
}

