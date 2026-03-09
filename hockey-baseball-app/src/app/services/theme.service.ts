import { inject, Injectable, NgZone, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { IKeyValue } from '../shared/interfaces/key-value.interface';
import { AppColor, appColors, appColorsDark } from '../shared/constants/colors';

export interface Theme {
  type: ThemeStyle;
  colors: IKeyValue<AppColor, string>[];
}

export enum ThemeStyle {
  light,
  dark,
}

const THEME_STORAGE_KEY = 'slapshot-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  themes: Theme[];
  private currentTheme: ThemeStyle = ThemeStyle.light;

  readonly isDark = signal(false);

  private _themeChanged = new Subject<Theme>();
  themeChanged$ = this._themeChanged.asObservable();

  private _themeTransitionStart = new Subject<{ x: number; y: number }>();
  themeTransitionStart$ = this._themeTransitionStart.asObservable();

  private ngZone = inject(NgZone);

  constructor() {
    this.themes = [
      { type: ThemeStyle.light, colors: appColors },
      { type: ThemeStyle.dark, colors: appColorsDark },
    ];

    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    const initial = saved === 'dark' ? ThemeStyle.dark : ThemeStyle.light;
    this.changeTo(initial);
  }

  changeTo(type: ThemeStyle) {
    const theme = this.themes[type];
    this.currentTheme = type;
    this.isDark.set(type === ThemeStyle.dark);

    for (const colorData of theme.colors) {
      const cssVariableName = `--${colorData.key.replace(/_/g, '-')}`;
      document.documentElement.style.setProperty(cssVariableName, colorData.value);
    }

    document.body.setAttribute('data-theme', type === ThemeStyle.dark ? 'dark' : 'light');
    document.body.style.colorScheme = type === ThemeStyle.dark ? 'dark' : 'light';

    localStorage.setItem(THEME_STORAGE_KEY, type === ThemeStyle.dark ? 'dark' : 'light');

    this._themeChanged.next(theme);
  }

  toggleTheme(x?: number, y?: number): void {
    const next = this.currentTheme === ThemeStyle.light ? ThemeStyle.dark : ThemeStyle.light;

    const doc = document as Document & { startViewTransition?: (cb: () => void) => void };

    if (x !== undefined && y !== undefined && doc.startViewTransition) {
      document.documentElement.style.setProperty('--click-x', `${x}px`);
      document.documentElement.style.setProperty('--click-y', `${y}px`);
      doc.startViewTransition(() => {
        this.ngZone.run(() => this.changeTo(next));
      });
    } else {
      this._themeTransitionStart.next({ x: x || 0, y: y || 0 });
      setTimeout(() => this.changeTo(next), 10);
    }
  }

  convertHexToRgba(hexColor: string, opacity: number): string {
    if (hexColor.startsWith('rgba') || hexColor.startsWith('rgb')) {
      return hexColor;
    }
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
