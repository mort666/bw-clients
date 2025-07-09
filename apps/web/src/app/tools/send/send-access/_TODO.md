# trySendAccess Guard Unit Tests - TODO

## Test Structure Overview

The `trySendAccess` guard now includes parameter validation before forwarding to the service. Tests should focus on the guard's coordination logic and parameter validation without testing the service implementation details.

## Required Imports

```typescript
import { TestBed } from "@angular/core/testing";
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from "@angular/router";
import { of } from "rxjs";

import { SystemServiceProvider } from "@bitwarden/common/tools/providers";
import { SemanticLogger } from "@bitwarden/common/tools/log/semantic-logger.abstraction";
import { SYSTEM_SERVICE_PROVIDER } from "@bitwarden/generator-components";

import { SendAccessService } from "./send-access.service";
import { trySendAccess } from "./try-send-access.guard";
```

## Test Cases to Implement

Following Bitwarden naming conventions: `<unit> [given <prerequisite>] <behavior> when <state>`

### Test Structure:

```typescript
describe("trySendAccess", () => {
  describe("canActivate", () => {
    // Parameter validation tests
    describe("given valid route parameters", () => {
      // Test cases for valid parameters
    });

    describe("given invalid route parameters", () => {
      // Test cases for parameter validation failures
    });

    describe("given service interactions", () => {
      // Test cases for service method calls
    });

    describe("given error scenarios", () => {
      // Test cases for error handling
    });
  });
});
```

### 1. Parameter Validation Tests

#### Valid Parameters:

- [ ] `extracts sendId and key from route params when both are valid strings`
- [ ] `does not throw validation errors when sendId and key are valid strings`

#### Invalid sendId:

- [ ] `logs warning with correct message when sendId is undefined`
- [ ] `logs warning with correct message when sendId is null`
- [ ] `logs panic with expected/actual type info when sendId is a number`
- [ ] `logs panic with expected/actual type info when sendId is an object`
- [ ] `logs panic with expected/actual type info when sendId is a boolean`
- [ ] `throws when sendId is not a string`

#### Invalid key:

- [ ] `logs panic with correct message when key is undefined`
- [ ] `logs panic with correct message when key is null`
- [ ] `logs panic with expected/actual type info when key is a number`
- [ ] `logs panic with expected/actual type info when key is an object`
- [ ] `logs panic with expected/actual type info when key is a boolean`
- [ ] `throws when key is not a string`

### 2. Service Integration Tests

#### Method Calls:

- [ ] `calls setContext with extracted sendId and key when parameters are valid`
- [ ] `calls redirect$ with extracted sendId when setContext completes`

### 3. Observable Behavior Tests

#### Success Path:

- [ ] `returns redirect$ emissions when setContext completes successfully`
- [ ] `does not emit setContext values when using ignoreElements`
- [ ] `ensures setContext completes before redirect$ executes (sequencing)`

### 4. Error Handling Tests

- [ ] `does not call redirect$ when setContext rejects`
- [ ] `propagates error to guard return value when redirect$ throws`

## Mock Strategy

### Required Mocks:

- **SendAccessService**:

  - Mock `setContext()` method (returns Promise)
  - Mock `redirect$()` method (returns Observable)

- **SystemServiceProvider**:

  - Mock service with `log()` method
  - Mock logger with `warn()` and `panic()` methods

- **ActivatedRouteSnapshot**:
  - Mock `params` property with various test scenarios
  - Control `sendId` and `key` values for different test cases

### Utility Functions:

Create helper functions to reduce duplication and improve test readability:

```typescript
function createMockRoute(params: Record<string, any>): ActivatedRouteSnapshot {
  return { params } as ActivatedRouteSnapshot;
}

function createMockLogger(): SemanticLogger {
  return {
    warn: jest.fn(),
    panic: jest.fn().mockImplementation(() => {
      throw new Error("Logger panic called");
    }),
  } as SemanticLogger;
}

function createMockSystemServiceProvider(): SystemServiceProvider {
  return {
    log: jest.fn().mockReturnValue(createMockLogger()),
  } as SystemServiceProvider;
}

function createMockSendAccessService(): SendAccessService {
  return {
    setContext: jest.fn().mockResolvedValue(undefined),
    redirect$: jest.fn().mockReturnValue(of({} as UrlTree)),
  } as SendAccessService;
}
```

## Implementation Notes

- Use `TestBed.runInInjectionContext()` to test the functional guard
- Configure TestBed with mocked providers:
  ```typescript
  TestBed.configureTestingModule({
    providers: [
      { provide: SendAccessService, useValue: mockSendAccessService },
      { provide: SYSTEM_SERVICE_PROVIDER, useValue: mockSystemServiceProvider },
    ],
  });
  ```
- Focus on coordination logic, not SendAccessService implementation details
- Verify logging calls with specific parameters using `expect().toHaveBeenCalledWith()`
- For type validation errors, verify the logger receives expected/actual type information
- Test Observable behavior using subscription patterns
- Use utility functions to reduce test duplication and improve readability
- Group related tests using nested `describe` blocks with shared state in `beforeEach`
- Mock return values should be controllable for different test scenarios
- **Use `it.each` for parameter validation tests** to efficiently test multiple invalid types:
  ```typescript
  it.each([
    ["number", 123],
    ["object", {}],
    ["boolean", true],
  ])("logs panic with expected/actual type info when sendId is %s", (type, value) => {
    // Verify logger.panic called with appropriate type information
  });
  ```

## Success Criteria

- All parameter validation scenarios covered with clear state descriptions
- Service integration properly tested without implementation details
- Observable chain behavior verified with proper mocking
- Error handling scenarios tested with appropriate error propagation
- 100% code coverage of guard logic
- Fast, isolated unit tests following Bitwarden naming conventions
- Test names clearly describe unit, state, and expected behavior
