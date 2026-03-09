import { NavigationItem } from '../../services/navigation.service';
import { LayoutComponent } from './layout.component';
import { SHORTCUTS_BY_ID } from '../../shared/constants/shortcuts';
import { isShortcutTriggered } from '../../shared/utils/keyboard-shortcuts.utils';

export class LayoutShortcuts {
  static handleKeyboardEvent(event: KeyboardEvent, component: LayoutComponent): void {
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    if (isShortcutTriggered(event, SHORTCUTS_BY_ID.toggleTheme)) {
      event.preventDefault();
      const themeHost = document.querySelector('.theme-toggle');
      const themeBtn = themeHost?.querySelector('.app-button') ?? themeHost;
      let x = window.innerWidth / 2;
      let y = window.innerHeight / 2;

      if (themeBtn) {
        const rect = themeBtn.getBoundingClientRect();
        x = rect.left + rect.width / 2;
        y = rect.top + rect.height / 2;
      }

      component.themeService.toggleTheme(x, y);
      return;
    }

    if (isShortcutTriggered(event, SHORTCUTS_BY_ID.toggleMenu)) {
      event.preventDefault();
      component.toggleCollapse();
      return;
    }

    if (isShortcutTriggered(event, SHORTCUTS_BY_ID.navItem)) {
      const digit = this.getDigitFromCode(event.code);

      if (digit) {
        const index = Number(digit) - 1;
        const items = component.navigationItems();

        if (index >= 0 && index < items.length) {
          event.preventDefault();
          component.navigate(items[index].path);
        }
      }
      return;
    }

    const isNavNext = isShortcutTriggered(event, SHORTCUTS_BY_ID.navNext);
    const isNavPrev = isShortcutTriggered(event, SHORTCUTS_BY_ID.navPrev);

    if (isNavNext || isNavPrev) {
      event.preventDefault();
      const flatItems = this.getFlatNavItems(component.navigationItems());
      const currentPath = component.currentPath().split('?')[0];
      const currentIndex = flatItems.findIndex((item) => currentPath === item.path);

      if (isNavNext) {
        const nextIndex = (currentIndex + 1) % flatItems.length;
        component.navigate(flatItems[nextIndex].path);
      } else {
        const prevIndex = (currentIndex - 1 + flatItems.length) % flatItems.length;
        component.navigate(flatItems[prevIndex].path);
      }
    }
  }

  private static getFlatNavItems(items: NavigationItem[]): NavigationItem[] {
    const flat: NavigationItem[] = [];

    for (const item of items) {
      if (item.children) {
        if (item.navigable) {
          flat.push(item);
        }

        for (const child of item.children) {
          flat.push(child);
        }
      } else {
        flat.push(item);
      }
    }

    return flat;
  }

  private static getDigitFromCode(code: string): string | null {
    if (!code.startsWith('Digit')) {
      return null;
    }

    const digit = code.replace('Digit', '');
    return digit.length === 1 ? digit : null;
  }
}
