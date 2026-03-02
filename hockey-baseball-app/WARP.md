# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this
repository.

## Project Overview

This is a modern Angular 20 application called "hockey-baseball-app" built with:

- **Angular 20+** with standalone components architecture
- **Angular Material** for UI components with Material 3 design
- **TailwindCSS** for utility-first styling (with preflight disabled)
- **TypeScript** with strict mode and Angular-specific compiler options
- **SCSS** for component styling
- **Signals** for reactive state management
- **Karma/Jasmine** for unit testing

## Essential Commands

### Development

```bash
# Start development server (http://localhost:4200)
npm start
# or
ng serve

# Build for development with watch mode
npm run watch

# Generate new components, services, etc.
ng generate component component-name
ng generate service service-name
ng generate --help  # See all available schematics
```

### Testing

```bash
# Run unit tests
npm test
# or
ng test

# Run tests in watch mode (default)
ng test --watch

# Run tests once and exit
ng test --no-watch --browsers=ChromeHeadless
```

### Building

```bash
# Production build
npm run build
# or
ng build

# Development build
ng build --configuration development
```

## Code Architecture & Standards

### Application Structure

- **Bootstrap**: Uses `bootstrapApplication()` with standalone components (no
  NgModules)
- **Main Component**: `App` component as the root (`app-root` selector)
- **Configuration**: Centralized in `src/app/app.config.ts` using
  `ApplicationConfig`
- **Styling**: Hybrid approach with Angular Material + TailwindCSS

### TypeScript Configuration

- **Strict Mode**: Enabled with comprehensive strict checks
- **Angular Compiler**: Configured for strict templates and injection parameters
- **Target**: ES2022 with module preservation
- **Decorators**: Experimental decorators enabled for Angular

### Component Standards

- **Always use standalone components** (default in this project)
- **Never explicitly set `standalone: true`** in decorators (it's the default)
- **Use `input()` and `output()` functions** instead of decorators
- **Use signals for state** with `computed()` for derived state
- **Do NOT set `changeDetection: ChangeDetectionStrategy.OnPush`** — not all components use signals yet
- **Use native control flow**: `@if`, `@for`, `@switch` instead of structural
  directives
- **Avoid `ngClass` and `ngStyle`** - use direct class/style bindings instead
- **Never use `mutate()` on signals** - use `update()` or `set()` instead

### Service Standards

- **Use `inject()` function** instead of constructor injection
- **Single responsibility principle** for all services
- **Use `providedIn: 'root'`** for singleton services
- **Design services around specific business domains**

### Template Standards

- **Keep templates simple** - avoid complex logic in templates
- **Use `NgOptimizedImage`** for all static images (not for base64)
- **Prefer Reactive Forms** over Template-driven forms
- **Use async pipe** for observables

### Host Bindings

- **Never use `@HostBinding` or `@HostListener` decorators**
- **Put all host bindings in the `host` object** of component/directive
  decorators

## Styling Architecture

### Material + Tailwind Integration

- **Angular Material**: Primary UI component library with Material 3 theming
- **Theme Colors**: Rose primary palette, red tertiary palette, Roboto
  typography
- **TailwindCSS**: Utility classes with preflight disabled to avoid conflicts
- **SCSS**: Component-level styling in `.scss` files

### Color Scheme

- **Default**: Light theme with system-level CSS variables
- **Material Variables**: Uses `--mat-sys-*` variables for consistent theming
- **Roboto Font**: Default system font family

## Development Tools

### VSCode Integration

- **Recommended Extensions**: `angular.ng-template`
- **Debug Configurations**:
  - `ng serve` - Launch Chrome with dev server
  - `ng test` - Launch Chrome with test runner
- **Tasks**: Pre-configured npm tasks for start and test

### Code Formatting

- **Prettier**: Configured with 100 character line width and single quotes
- **Angular HTML**: Special parser for Angular templates
- **EditorConfig**: Consistent editor settings across the team

## Testing Framework

### Karma + Jasmine Setup

- **Test Runner**: Karma with Chrome launcher
- **Framework**: Jasmine for test specifications
- **Coverage**: Karma coverage reporter included
- **Configuration**: Tests run in watch mode by default
- **Debugging**: Chrome debug interface available at localhost:9876/debug.html

## Key File Locations

### Core Application

- `src/main.ts` - Application bootstrap
- `src/app/app.ts` - Root component
- `src/app/app.config.ts` - Application configuration
- `src/styles.scss` - Global styles with Material + Tailwind setup

### Configuration Files

- `angular.json` - Angular CLI configuration
- `tsconfig.json` - TypeScript configuration with strict settings
- `tailwind.config.js` - TailwindCSS configuration
- `package.json` - Dependencies and npm scripts

### AI Assistant Guidelines

This project includes identical coding standards in:

- `.claude/CLAUDE.md` - Claude AI assistant rules
- `.github/copilot-instructions.md` - GitHub Copilot rules
- `.junie/guidelines.md` - Junie AI assistant rules

All AI assistants should follow the Angular and TypeScript best practices
defined in these files, emphasizing modern Angular patterns, signals-based state
management, and strict TypeScript usage.
