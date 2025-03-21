declare module 'keyword-extractor' {
  interface KeywordExtractorOptions {
    language?: string;
    remove_digits?: boolean;
    return_changed_case?: boolean;
    remove_duplicates?: boolean;
    return_chained_words?: boolean;
  }

  interface KeywordExtractor {
    extract: (text: string, options?: KeywordExtractorOptions) => string[];
  }

  export const keywordExtractor: KeywordExtractor;
} 