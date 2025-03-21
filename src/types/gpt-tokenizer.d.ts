declare module 'gpt-tokenizer' {
  interface EncodeOptions {
    model?: string;
    maxTokens?: number;
    truncate?: boolean;
  }

  interface Tokenizer {
    encode: (text: string, options?: EncodeOptions) => number[];
  }

  export const encode: (text: string, options?: EncodeOptions) => number[];
} 