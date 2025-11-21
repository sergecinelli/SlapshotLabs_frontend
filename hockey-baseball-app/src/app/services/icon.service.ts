import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class IconService {
  private iconCache = new Map<string, string>();

  async loadIcon(iconName: string): Promise<string> {
    if (this.iconCache.has(iconName)) {
      return this.iconCache.get(iconName)!;
    }

    try {
      const response = await fetch(`assets/icons/${iconName}.svg`);
      if (!response.ok) {
        console.warn(`Icon ${iconName} not found`);
        return '';
      }

      const svgContent = await response.text();
      this.iconCache.set(iconName, svgContent);
      return svgContent;
    } catch (error) {
      console.error(`Error loading icon ${iconName}:`, error);
      return '';
    }
  }

  getIconPath(iconName?: string): string {
    if (!iconName) return '';
    return `assets/icons/${iconName}.svg`;
  }
}
