// Authentication-related interfaces based on API schema

export interface UserSignUpRequest {
  email: string;
  first_name: string;
  last_name: string;
  password: string;
}

export interface UserSignInRequest {
  email: string;
  password: string;
  remember_me?: boolean;
}

export interface UserProfile {
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  country: string;
  region: string;
  city: string;
  street: string;
  postal_code: string;
}

export interface UserEditRequest {
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone_number?: string | null;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  street?: string | null;
  postal_code?: string | null;
  password?: string | null;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  uidb64: string;
  token: string;
  new_password: string;
  new_password_confirm: string;
}

export interface ApiMessage {
  message: string;
}

export interface ApiErrorResponse {
  errors: Record<string, string[]>;
}

// User registration form interface (matches your current form)
export interface UserRegistrationForm {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
}

// User sign-in form interface (matches your current form)
export interface UserSignInForm {
  email: string;
  password: string;
  rememberMe: boolean;
}
