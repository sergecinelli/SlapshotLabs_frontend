import { IKeyValue } from '../interfaces/key-value.interface';

export type AppColor =
  // Primary colors
  | 'primary'
  | 'primary_dark'
  | 'primary_soft'
  // Secondary colors
  | 'secondary'
  | 'secondary_tone1'
  | 'secondary_dark'
  // Status colors
  | 'upcoming'
  | 'live'
  | 'completed'
  // Dark colors
  | 'dark'
  | 'dark_tone2'
  | 'dark_hover'
  // Gray colors
  | 'gray'
  | 'gray_tone1'
  | 'gray_tone2'
  | 'gray_tone3'
  // Base colors
  | 'white'
  | 'black'
  // Layout colors
  | 'sidebar'
  | 'sidebar_hover'
  | 'sidebar_border'
  // Background colors
  | 'background'
  | 'background_invert'
  | 'card_background'
  | 'page_background'
  | 'item_hover'
  | 'item_selected'
  | 'input_background'
  | 'input_border'
  // Border colors
  | 'border'
  | 'border_dark'
  | 'border_light'
  // Text colors
  | 'text_primary'
  | 'text_secondary'
  | 'text_white'
  // Action colors
  | 'orange'
  | 'orange_dark'
  | 'pink'
  | 'purple'
  | 'purple_dark'
  | 'violet'
  | 'cyan'
  | 'cyan_dark'
  | 'green'
  | 'green_dark'
  | 'green_soft'
  | 'blue'
  | 'blue_dark'
  | 'blue_soft'
  // Danger colors
  | 'danger'
  | 'danger_soft'
  | 'danger_border'
  // Special
  | 'transparent'
  | 'none';

export const appColors: IKeyValue<AppColor, string>[] = [
  // Primary colors
  { key: 'primary', value: '#CF142B' },
  { key: 'primary_dark', value: '#B0122A' },
  { key: 'primary_soft', value: '#ffeef1' },

  // Secondary colors
  { key: 'secondary', value: '#778f9c' },
  { key: 'secondary_tone1', value: '#c6cddb' },
  { key: 'secondary_dark', value: '#5f7a88' },

  // Status colors
  { key: 'upcoming', value: '#3D0CC6' },
  { key: 'live', value: '#CF142B' },
  { key: 'completed', value: '#22a9f2' },

  // Dark colors
  { key: 'dark', value: '#090b0c' },
  { key: 'dark_tone2', value: '#2f2f2f' },
  { key: 'dark_hover', value: '#222222' },

  // Gray colors
  { key: 'gray', value: '#878787' },
  { key: 'gray_tone1', value: '#2d2d2d' },
  { key: 'gray_tone2', value: '#e7e7e7' },
  { key: 'gray_tone3', value: '#F0F1F3' },

  // Base colors
  { key: 'white', value: '#ffffff' },
  { key: 'black', value: '#0f0f0f' },

  // Layout colors
  { key: 'sidebar', value: '#0f0f0f' },
  { key: 'sidebar_hover', value: '#252836' },
  { key: 'sidebar_border', value: '#2d3142' },

  // Background colors
  { key: 'background', value: '#ffffff' },
  { key: 'background_invert', value: '#0F0F0F' },
  { key: 'card_background', value: '#ffffff' },
  { key: 'page_background', value: '#f8f8f8' },
  { key: 'item_hover', value: '#f7f8fa' },
  { key: 'item_selected', value: '#f7f8fa' },
  { key: 'input_background', value: '#ffffff' },
  { key: 'input_border', value: '#e7e7e7' },

  // Border colors
  { key: 'border', value: '#e7e7e7' },
  { key: 'border_dark', value: '#2d2d2d' },
  { key: 'border_light', value: '#F0F1F3' },

  // Text colors
  { key: 'text_primary', value: '#0F0F0F' },
  { key: 'text_secondary', value: '#878787' },
  { key: 'text_white', value: '#ffffff' },

  // Action colors
  { key: 'orange', value: '#ff8509' },
  { key: 'orange_dark', value: '#EB7A08' },
  { key: 'pink', value: '#ec4899' },
  { key: 'purple', value: '#9C27B0' },
  { key: 'purple_dark', value: '#7B1FA2' },
  { key: 'violet', value: '#8b5cf6' },
  { key: 'cyan', value: '#22A9F2' },
  { key: 'cyan_dark', value: '#209FE4' },
  { key: 'green', value: '#10b981' },
  { key: 'green_dark', value: '#0d9668' },
  { key: 'green_soft', value: '#EEFFF2' },
  { key: 'blue', value: '#3b82f6' },
  { key: 'blue_dark', value: '#2563eb' },
  { key: 'blue_soft', value: '#EEF2FF' },

  // Danger colors
  { key: 'danger', value: '#cc0000' },
  { key: 'danger_soft', value: '#ffeeee' },
  { key: 'danger_border', value: '#ffcccc' },

  // Special
  { key: 'transparent', value: 'transparent' },
  { key: 'none', value: 'transparent' },
];

export const appColorsDark: IKeyValue<AppColor, string>[] = [
  // Primary colors
  { key: 'primary', value: '#CF142B' },
  { key: 'primary_dark', value: '#B0122A' },
  { key: 'primary_soft', value: '#2D1A1E' },

  // Secondary colors
  { key: 'secondary', value: '#6B7F8C' },
  { key: 'secondary_tone1', value: '#4A5568' },
  { key: 'secondary_dark', value: '#5A7080' },

  // Status colors
  { key: 'upcoming', value: '#3D0CC6' },
  { key: 'live', value: '#CF142B' },
  { key: 'completed', value: '#22a9f2' },

  // Dark colors
  { key: 'dark', value: '#E1E2E6' },
  { key: 'dark_tone2', value: '#3A3F47' },
  { key: 'dark_hover', value: '#20232a' },

  // Gray colors
  { key: 'gray', value: '#9CA3AF' },
  { key: 'gray_tone1', value: '#3A3F47' },
  { key: 'gray_tone2', value: '#2D3138' },
  { key: 'gray_tone3', value: '#232931' },

  // Base colors
  { key: 'white', value: '#ffffff' },
  { key: 'black', value: '#F9FAFB' },

  // Layout colors
  { key: 'sidebar', value: '#121418' },
  { key: 'sidebar_hover', value: '#1e2127' },
  { key: 'sidebar_border', value: 'rgba(67, 78, 92, 0.3)' },

  // Background colors
  { key: 'background', value: '#121418' },
  { key: 'background_invert', value: '#F9FAFB' },
  { key: 'card_background', value: '#1e2127' },
  { key: 'page_background', value: '#121418' },
  { key: 'item_hover', value: '#20232a' },
  { key: 'item_selected', value: '#242830' },
  { key: 'input_background', value: '#1e2127' },
  { key: 'input_border', value: 'rgba(75, 85, 99, 0.3)' },

  // Border colors
  { key: 'border', value: '#232931' },
  { key: 'border_dark', value: 'rgba(67, 78, 92, 0.3)' },
  { key: 'border_light', value: '#232931' },

  // Text colors
  { key: 'text_primary', value: '#F9FAFB' },
  { key: 'text_secondary', value: '#9CA3AF' },
  { key: 'text_white', value: '#ffffff' },

  // Action colors
  { key: 'orange', value: '#D8852E' },
  { key: 'orange_dark', value: '#E68A1A' },
  { key: 'pink', value: '#ec4899' },
  { key: 'purple', value: '#B040C8' },
  { key: 'purple_dark', value: '#9030A8' },
  { key: 'violet', value: '#9B7AF6' },
  { key: 'cyan', value: '#22A9F2' },
  { key: 'cyan_dark', value: '#209FE4' },
  { key: 'green', value: '#1ca171' },
  { key: 'green_dark', value: '#0d9668' },
  { key: 'green_soft', value: '#1A2A22' },
  { key: 'blue', value: '#5175f3' },
  { key: 'blue_dark', value: '#3B65E0' },
  { key: 'blue_soft', value: '#1E2332' },

  // Danger colors
  { key: 'danger', value: '#E03030' },
  { key: 'danger_soft', value: '#2D1A1A' },
  { key: 'danger_border', value: '#4A2020' },

  // Special
  { key: 'transparent', value: 'transparent' },
  { key: 'none', value: 'transparent' },
];
