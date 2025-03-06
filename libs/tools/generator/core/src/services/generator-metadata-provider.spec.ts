import { mock } from "jest-mock-extended";
import { BehaviorSubject } from "rxjs";

import { PolicyService } from "@bitwarden/common/admin-console/abstractions/policy/policy.service.abstraction";
import { Account } from "@bitwarden/common/auth/abstractions/account.service";
import { LegacyEncryptorProvider } from "@bitwarden/common/tools/cryptography/legacy-encryptor-provider";
import { UserEncryptor } from "@bitwarden/common/tools/cryptography/user-encryptor.abstraction";
import { ExtensionMetadata, ExtensionSite, Site, SiteId, SiteMetadata } from "@bitwarden/common/tools/extension"
import { ExtensionService } from "@bitwarden/common/tools/extension/extension.service";
import { Bitwarden } from "@bitwarden/common/tools/extension/vendor/bitwarden";
import { disabledSemanticLoggerProvider } from "@bitwarden/common/tools/log";
import { SystemServiceProvider } from "@bitwarden/common/tools/providers";
import { UserStateSubject } from "@bitwarden/common/tools/state/user-state-subject";
import { UserStateSubjectDependencyProvider } from "@bitwarden/common/tools/state/user-state-subject-dependency-provider";
import { UserId } from "@bitwarden/common/types/guid";

import { FakeAccountService, FakeStateProvider } from "../../../../../common/spec";
import { Algorithm, AlgorithmsByType, Profile, Type, Types } from "../metadata";
import password from "../metadata/password/random-password";

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

const SomeSiteId: SiteId = Site.forwarder;

const SomeSite: SiteMetadata = Object.freeze({
  id: SomeSiteId,
  availableFields: [],
});

const ApplicationProvider = {
  /** Policy configured by the administrative console */
  policy: mock<PolicyService>(),

  /** Client extension metadata and profile access */
  extension: mock<ExtensionService>({
    site: () => new ExtensionSite(SomeSite, new Map())
  }),

  /** Event monitoring and diagnostic interfaces */
  log: disabledSemanticLoggerProvider,
}  as SystemServiceProvider;

describe("GeneratorMetadataProvider", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe("metadata", () => {
    it("returns algorithm metadata", async () => {
      const provider = new GeneratorMetadataProvider(SystemProvider, ApplicationProvider, [password]);

      const metadata = provider.metadata(password.id);

      expect(metadata).toEqual(password);
    });

    it("returns forwarder metadata", async () => {
      const extensionMetadata : ExtensionMetadata = {
        site: SomeSite,
        product: { vendor: Bitwarden },
        host: { authentication: true, selfHost: "maybe", baseUrl: "https://www.example.com" },
        requestedFields: []
      }
      const application = {
        ...ApplicationProvider,
        extension: mock<ExtensionService>({
          site: () => new ExtensionSite(SomeSite, new Map([[Bitwarden.id, extensionMetadata]]))
        })
      };
      const provider = new GeneratorMetadataProvider(SystemProvider, application, []);

      const metadata = provider.metadata({ forwarder: Bitwarden.id });

      expect(metadata.id).toEqual({ forwarder: Bitwarden.id });
    });

    it("panics when metadata not found", async () => {
      const provider = new GeneratorMetadataProvider(SystemProvider, ApplicationProvider, []);

      expect(() => provider.metadata("not found" as any)).toThrow("metadata not found");
    });

    it("panics when an extension not found", async () => {
      const provider = new GeneratorMetadataProvider(SystemProvider, ApplicationProvider, []);

      expect(() => provider.metadata({ forwarder: "not found" as any })).toThrow("extension not found");
    });
  });

  describe("types", () => {
    it("returns the credential types", async () => {
      const provider = new GeneratorMetadataProvider(SystemProvider, ApplicationProvider, []);

      const result = provider.types();

      expect(result).toEqual(expect.arrayContaining(Types));
    });
  });

  describe("algorithms", () => {
    it("returns the password category's algorithms", () => {
      const provider = new GeneratorMetadataProvider(SystemProvider, ApplicationProvider, []);

      const result = provider.algorithms({ category: Type.password });

      expect(result).toEqual(expect.arrayContaining(AlgorithmsByType[Type.password]));
    });

    it("returns the username category's algorithms", () => {
      const provider = new GeneratorMetadataProvider(SystemProvider, ApplicationProvider, []);

      const result = provider.algorithms({ category: Type.username });

      expect(result).toEqual(expect.arrayContaining(AlgorithmsByType[Type.username]));
    });

    it("returns the email category's algorithms", () => {
      const provider = new GeneratorMetadataProvider(SystemProvider, ApplicationProvider, []);

      const result = provider.algorithms({ category: Type.email });

      expect(result).toEqual(expect.arrayContaining(AlgorithmsByType[Type.email]));
    });

    it("includes forwarder vendors in the email category's algorithms", () => {
      const extensionMetadata : ExtensionMetadata = {
        site: SomeSite,
        product: { vendor: Bitwarden },
        host: { authentication: true, selfHost: "maybe", baseUrl: "https://www.example.com" },
        requestedFields: []
      }
      const application = {
        ...ApplicationProvider,
        extension: mock<ExtensionService>({
          site: () => new ExtensionSite(SomeSite, new Map([[Bitwarden.id, extensionMetadata]]))
        })
      };
      const provider = new GeneratorMetadataProvider(SystemProvider, application, []);

      const result = provider.algorithms({ category: Type.email });

      expect(result).toEqual(expect.arrayContaining([{ forwarder: Bitwarden.id }]))
    });

    it.each([
      [Algorithm.catchall],
      [Algorithm.passphrase],
      [Algorithm.password],
      [Algorithm.plusAddress],
      [Algorithm.username],
    ])("returns explicit algorithms (=%p)", (algorithm) => {
      const provider = new GeneratorMetadataProvider(SystemProvider, ApplicationProvider, []);

      const result = provider.algorithms({ algorithm });

      expect(result).toEqual([algorithm]);
    });

    it("returns explicit forwarders", () => {
      const extensionMetadata : ExtensionMetadata = {
        site: SomeSite,
        product: { vendor: Bitwarden },
        host: { authentication: true, selfHost: "maybe", baseUrl: "https://www.example.com" },
        requestedFields: []
      }
      const application = {
        ...ApplicationProvider,
        extension: mock<ExtensionService>({
          site: () => new ExtensionSite(SomeSite, new Map([[Bitwarden.id, extensionMetadata]]))
        })
      };
      const provider = new GeneratorMetadataProvider(SystemProvider, application, []);

      const result = provider.algorithms({ algorithm: { forwarder: Bitwarden.id } });

      expect(result).toEqual(expect.arrayContaining([{ forwarder: Bitwarden.id }]))
    });

    it("returns an empty array when the algorithm is invalid", () => {
      const provider = new GeneratorMetadataProvider(SystemProvider, ApplicationProvider, []);

      // `any` cast required because this test subverts the type system
      const result = provider.algorithms({ algorithm: "an invalid algorithm" as any });

      expect(result).toEqual([]);
    });

    it("returns an empty array when the forwarder is invalid", () => {
      const extensionMetadata : ExtensionMetadata = {
        site: SomeSite,
        product: { vendor: Bitwarden },
        host: { authentication: true, selfHost: "maybe", baseUrl: "https://www.example.com" },
        requestedFields: []
      }
      const application = {
        ...ApplicationProvider,
        extension: mock<ExtensionService>({
          site: () => new ExtensionSite(SomeSite, new Map([[Bitwarden.id, extensionMetadata]]))
        })
      };
      const provider = new GeneratorMetadataProvider(SystemProvider, application, []);

      // `any` cast required because this test subverts the type system
      const result = provider.algorithms({ algorithm: { forwarder: "an invalid forwarder" as any } });

      expect(result).toEqual([])
    });

    it("panics when neither an algorithm nor a category is specified", () => {
      const provider = new GeneratorMetadataProvider(SystemProvider, ApplicationProvider, []);

      // `any` cast required because this test subverts the type system
      expect(() => provider.algorithms({} as any)).toThrow('algorithm or category required');
    });
  });

  describe("preference$", () => {
    it("", async () => {

    });

    it("", async () => {

    });

    it("", async () => {

    });

    it("", async () => {

    });

    it("", async () => {

    });

    it("", async () => {

    });
  });

  describe("algorithm$", () => {
    it("", async () => {

    });

    it("", async () => {

    });

    it("", async () => {

    });

    it("", async () => {

    });

    it("", async () => {

    });

    it("", async () => {

    });
  });

  describe("preferences", () => {
    it("returns a user state subject", () => {
      const provider = new GeneratorMetadataProvider(SystemProvider, ApplicationProvider, []);

      const subject = provider.preferences({ account$: SomeAccount$ });

      expect(subject).toBeInstanceOf(UserStateSubject);
    });
  });
});
