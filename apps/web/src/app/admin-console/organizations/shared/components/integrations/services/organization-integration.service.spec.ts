import { TestBed } from "@angular/core/testing";
import { mock } from "jest-mock-extended";

// eslint-disable-next-line no-restricted-imports
import {
  OrganizationIntegrationApiService,
  OrganizationIntegrationConfigurationApiService,
  OrganizationIntegrationConfigurationResponse,
} from "@bitwarden/bit-common/dirt/integrations";
import { EventType } from "@bitwarden/common/enums";

import { OrganizationIntegrationService } from "./organization-integration.service";

describe("OrganizationIntegrationService", () => {
  let service: OrganizationIntegrationService;
  const mockOrgIntegrationApiService = mock<OrganizationIntegrationApiService>();
  const mockOrgIntegrationConfigurationApiService =
    mock<OrganizationIntegrationConfigurationApiService>();

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: OrganizationIntegrationApiService, useValue: mockOrgIntegrationApiService },
        {
          provide: OrganizationIntegrationConfigurationApiService,
          useValue: mockOrgIntegrationConfigurationApiService,
        },
      ],
    });
    service = TestBed.inject(OrganizationIntegrationService);
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });

  describe("saveHec", () => {
    const organizationId = "org-123" as any;
    const serviceName = "splunk";
    const hecConfiguration = { toString: () => '{"token":"abc"}' } as any;
    const hecConfigurationTemplate = { toString: () => '{"service":"splunk"}' } as any;

    beforeEach(() => {
      mockOrgIntegrationApiService.getOrganizationIntegrations.mockReset();
      mockOrgIntegrationConfigurationApiService.getOrganizationIntegrationConfigurations.mockReset();
      jest.clearAllMocks();
    });

    it("should save HEC integration and configuration successfully", async () => {
      const integrationResponse = { id: "int-1", type: "Hec" } as any;
      const configurationResponse = { id: "conf-1", template: '{"service":"splunk"}' } as any;

      jest.spyOn(service, "saveHecIntegration").mockResolvedValue(integrationResponse);
      jest
        .spyOn(service, "saveHecIntegrationConfiguration")
        .mockResolvedValue(configurationResponse);

      const result = await service.saveHec(
        organizationId,
        serviceName,
        hecConfiguration,
        hecConfigurationTemplate,
      );

      expect(service.saveHecIntegration).toHaveBeenCalledWith(organizationId, hecConfiguration);
      expect(service.saveHecIntegrationConfiguration).toHaveBeenCalledWith(
        organizationId,
        integrationResponse.id,
        serviceName,
        hecConfigurationTemplate,
      );
      expect(result).toEqual({
        integration: integrationResponse,
        configuration: configurationResponse,
      });
    });

    it("should throw error if integrationResponse.id is missing", async () => {
      const integrationResponse = { type: "Hec" } as any;
      jest.spyOn(service, "saveHecIntegration").mockResolvedValue(integrationResponse);

      await expect(
        service.saveHec(organizationId, serviceName, hecConfiguration, hecConfigurationTemplate),
      ).rejects.toThrow("Failed to save HEC integration");
    });

    it("should throw error if configurationResponse.id is missing", async () => {
      const integrationResponse = { id: "int-1", type: "Hec" } as any;
      const configurationResponse = { template: '{"service":"splunk"}' } as any;

      jest.spyOn(service, "saveHecIntegration").mockResolvedValue(integrationResponse);
      jest
        .spyOn(service, "saveHecIntegrationConfiguration")
        .mockResolvedValue(configurationResponse);

      await expect(
        service.saveHec(organizationId, serviceName, hecConfiguration, hecConfigurationTemplate),
      ).rejects.toThrow("Failed to save HEC integration configuration");
    });
  });

  describe("convertToJson", () => {
    it("should parse valid JSON string and return object", () => {
      const jsonString = '{"foo":"bar","num":42}';
      const result = service.convertToJson<{ foo: string; num: number }>(jsonString);
      expect(result).toEqual({ foo: "bar", num: 42 });
    });

    it("should return null for invalid JSON string", () => {
      const invalidJson = '{"foo":bar}';
      const result = service.convertToJson<any>(invalidJson);
      expect(result).toBeNull();
    });

    it("should return null for empty string", () => {
      const result = service.convertToJson<any>("");
      expect(result).toBeNull();
    });

    it("should parse JSON arrays", () => {
      const jsonString = "[1,2,3]";
      const result = service.convertToJson<number[]>(jsonString);
      expect(result).toEqual([1, 2, 3]);
    });

    it("should parse JSON boolean", () => {
      const jsonString = "true";
      const result = service.convertToJson<boolean>(jsonString);
      expect(result).toBe(true);
    });

    it("should parse JSON number", () => {
      const jsonString = "123";
      const result = service.convertToJson<number>(jsonString);
      expect(result).toBe(123);
    });

    it("should parse JSON null", () => {
      const jsonString = "null";
      const result = service.convertToJson<any>(jsonString);
      expect(result).toBeNull();
    });
  });

  describe("deleteHecIntegrationConfiguration", () => {
    const organizationId = "org-123" as any;
    const integrationId = "int-1" as any;
    const serviceName = "splunk";

    let mockConfig: any;

    beforeEach(() => {
      mockConfig = { id: "conf-1", template: '{"service":"splunk"}' };

      jest.resetAllMocks();

      // Set up integrationConfigurations$ with a matching config/template
      service["integrationConfigurations$"].next([
        {
          integrationId,
          configurationResponses: [mockConfig],
        },
      ]);

      jest.spyOn(service, "convertToJson").mockImplementation((json: string) => {
        try {
          return JSON.parse(json);
        } catch {
          return null;
        }
      });
    });

    it("should delete configuration when config and template exist", async () => {
      mockOrgIntegrationConfigurationApiService.deleteOrganizationIntegrationConfiguration.mockResolvedValue(
        undefined,
      );

      await service.deleteHecIntegrationConfiguration(organizationId, integrationId, serviceName);

      expect(
        mockOrgIntegrationConfigurationApiService.deleteOrganizationIntegrationConfiguration,
      ).toHaveBeenCalledWith(organizationId, integrationId, mockConfig.id);

      // The configurationResponses should be filtered (removed)
      const updatedConfigs = service["integrationConfigurations$"].value.find(
        (c) => c.integrationId === integrationId,
      );
      expect(updatedConfigs?.configurationResponses).toEqual([]);
    });

    it("should do nothing if config or template is missing", async () => {
      // Set up with no matching config/template
      service["integrationConfigurations$"].next([
        {
          integrationId,
          configurationResponses: [
            {
              id: "conf-2",
              eventType: EventType.Cipher_AttachmentCreated,
              configuration: "",
              template: '{"service":"other"}',
            } as OrganizationIntegrationConfigurationResponse,
          ],
        },
      ]);

      await service.deleteHecIntegrationConfiguration(organizationId, integrationId, serviceName);

      expect(
        mockOrgIntegrationConfigurationApiService.deleteOrganizationIntegrationConfiguration,
      ).not.toHaveBeenCalled();

      // configurationResponses should remain unchanged
      const configs = service["integrationConfigurations$"].value.find(
        (c) => c.integrationId === integrationId,
      );
      expect(configs?.configurationResponses.length).toBe(1);
    });

    it("should do nothing if integrationConfigurations is empty", async () => {
      service["integrationConfigurations$"].next([]);

      await service.deleteHecIntegrationConfiguration(organizationId, integrationId, serviceName);

      expect(
        mockOrgIntegrationConfigurationApiService.deleteOrganizationIntegrationConfiguration,
      ).not.toHaveBeenCalled();
      expect(service["integrationConfigurations$"].value).toEqual([]);
    });
  });

  describe("deleteHecIntegration", () => {
    const organizationId = "org-123" as any;
    const integrationId = "int-1" as any;

    beforeEach(() => {
      jest.clearAllMocks();
      service["integrations$"].next([
        { id: integrationId, type: "Hec", configuration: "{}", service: "splunk" } as any,
        { id: "int-2", type: "Other", configuration: "{}" } as any,
      ]);
    });

    it("should call deleteOrganizationIntegration and remove integration from store", async () => {
      mockOrgIntegrationApiService.deleteOrganizationIntegration.mockResolvedValue(undefined);

      await service.deleteHecIntegration(organizationId, integrationId);

      expect(mockOrgIntegrationApiService.deleteOrganizationIntegration).toHaveBeenCalledWith(
        organizationId,
        integrationId,
      );
      const remainingIntegrations = service["integrations$"].value;
      expect(remainingIntegrations).toEqual([{ id: "int-2", type: "Other", configuration: "{}" }]);
    });

    it("should not throw if integration does not exist", async () => {
      mockOrgIntegrationApiService.deleteOrganizationIntegration.mockResolvedValue(undefined);
      service["integrations$"].next([{ id: "int-2", type: "Other", configuration: "{}" } as any]);

      await expect(
        service.deleteHecIntegration(organizationId, integrationId),
      ).resolves.not.toThrow();
      expect(service["integrations$"].value).toEqual([
        { id: "int-2", type: "Other", configuration: "{}" },
      ]);
    });

    it("should handle empty integrations list", async () => {
      mockOrgIntegrationApiService.deleteOrganizationIntegration.mockResolvedValue(undefined);
      service["integrations$"].next([]);

      await expect(
        service.deleteHecIntegration(organizationId, integrationId),
      ).resolves.not.toThrow();
      expect(service["integrations$"].value).toEqual([]);
    });
  });

  describe("deleteHec", () => {
    const organizationId = "org-123" as any;
    const hecConfiguration = { service: "splunk", toString: () => '{"service":"splunk"}' } as any;
    const hecConfigurationTemplate = {
      service: "splunk",
      toString: () => '{"service":"splunk"}',
    } as any;
    const integrationId = "int-1";

    beforeEach(() => {
      jest.clearAllMocks();
      // Set up integrations$ with a matching Hec integration
      service["integrations$"].next([
        { id: integrationId, type: "Hec", configuration: '{"service":"splunk"}' } as any,
      ]);
      // Spy on getIntegration to return the expected integration
      jest.spyOn(service as any, "getIntegration").mockReturnValue({
        id: integrationId,
        type: "Hec",
        configuration: '{"service":"splunk"}',
      });
    });

    it("should delete HEC integration configuration and then integration", async () => {
      const deleteConfigSpy = jest
        .spyOn(service, "deleteHecIntegrationConfiguration")
        .mockResolvedValue(undefined);
      const deleteIntegrationSpy = jest
        .spyOn(service, "deleteHecIntegration")
        .mockResolvedValue(undefined);

      await service.deleteHec(organizationId, hecConfiguration, hecConfigurationTemplate);

      expect(deleteConfigSpy).toHaveBeenCalledWith(
        organizationId,
        integrationId,
        hecConfigurationTemplate.service,
      );
      expect(deleteIntegrationSpy).toHaveBeenCalledWith(organizationId, integrationId);
    });

    it("should handle errors thrown by deleteHecIntegrationConfiguration", async () => {
      jest
        .spyOn(service, "deleteHecIntegrationConfiguration")
        .mockRejectedValue(new Error("Config error"));
      jest.spyOn(service, "deleteHecIntegration").mockResolvedValue(undefined);

      await expect(
        service.deleteHec(organizationId, hecConfiguration, hecConfigurationTemplate),
      ).rejects.toThrow("Config error");
    });

    it("should handle errors thrown by deleteHecIntegration", async () => {
      jest.spyOn(service, "deleteHecIntegrationConfiguration").mockResolvedValue(undefined);
      jest.spyOn(service, "deleteHecIntegration").mockRejectedValue(new Error("Integration error"));

      await expect(
        service.deleteHec(organizationId, hecConfiguration, hecConfigurationTemplate),
      ).rejects.toThrow("Integration error");
    });
  });
});
