import { IKeyValue } from '../interfaces/key-value.interface';

export type AppColor =
  // Primary colors
  | 'primary'
  | 'primary_dark'
  // Secondary colors
  | 'secondary'
  | 'secondary_tone1'
  | 'upcoming'
  // Banner status colors (semantic aliases)
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
  | 'button_background'
  | 'page_background'
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
  | 'purple'
  | 'green'
  | 'blue'
  | 'blue_dark'
  // Legacy CSS variable aliases (for backward compatibility)
  | 'color_primary'
  | 'color_dark'
  | 'color_secondary'
  | 'color_white'
  | 'sidebar_dark'
  | 'bg_content'
  | 'bg_white'
  // Special
  | 'transparent'
  | 'none';

export const appColors: IKeyValue<AppColor, string>[] = [
  // Primary colors
  { key: 'primary', value: '#CF142B' },
  { key: 'primary_dark', value: '#B0122A' },
  
  // Secondary colors
  { key: 'secondary', value: '#778f9c' },
  { key: 'secondary_tone1', value: '#c6cddb' },
  { key: 'upcoming', value: '#22a9f2' },
  
  // Banner status colors (semantic aliases - same values as primary/gray)
  { key: 'live', value: '#CF142B' },
  { key: 'completed', value: '#3d0cc6' },
  
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
  { key: 'button_background', value: '#F7F8FA' },
  { key: 'page_background', value: '#f5f5f5' },
  
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
  { key: 'purple', value: '#9C27B0' },
  { key: 'green', value: '#10b981' },
  { key: 'blue', value: '#3b82f6' },
  { key: 'blue_dark', value: '#2563eb' },
  
  // Legacy CSS variable aliases (for backward compatibility)
  { key: 'color_primary', value: '#CF142B' },
  { key: 'color_dark', value: '#090b0c' },
  { key: 'color_secondary', value: '#778f9c' },
  { key: 'color_white', value: '#ffffff' },
  { key: 'sidebar_dark', value: '#0f0f0f' },
  { key: 'bg_content', value: '#f3f4f6' },
  { key: 'bg_white', value: '#ffffff' },
  
  // Special
  { key: 'transparent', value: 'transparent' },
  { key: 'none', value: 'transparent' },
];
