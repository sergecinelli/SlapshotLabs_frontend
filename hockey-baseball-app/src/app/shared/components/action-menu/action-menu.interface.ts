export interface ActionMenuItem {
  label?: string;
  description?: string;
  icon?: string;
  suffixIcon?: string;
  onClick?: (event?: MouseEvent) => void;
  badgeDot?: boolean;
  badgeText?: string | number;
  isDivider?: boolean;
  isHeader?: boolean;
  isDisabled?: boolean;
  isDanger?: boolean;
  isActive?: boolean;
  shortcut?: string[];
}
