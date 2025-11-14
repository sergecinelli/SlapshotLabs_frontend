# HockeyBaseballApp

A modern web application built with Angular 20, featuring a responsive UI with Angular Material and TailwindCSS.

## Tech Stack

- **Framework:** Angular 20.3.4
- **UI Components:** Angular Material 20.2.8
- **Styling:** TailwindCSS 3.4.17 with PostCSS and Autoprefixer
- **Language:** TypeScript 5.9.2
- **State Management:** RxJS 7.8.0
- **Server:** Express.js 4.18.2
- **Code Quality:** ESLint 9.35.0, Prettier 3.6.2
- **Testing:** Jasmine 5.9.0, Karma 6.4.0

## Project Structure

```
hockey-baseball-app/
├── src/
│   ├── app/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Page-level components
│   │   ├── services/        # Business logic and API services
│   │   ├── interceptors/    # HTTP interceptors
│   │   ├── shared/          # Shared utilities and models
│   │   ├── app.component.*  # Root component
│   │   ├── app.config.ts    # Application configuration
│   │   └── app.routes.ts    # Route definitions
│   ├── assets/              # Static assets (images, fonts, etc.)
│   ├── environments/        # Environment-specific configs
│   ├── index.html           # Main HTML file
│   ├── main.ts              # Application entry point
│   └── styles.scss          # Global styles
├── dist/                    # Build output directory
├── server.js                # Express server for production
├── angular.json             # Angular CLI configuration
├── tailwind.config.js       # TailwindCSS configuration
├── tsconfig.json            # TypeScript configuration
├── package.json             # Dependencies and scripts
└── render.yaml              # Deployment configuration
```

## Getting Started

### Prerequisites

- Node.js (LTS version recommended)
- npm (comes with Node.js)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd hockey-baseball-app
```

2. Install dependencies:
```bash
npm install
```

## Development

### Development Server

Start the local development server:

```bash
npm start
```

Navigate to `http://localhost:4200/`. The application will automatically reload when you modify source files.

### Code Scaffolding

Generate new components, services, and other Angular artifacts:

```bash
# Generate a new component
ng generate component components/my-component

# Generate a new service
ng generate service services/my-service

# Generate a new page
ng generate component pages/my-page

# View all available schematics
ng generate --help
```

### Code Quality

#### Linting

Run ESLint to check for code quality issues:

```bash
npm run lint
```

#### Formatting

Format code with Prettier:

```bash
# Format all files
npm run format

# Check formatting without modifying files
npm run format:check
```

## Building

### Development Build

Build the project for development:

```bash
npm run build
```

### Production Build

Build the project with production optimizations:

```bash
npm run build:prod
```

Build artifacts will be stored in the `dist/hockey-baseball-app/browser/` directory. The production build includes:
- Code minification
- Tree shaking
- Ahead-of-Time (AOT) compilation
- Performance optimizations

### Watch Mode

Build and watch for changes:

```bash
npm run watch
```

## Testing

### Unit Tests

Run unit tests with Karma:

```bash
npm test
```

Tests are written using Jasmine and executed in Chrome via Karma.

## Deployment

### Production Server

After building for production, start the Express server:

```bash
npm run build:prod
npm run start:server
```

The server will run on `http://localhost:3000` (or the port specified in the `PORT` environment variable).

### Docker

Build and run with Docker:

```bash
# Build the Docker image
docker build -t hockey-baseball-app .

# Run the container
docker run -p 3000:3000 hockey-baseball-app
```

## Component Library

This project uses **Angular Material** as the primary UI component library, which provides:

- Pre-built, accessible components following Material Design principles
- Components used: buttons, cards, forms, dialogs, navigation, tables, and more
- Theming support with customizable color palettes
- Responsive design with Angular CDK (Component Dev Kit)

**TailwindCSS** is used for:
- Utility-first styling
- Custom layouts and spacing
- Responsive design utilities
- Complementing Angular Material components

## Additional Resources

- [Angular Documentation](https://angular.dev)
- [Angular Material Components](https://material.angular.io/components)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
- [Angular CLI Command Reference](https://angular.dev/tools/cli)

## License

This project is private and proprietary.
