import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { IKeyValue } from '../shared/interfaces/key-value.interface';
import { AppColor, appColors } from '../shared/constants/colors';

export interface Theme {
  type: ThemeStyle;
  colors: IKeyValue<AppColor, string>[];
}

export enum ThemeStyle {
  main, /* dark, light, etc... */
}

@Injectable({ providedIn: 'root' })
export class ThemeService {
  themes: Theme[];
  private currentTheme: ThemeStyle = ThemeStyle.main;

  private _themeChanged = new Subject<Theme>();
  themeChanged$ = this._themeChanged.asObservable();

  constructor() {
    this.themes = [
      {
        type: ThemeStyle.main,
        colors: appColors,
      },
    ];
    // Initialize theme on service creation
    this.changeTo(ThemeStyle.main);
  }

  changeTo(type: ThemeStyle) {
    const theme = this.themes[type];

    this.currentTheme = type;

    for (const colorData of theme.colors) {
      const cssVariableName = `--${colorData.key.replace(/_/g, '-')}`;

      document.documentElement.style.setProperty(cssVariableName, colorData.value);
    }

    this._themeChanged.next(theme);
  }

  convertHexToRgba(hexColor: string, opacity: number): string {
    const hex = hexColor.substring(1);
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }

  getRippleColor(color: AppColor, opacity: number): string {
    return this.convertHexToRgba(this.getCurrentThemeColor(color), opacity);
  }

  getCurrentThemeColor(color: AppColor): string {
    return this.getCurrent()?.colors.find((c) => c.key === color)?.value || '';
  }

  getCurrent(): Theme {
    return this.themes[this.currentTheme];
  }
}

