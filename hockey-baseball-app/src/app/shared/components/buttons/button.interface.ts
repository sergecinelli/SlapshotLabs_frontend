import { AppColor } from '../../constants/colors';

export interface CustomButtomStyles {
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  opacity?: number;
  transition?: string;
  display?: string;
}

export interface ButtonStyleParams {
  color: AppColor;
  colorhover: AppColor;
  bg: AppColor;
  bghover: AppColor;
  br: AppColor;
  brhover: AppColor;
  opacity: number;
  opacityhover: number;
}

export type ButtonMaterialIconsClass =
  | 'material-icons-sharp'
  | 'material-icons-round' | 'material-icons-outlined'
  | 'material-icons';
export type ButtonMaterialSymbolsClass =
  | 'material-symbols-outlined'
  | 'material-symbols-rounded';