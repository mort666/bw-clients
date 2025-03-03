import { mock } from "jest-mock-extended";
import { BehaviorSubject } from "rxjs";

import { PolicyService } from "@bitwarden/common/admin-console/abstractions/policy/policy.service.abstraction";
import { Account } from "@bitwarden/common/auth/abstractions/account.service";
import { FakeAccountService, FakeStateProvider } from "@bitwarden/common/spec";
import { LegacyEncryptorProvider } from "@bitwarden/common/tools/cryptography/legacy-encryptor-provider";
import { UserEncryptor } from "@bitwarden/common/tools/cryptography/user-encryptor.abstraction";
import { ExtensionService } from "@bitwarden/common/tools/extension/extension.service";
import { disabledSemanticLoggerProvider } from "@bitwarden/common/tools/log";
import { UserStateSubject } from "@bitwarden/common/tools/state/user-state-subject";
import { UserStateSubjectDependencyProvider } from "@bitwarden/common/tools/state/user-state-subject-dependency-provider";
import { UserId } from "@bitwarden/common/types/guid";

import { GeneratorMetadataProvider } from "./generator-metadata-provider";


const SomeUser = "some user" as UserId;
const SomeAccount = {
  id: SomeUser,
  email: "someone@example.com",
  emailVerified: true,
  name: "Someone",
};
const SomeAccount$ = new BehaviorSubject<Account>(SomeAccount);

type TestType = { foo: string };

const SomeEncryptor: UserEncryptor = {
  userId: SomeUser,

  encrypt(secret) {
    const tmp: any = secret;
    return Promise.resolve({ foo: `encrypt(${tmp.foo})` } as any);
  },

  decrypt(secret) {
    const tmp: any = JSON.parse(secret.encryptedString!);
    return Promise.resolve({ foo: `decrypt(${tmp.foo})` } as any);
  },
};

const SomeAccountService = new FakeAccountService({
  [SomeUser]: SomeAccount,
});

const SomeStateProvider = new FakeStateProvider(SomeAccountService);

const SystemProvider = {
  encryptor: {
    userEncryptor$: () => {
      return new BehaviorSubject({ encryptor: SomeEncryptor, userId: SomeUser }).asObservable();
    },
    organizationEncryptor$() {
      throw new Error("`organizationEncryptor$` should never be invoked.");
    },
  } as LegacyEncryptorProvider,
  state: SomeStateProvider,
  log: disabledSemanticLoggerProvider,
} as UserStateSubjectDependencyProvider;

const ApplicationProvider = {
  /** Policy configured by the administrative console */
  policy: mock<PolicyService>(),

  /** Client extension metadata and profile access */
  extension: mock<ExtensionService>(),

  /** Event monitoring and diagnostic interfaces */
  log: disabledSemanticLoggerProvider,
}

describe("GeneratorMetadatProvider", () => {
  describe("algorithms", () => {

  });

  describe("available$", () => {

  });

  describe("algorithm$", () => {

  });

  describe("preferences", () => {
    it("returns a user state subject", () => {
      const metadata = new GeneratorMetadataProvider(SystemProvider, null, null);

      const subject = metadata.preferences({ account$: SomeAccount$ });

      expect(subject).toBeInstanceOf(UserStateSubject);
    });
  });
});
