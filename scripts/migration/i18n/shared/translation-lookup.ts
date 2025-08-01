import * as fs from "fs";

import {
  CombinedTranslations,
  TranslationCombiner,
  TranslationEntry,
} from "./translation-combiner";

/**
 * Service for looking up translations during template migration
 */
export class TranslationLookup {
  private translations: CombinedTranslations = {};
  private combiner: TranslationCombiner;
  private isLoaded = false;

  constructor(private rootPath: string = process.cwd()) {
    this.combiner = new TranslationCombiner(rootPath);
  }

  /**
   * Load translations from combined file or generate them
   */
  async loadTranslations(combinedFilePath?: string): Promise<void> {
    if (combinedFilePath && fs.existsSync(combinedFilePath)) {
      // Load from existing combined file
      const content = fs.readFileSync(combinedFilePath, "utf-8");
      const data = JSON.parse(content);
      this.translations = data.translations || data; // Handle both formats
    } else {
      // Generate combined translations
      const result = this.combiner.combineTranslations();
      this.translations = result.translations;

      // Optionally save the combined file
      if (combinedFilePath) {
        this.combiner.saveCombinedTranslations(result, combinedFilePath);
      }
    }

    this.isLoaded = true;
  }

  /**
   * Get the translated message for a key
   */
  getTranslation(key: string): string | null {
    if (!this.isLoaded) {
      throw new Error("Translations not loaded. Call loadTranslations() first.");
    }

    const entry = this.translations[key];
    return entry ? entry.message : null;
  }

  /**
   * Get the full translation entry for a key
   */
  getTranslationEntry(key: string): TranslationEntry | null {
    if (!this.isLoaded) {
      throw new Error("Translations not loaded. Call loadTranslations() first.");
    }

    return this.translations[key] || null;
  }

  /**
   * Get translation with fallback to key if not found
   */
  getTranslationOrKey(key: string): string {
    const translation = this.getTranslation(key);
    return translation || key;
  }

  /**
   * Check if a translation exists for a key
   */
  hasTranslation(key: string): boolean {
    if (!this.isLoaded) {
      return false;
    }
    return key in this.translations;
  }

  /**
   * Get all available translation keys
   */
  getAllKeys(): string[] {
    if (!this.isLoaded) {
      return [];
    }
    return Object.keys(this.translations).sort();
  }

  /**
   * Get translation statistics
   */
  getStats(): { totalKeys: number; loadedKeys: number; isLoaded: boolean } {
    return {
      totalKeys: Object.keys(this.translations).length,
      loadedKeys: Object.keys(this.translations).length,
      isLoaded: this.isLoaded,
    };
  }

  /**
   * Search for keys or translations containing text
   */
  search(searchText: string): Array<{ key: string; message: string; relevance: number }> {
    if (!this.isLoaded) {
      return [];
    }

    const lowerSearch = searchText.toLowerCase();
    const results: Array<{ key: string; message: string; relevance: number }> = [];

    for (const [key, entry] of Object.entries(this.translations)) {
      let relevance = 0;
      const lowerKey = key.toLowerCase();
      const lowerMessage = entry.message.toLowerCase();

      // Exact key match
      if (lowerKey === lowerSearch) {
        relevance = 100;
      }
      // Key starts with search
      else if (lowerKey.startsWith(lowerSearch)) {
        relevance = 80;
      }
      // Key contains search
      else if (lowerKey.includes(lowerSearch)) {
        relevance = 60;
      }
      // Message starts with search
      else if (lowerMessage.startsWith(lowerSearch)) {
        relevance = 40;
      }
      // Message contains search
      else if (lowerMessage.includes(lowerSearch)) {
        relevance = 20;
      }

      if (relevance > 0) {
        results.push({
          key,
          message: entry.message,
          relevance,
        });
      }
    }

    return results.sort((a, b) => b.relevance - a.relevance);
  }

  /**
   * Validate that required keys exist
   */
  validateKeys(requiredKeys: string[]): { missing: string[]; found: string[] } {
    if (!this.isLoaded) {
      return { missing: requiredKeys, found: [] };
    }

    const missing: string[] = [];
    const found: string[] = [];

    for (const key of requiredKeys) {
      if (this.hasTranslation(key)) {
        found.push(key);
      } else {
        missing.push(key);
      }
    }

    return { missing, found };
  }

  /**
   * Get suggestions for a missing key based on similarity
   */
  getSuggestions(
    key: string,
    maxSuggestions = 5,
  ): Array<{ key: string; message: string; similarity: number }> {
    if (!this.isLoaded) {
      return [];
    }

    const suggestions: Array<{ key: string; message: string; similarity: number }> = [];
    const lowerKey = key.toLowerCase();

    for (const [existingKey, entry] of Object.entries(this.translations)) {
      const similarity = this.calculateSimilarity(lowerKey, existingKey.toLowerCase());

      if (similarity > 0.3) {
        // Only include reasonably similar keys
        suggestions.push({
          key: existingKey,
          message: entry.message,
          similarity,
        });
      }
    }

    return suggestions.sort((a, b) => b.similarity - a.similarity).slice(0, maxSuggestions);
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const matrix: number[][] = [];
    const len1 = str1.length;
    const len2 = str2.length;

    if (len1 === 0) {
      return len2 === 0 ? 1 : 0;
    }
    if (len2 === 0) {
      return 0;
    }

    // Initialize matrix
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1, // deletion
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j - 1] + cost, // substitution
        );
      }
    }

    const maxLen = Math.max(len1, len2);
    return (maxLen - matrix[len1][len2]) / maxLen;
  }
}
