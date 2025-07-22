# Technology Stack

## Build System & Tooling

- **Webpack**: Module bundler for browser extension and desktop apps
- **TypeScript**: Primary language (ES2016 target, ES2020 modules)
- **Node.js**: Runtime requirement (~22) with npm (~10)

## Frontend Frameworks

- **Angular 19**: Primary framework for web, desktop, and browser popup
- **Lit**: Web components library for some UI elements
- **Tailwind CSS**: Utility-first CSS framework

## Testing & Quality

- **Jest**: Testing framework with coverage reporting
- **ESLint**: Code linting with TypeScript and Angular rules
- **Prettier**: Code formatting
- **Husky**: Git hooks for pre-commit checks
- **Storybook**: Component development and documentation

## Key Dependencies

- **Electron**: Desktop app framework
- **RxJS**: Reactive programming

## Common Commands

```bash
# Install dependencies
npm install

# Linting and formatting
npm run lint
npm run lint:fix
npm run prettier

# Testing
npm run test
npm run test:watch

# Storybook
npm run storybook

# Type checking
npm run test:types
```

## Development Requirements

- Node.js ~22
- npm ~10
- Angular CLI 19
- TypeScript 5.5+
