import { keywordExtractor } from 'keyword-extractor';

/**
 * Extracts key concepts from text using keyword extraction
 * @param text The text to extract concepts from
 * @returns Array of extracted concepts
 */
export async function extractConcepts(text: string): Promise<string[]> {
  if (!text) return [];
  
  try {
    // Extract keywords using keyword-extractor
    const keywords = keywordExtractor.extract(text, {
      language: 'english',
      remove_digits: true,
      return_changed_case: true,
      remove_duplicates: true,
      return_chained_words: true
    });
    
    // Filter and clean up keywords
    const concepts = keywords
      .filter(keyword => keyword.length > 2) // Remove very short words
      .map(keyword => keyword.toLowerCase())
      .filter((value, index, self) => self.indexOf(value) === index); // Remove duplicates
    
    return concepts;
  } catch (error) {
    console.error('Error extracting concepts:', error);
    return [];
  }
}

/**
 * Calculates the similarity between two texts based on their concepts
 * @param textA First text
 * @param textB Second text
 * @returns Similarity score between 0 and 1
 */
export async function calculateTextSimilarity(textA: string, textB: string): Promise<number> {
  const conceptsA = await extractConcepts(textA);
  const conceptsB = await extractConcepts(textB);
  
  if (conceptsA.length === 0 || conceptsB.length === 0) return 0;
  
  // Calculate Jaccard similarity
  const intersection = conceptsA.filter(concept => conceptsB.includes(concept));
  const union = Array.from(new Set([...conceptsA, ...conceptsB]));
  
  return intersection.length / union.length;
}

/**
 * Extracts named entities from text (people, organizations, locations)
 * @param text The text to extract entities from
 * @returns Object containing arrays of different entity types
 */
export async function extractNamedEntities(text: string): Promise<{
  people: string[];
  organizations: string[];
  locations: string[];
}> {
  // This is a placeholder for future implementation
  // Would require a proper NLP library like compromise or natural
  return {
    people: [],
    organizations: [],
    locations: []
  };
} 