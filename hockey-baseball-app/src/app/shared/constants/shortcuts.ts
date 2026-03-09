export type ShortcutCategory = 'General' | 'Navigation';

export type ShortcutId = 'toggleTheme' | 'toggleMenu' | 'navItem' | 'navNext' | 'navPrev';

export interface ShortcutDefinition {
  id: ShortcutId;
  category: ShortcutCategory;
  label: string;
  icon: string;
  description: string;
  keys: string[];
  displayKeys?: string[];
  requiresModifier?: boolean;
}

export interface ShortcutGroup {
  category: ShortcutCategory;
  items: ShortcutDefinition[];
}

export const KEYBOARD_SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    category: 'General',
    items: [
      {
        id: 'toggleTheme',
        label: 'Toggle Theme',
        keys: ['KeyT'],
        icon: 'dark_mode',
        description: 'Switch between light and dark themes',
        category: 'General',
        requiresModifier: true,
      },
      {
        id: 'toggleMenu',
        label: 'Toggle Menu',
        keys: ['KeyM'],
        icon: 'menu',
        description: 'Expand or collapse the sidebar',
        category: 'General',
        requiresModifier: true,
      },
    ],
  },
  {
    category: 'Navigation',
    items: [
      {
        id: 'navItem',
        label: 'Go to Menu Item 1-9',
        keys: [
          'Digit1',
          'Digit2',
          'Digit3',
          'Digit4',
          'Digit5',
          'Digit6',
          'Digit7',
          'Digit8',
          'Digit9',
        ],
        displayKeys: ['1-9'],
        icon: 'numbers',
        description: 'Quickly jump to a sidebar link',
        category: 'Navigation',
        requiresModifier: true,
      },
      {
        id: 'navNext',
        label: 'Next Menu Item',
        keys: ['ArrowDown'],
        icon: 'arrow_downward',
        description: 'Move to the next item in lists',
        category: 'Navigation',
        requiresModifier: true,
      },
      {
        id: 'navPrev',
        label: 'Previous Menu Item',
        keys: ['ArrowUp'],
        icon: 'arrow_upward',
        description: 'Move to the previous item in lists',
        category: 'Navigation',
        requiresModifier: true,
      },
    ],
  },
];

export const SHORTCUTS_BY_ID = KEYBOARD_SHORTCUT_GROUPS.flatMap((group) => group.items).reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<ShortcutId, ShortcutDefinition>
);
