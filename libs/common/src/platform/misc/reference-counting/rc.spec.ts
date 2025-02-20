// Temporary workaround for Symbol.dispose
// remove when https://github.com/jestjs/jest/issues/14874 is resolved and *released*
const disposeSymbol: unique symbol = Symbol("Symbol.dispose");
const asyncDisposeSymbol: unique symbol = Symbol("Symbol.asyncDispose");
(Symbol as any).asyncDispose ??= asyncDisposeSymbol as unknown as SymbolConstructor["asyncDispose"];
(Symbol as any).dispose ??= disposeSymbol as unknown as SymbolConstructor["dispose"];

// Import needs to be after the workaround
import { Rc } from "./rc";

export class FreeableTestValue {
  isFreed = false;

  free() {
    this.isFreed = true;
  }
}

describe("Rc", () => {
  let value: FreeableTestValue;
  let rc: Rc<FreeableTestValue>;

  beforeEach(() => {
    value = new FreeableTestValue();
    rc = new Rc(value);
  });

  describe("use", () => {
    describe("given Rc has not been marked for disposal", () => {
      describe("given callback is synchronous", () => {
        it("calls the callback", () => {
          const spy = jest.fn();

          rc.use(() => {
            spy();
          });

          expect(spy).toHaveBeenCalled();
        });

        it("provides value in callback", () => {
          rc.use((v) => {
            expect(v).toBe(value);
          });
        });

        it("increases refCount while value is in use", () => {
          rc.use(() => {
            expect(rc["refCount"]).toBe(1);
          });

          expect(rc["refCount"]).toBe(0);
        });

        it("does not free value when refCount reaches 0 when not marked for disposal", () => {
          rc.use(() => {});

          expect(value.isFreed).toBe(false);
        });

        it("frees value directly when marked for disposal if refCount is 0", () => {
          rc.use(() => {});

          rc.markForDisposal();

          expect(value.isFreed).toBe(true);
        });

        it("frees value after refCount reaches 0 when rc is marked for disposal while in use", () => {
          rc.use(() => {
            rc.markForDisposal();
            expect(value.isFreed).toBe(false);
          });

          expect(value.isFreed).toBe(true);
        });

        it("throws error when trying to take a disposed reference", () => {
          rc.markForDisposal();

          expect(() => rc.use(() => {})).toThrow();
        });
      });

      describe("given callback is asynchronous", () => {
        it("awaits the callback", async () => {
          const spy = jest.fn();

          await rc.use(async () => {
            await new Promise((resolve) => setTimeout(resolve, 5));
            spy();
          });

          expect(spy).toHaveBeenCalled();
        });

        it("provides value in callback", async () => {
          await rc.use(async (v) => {
            expect(v).toBe(value);
          });
        });

        it("increases refCount while value is in use", async () => {
          let resolveCallback: () => void;
          const promise = new Promise<void>((resolve) => {
            resolveCallback = resolve;
          });

          const usePromise = rc.use(async () => {
            await new Promise((resolve) => setTimeout(resolve, 5));
            await promise;
          });

          // should be 1 because the callback has not resolved yet
          expect(rc["refCount"]).toBe(1);

          resolveCallback();
          await usePromise;

          // should be 0 because the callback has resolved
          expect(rc["refCount"]).toBe(0);
        });

        it("does not free value when refCount reaches 0 when not marked for disposal", async () => {
          await rc.use(async () => {
            await new Promise((resolve) => setTimeout(resolve, 5));
          });

          expect(value.isFreed).toBe(false);
        });

        it("frees value directly when marked for disposal if refCount is 0", async () => {
          await rc.use(async () => {});

          rc.markForDisposal();

          expect(value.isFreed).toBe(true);
        });

        it("frees value after refCount reaches 0 when rc is marked for disposal while in use", async () => {
          let resolveCallback: () => void;
          const promise = new Promise<void>((resolve) => {
            resolveCallback = resolve;
          });

          const usePromise = rc.use(async () => {
            await new Promise((resolve) => setTimeout(resolve, 5));
            await promise;
          });

          rc.markForDisposal();

          // should not be freed yet because the callback has not resolved
          expect(value.isFreed).toBe(false);

          resolveCallback();
          await usePromise;

          // should be freed because the callback has resolved
          expect(value.isFreed).toBe(true);
        });

        it("throws error when trying to take a disposed reference", async () => {
          rc.markForDisposal();

          await expect(async () => await rc.use(async () => {})).rejects.toThrow();
        });
      });
    });
  });

  it("should increase refCount when taken", () => {
    rc.take();

    expect(rc["refCount"]).toBe(1);
  });

  it("should return value on take", () => {
    // eslint-disable-next-line @bitwarden/platform/required-using
    const reference = rc.take();

    expect(reference.value).toBe(value);
  });

  it("should decrease refCount when disposing reference", () => {
    // eslint-disable-next-line @bitwarden/platform/required-using
    const reference = rc.take();

    reference[Symbol.dispose]();

    expect(rc["refCount"]).toBe(0);
  });

  it("should automatically decrease refCount when reference goes out of scope", () => {
    {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      using reference = rc.take();
    }

    expect(rc["refCount"]).toBe(0);
  });

  it("should not free value when refCount reaches 0 if not marked for disposal", () => {
    // eslint-disable-next-line @bitwarden/platform/required-using
    const reference = rc.take();

    reference[Symbol.dispose]();

    expect(value.isFreed).toBe(false);
  });

  it("should free value when refCount reaches 0 and rc is marked for disposal", () => {
    // eslint-disable-next-line @bitwarden/platform/required-using
    const reference = rc.take();
    rc.markForDisposal();

    reference[Symbol.dispose]();

    expect(value.isFreed).toBe(true);
  });

  it("should free value when marked for disposal if refCount is 0", () => {
    // eslint-disable-next-line @bitwarden/platform/required-using
    const reference = rc.take();
    reference[Symbol.dispose]();

    rc.markForDisposal();

    expect(value.isFreed).toBe(true);
  });

  it("should throw error when trying to take a disposed reference", () => {
    rc.markForDisposal();

    expect(() => rc.take()).toThrow();
  });
});
