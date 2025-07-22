# Project Structure

## Root Organization

This is an Nx monorepo with a clear separation between applications and shared libraries.

```
├── apps/                    # Client applications
├── libs/                    # Shared libraries and components
├── bitwarden_license/       # Enterprise/licensed features
├── scripts/                 # Build and utility scripts
└── coverage/                # Test coverage reports
```

## Applications (`apps/` & `bitwarden_license/`)

- **`browser/`**: Browser extension (Chrome, Firefox, Edge, Opera, Safari)
- **`web/`**: Web vault application
- **`bit-web/`**: Bitwarden licensed portions of the web vault
- **`desktop/`**: Electron-based desktop application
- **`cli/`**: Command-line interface tool

Each app has its own:

- `src/` - Source code
- `package.json` - App-specific dependencies
- `tsconfig.json` - TypeScript configuration
- `jest.config.js` - Test configuration
- `webpack.config.js` - Build configuration (where applicable)

## Shared Libraries (`libs/`)

### Core Libraries

- **`common/`**: Core business logic and models
- **`platform/`**: Platform abstractions and services
- **`components/`**: Reusable UI components
- **`angular/`**: Angular-specific utilities and services

### Domain Libraries

- **`auth/`**: Authentication and identity management
- **`vault/`**: Password vault functionality
- **`admin-console/`**: Organization and admin features
- **`billing/`**: Payment and subscription management
- **`key-management/`**: Cryptographic key handling
- **`tools/`**: Generator, import/export, and other tools

### Infrastructure Libraries

- **`node/`**: Node.js specific implementations
- **`importer/`**: Data import functionality
- **`eslint/`**: Custom ESLint rules and configurations

## Licensed Features (`bitwarden_license/`)

Enterprise and business features with separate licensing:

- **`bit-common/`**: Licensed common functionality
- **`bit-web/`**: Licensed web features
- **`bit-cli/`**: Licensed CLI features

## Import Restrictions

The project enforces strict import boundaries:

- Apps cannot import from other apps
- `libs/common/` is the base layer - minimal external dependencies
- Domain libraries have controlled dependencies on each other
- Licensed code is isolated from open-source code

## Path Aliases

TypeScript path mapping is configured in `tsconfig.base.json`:

- `@bitwarden/common/*` → `libs/common/src/*`
- `@bitwarden/auth/common` → `libs/auth/src/common`
- `@bitwarden/components` → `libs/components/src`
- And many more for clean imports across the monorepo

## Configuration Files

- **`nx.json`**: Nx workspace configuration
- **`angular.json`**: Angular CLI project definitions
- **`tsconfig.base.json`**: Base TypeScript configuration
- **`jest.config.js`**: Root Jest configuration with project references
- **`eslint.config.mjs`**: ESLint configuration with import restrictions
