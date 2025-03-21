import React, { useState, useEffect } from 'react';
import { getEmbeddingService, calculateCosineSimilarity, chunkText } from '@/utils/embeddings';
import { Button } from './ui/button';
import { Loader2 } from 'lucide-react';

const TestComponent = () => {
  const [localStorageItems, setLocalStorageItems] = useState<{key: string, size: number}[]>([]);
  const [themeInfo, setThemeInfo] = useState<any>(null);
  const [lmStudioInfo, setLmStudioInfo] = useState<any>(null);
  
  // Embedding test states
  const [testStatus, setTestStatus] = useState<'idle' | 'running' | 'complete' | 'error'>('idle');
  const [testResults, setTestResults] = useState<{
    text1: string;
    text2: string;
    similarity: number;
    embedding1Length?: number;
    embedding2Length?: number;
    processingTime?: number;
  } | null>(null);
  
  useEffect(() => {
    // Get all localStorage items and their sizes
    const items: {key: string, size: number}[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) || '';
      const value = localStorage.getItem(key) || '';
      items.push({
        key,
        size: new Blob([value]).size
      });
    }
    setLocalStorageItems(items.sort((a, b) => b.size - a.size));
    
    // Get theme info
    try {
      const themeData = localStorage.getItem('cognicore-custom-themes');
      if (themeData) {
        setThemeInfo(JSON.parse(themeData));
      }
    } catch (error) {
      console.error('Error parsing theme data:', error);
    }
    
    // Get LM Studio info
    try {
      const lmStudioData = localStorage.getItem('lmStudio-config');
      if (lmStudioData) {
        setLmStudioInfo(JSON.parse(lmStudioData));
      }
    } catch (error) {
      console.error('Error parsing LM Studio data:', error);
    }
  }, []);
  
  // Function to test embedding generation and similarity
  const runEmbeddingTest = async () => {
    try {
      setTestStatus('running');
      
      // Sample text for testing
      const text1 = "CogniCore is a privacy-focused knowledge management application that runs entirely in the browser.";
      const text2 = "This app is designed for privacy, managing knowledge directly in your browser without servers.";
      
      // Get embedding service
      const embeddingService = getEmbeddingService();
      
      // Time the operation
      const startTime = performance.now();
      
      // Generate embeddings
      console.log('Generating embeddings...');
      const embedding1 = await embeddingService.embedText(text1);
      const embedding2 = await embeddingService.embedText(text2);
      
      // Calculate similarity
      const similarity = calculateCosineSimilarity(embedding1, embedding2);
      
      // Calculate processing time
      const processingTime = performance.now() - startTime;
      
      // Set results
      setTestResults({
        text1,
        text2,
        similarity,
        embedding1Length: embedding1.length,
        embedding2Length: embedding2.length,
        processingTime
      });
      
      setTestStatus('complete');
    } catch (error) {
      console.error('Error running embedding test:', error);
      setTestStatus('error');
    }
  };
  
  // Function to test text chunking
  const testChunking = () => {
    const longText = "CogniCore is a privacy-focused knowledge management application. It runs entirely in your browser, ensuring your data stays private. The application uses modern web technologies like React and IndexedDB to provide a seamless experience. One of the key features is the ability to generate embeddings for your notes, which allows semantic search and automatic organization. Another important feature is the integration with locally-hosted LLMs through LM Studio, enabling AI-powered interactions without sending your data to external servers.";
    
    const chunks = chunkText(longText);
    console.log('Text chunks:', chunks);
    
    return chunks.length;
  };
  
  return (
    <div className="p-4 border border-red-500 rounded">
      <h2 className="text-xl font-bold mb-4">Diagnostic Information</h2>
      
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Environment</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="font-medium">Browser:</div>
            <div>{navigator.userAgent}</div>
            <div className="font-medium">Window Size:</div>
            <div>{window.innerWidth} x {window.innerHeight}</div>
            <div className="font-medium">URL:</div>
            <div>{window.location.href}</div>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold mb-2">Embedding Functionality Test</h3>
          <div className="flex gap-2 mb-2">
            <Button 
              onClick={runEmbeddingTest}
              disabled={testStatus === 'running'}
              variant="outline"
            >
              {testStatus === 'running' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {testStatus === 'running' ? 'Testing...' : 'Test Embeddings'}
            </Button>
            <Button 
              onClick={() => {
                const chunkCount = testChunking();
                alert(`Text chunking test complete. Generated ${chunkCount} chunks.`);
              }}
              variant="outline"
            >
              Test Chunking
            </Button>
          </div>
          
          {testStatus === 'error' && (
            <div className="p-2 bg-red-100 text-red-800 rounded mb-2">
              Error running embedding test. Check console for details.
            </div>
          )}
          
          {testResults && (
            <div className="border border-border rounded p-2 text-sm">
              <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                <div className="font-medium">Text 1:</div>
                <div className="truncate">{testResults.text1}</div>
                
                <div className="font-medium">Text 2:</div>
                <div className="truncate">{testResults.text2}</div>
                
                <div className="font-medium">Similarity:</div>
                <div>{(testResults.similarity * 100).toFixed(2)}%</div>
                
                {testResults.embedding1Length && (
                  <>
                    <div className="font-medium">Embedding Dimension:</div>
                    <div>{testResults.embedding1Length}</div>
                  </>
                )}
                
                {testResults.processingTime && (
                  <>
                    <div className="font-medium">Processing Time:</div>
                    <div>{testResults.processingTime.toFixed(2)}ms</div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
        
        <div>
          <h3 className="text-lg font-semibold mb-2">Local Storage ({localStorageItems.length} items)</h3>
          <div className="overflow-auto max-h-40 text-xs border border-border rounded">
            <table className="min-w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="p-2 text-left">Key</th>
                  <th className="p-2 text-right">Size (KB)</th>
                </tr>
              </thead>
              <tbody>
                {localStorageItems.map((item, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-card' : 'bg-background'}>
                    <td className="p-2 truncate max-w-[200px]">{item.key}</td>
                    <td className="p-2 text-right">{(item.size / 1024).toFixed(2)} KB</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {themeInfo && (
          <div>
            <h3 className="text-lg font-semibold mb-2">Theme Information</h3>
            <div className="text-xs">
              <pre className="p-2 bg-card rounded overflow-auto max-h-40">
                {JSON.stringify(themeInfo, null, 2)}
              </pre>
            </div>
          </div>
        )}
        
        {lmStudioInfo && (
          <div>
            <h3 className="text-lg font-semibold mb-2">LM Studio Configuration</h3>
            <div className="text-xs">
              <pre className="p-2 bg-card rounded overflow-auto max-h-40">
                {JSON.stringify(lmStudioInfo, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestComponent;
