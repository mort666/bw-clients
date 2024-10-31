import { LogMeOnceCsvImporter } from "../src/importers/logmeonce-csv-importer";
import { ImportResult } from "../src/models/import-result";

import { data as logmeonceData2 } from "./test-data/logmeonce-csv/logmeonce.test.invalidRow.csv";
import { data as logmeonceData6 } from "./test-data/logmeonce-csv/logmeonce.test.invalidUrl.csv";
import { data as logmeonceData5 } from "./test-data/logmeonce-csv/logmeonce.test.missingName.csv";
import { data as logmeonceData4 } from "./test-data/logmeonce-csv/logmeonce.test.mixedData.csv";
import { data as logmeonceData3 } from "./test-data/logmeonce-csv/logmeonce.test.multipleEntries.csv";
import { data as logmeonceData } from "./test-data/logmeonce-csv/logmeonce.test.validData.csv";

describe("LogMeOnceCsvImporter", () => {
  let importer: LogMeOnceCsvImporter;

  beforeEach(() => {
    importer = new LogMeOnceCsvImporter();
  });

  it("should return success false if CSV data is null", async () => {
    try {
      const result: ImportResult = await importer.parse(null);
      expect(result.success).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(TypeError);
      expect(error.message).toMatch(/Cannot read properties of null/);
    }
  });

  it("should return success false if CSV data is empty", async () => {
    const result: ImportResult = await importer.parse("");
    expect(result.success).toBe(false);
  });

  it("should parse valid CSV data correctly", async () => {
    const result = await importer.parse(logmeonceData);
    expect(result.success).toBe(true);
    expect(result.ciphers.length).toBe(1);
    const cipher = result.ciphers[0];
    expect(cipher.name).toBe("Example");
    expect(cipher.login.uris[0].uri).toBe("https://example.com");
    expect(cipher.notes).toBe("Some notes");
    expect(cipher.login.username).toBe("user@example.com");
    expect(cipher.login.password).toBe("password123");
  });

  it("should skip rows with insufficient columns", async () => {
    const result = await importer.parse(logmeonceData2);
    expect(result.success).toBe(true);
    expect(result.ciphers.length).toBe(1);
    const cipher = result.ciphers[0];
    expect(cipher.name).toBe("Example");
  });

  it("should handle CSV data with multiple entries", async () => {
    const result = await importer.parse(logmeonceData3);
    expect(result.success).toBe(true);
    expect(result.ciphers.length).toBe(2);
    expect(result.ciphers[0].name).toBe("Example1");
    expect(result.ciphers[1].name).toBe("Example2");
  });

  it("should handle CSV data with multiple entries and invalid rows", async () => {
    const result = await importer.parse(logmeonceData4);
    expect(result.success).toBe(true);
    expect(result.ciphers.length).toBe(2);
    expect(result.ciphers[0].name).toBe("Example1");
    expect(result.ciphers[1].name).toBe("Example2");
  });

  it("should use default values for missing columns", async () => {
    const result = await importer.parse(logmeonceData5);
    expect(result.success).toBe(true);
    expect(result.ciphers.length).toBe(1);
    const cipher = result.ciphers[0];
    expect(cipher.name).toBe("--");
  });

  it("should handle invalid URLs gracefully", async () => {
    const result = await importer.parse(logmeonceData6);
    expect(result.success).toBe(true);
    expect(result.ciphers.length).toBe(1);
    const cipher = result.ciphers[0];
    expect(cipher.login.uris[0].uri).toBe("invalid-url");
  });
});
