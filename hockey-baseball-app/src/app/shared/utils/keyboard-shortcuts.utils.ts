import { ShortcutDefinition } from '../constants/shortcuts';

const normalizeEventCode = (code: string) => code.toLowerCase();

export const isShortcutTriggered = (event: KeyboardEvent, shortcut: ShortcutDefinition) => {
  if (shortcut.requiresModifier && !event.shiftKey) {
    return false;
  }

  const eventCode = normalizeEventCode(event.code);

  return shortcut.keys.some((key) => normalizeEventCode(key) === eventCode);
};
