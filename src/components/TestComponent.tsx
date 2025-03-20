import React, { useState, useEffect } from 'react';

const TestComponent = () => {
  const [localStorageItems, setLocalStorageItems] = useState<{key: string, size: number}[]>([]);
  const [themeInfo, setThemeInfo] = useState<any>(null);
  const [lmStudioInfo, setLmStudioInfo] = useState<any>(null);
  
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
