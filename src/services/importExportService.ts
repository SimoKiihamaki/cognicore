
// Add a function to handle exports

/**
 * Generate an export file and return its URL
 */
export function exportData(
  notes, 
  files, 
  folders, 
  settings, 
  metadata
) {
  // Create a package object
  const exportPackage = {
    metadata: {
      ...metadata,
      exportDate: new Date().toISOString(),
      version: '1.0.0'
    },
    data: {
      notes,
      indexedFiles: files,
      folders,
      settings
    }
  };
  
  // Convert to JSON
  const json = JSON.stringify(exportPackage, null, 2);
  
  // Create a blob and URL
  const blob = new Blob([json], { type: 'application/json' });
  return URL.createObjectURL(blob);
}
