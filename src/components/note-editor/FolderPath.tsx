import { useFolders } from '@/hooks/useFolders';

interface FolderPathProps {
  folderId: string | null;
  noteTitle?: string;
}

export const FolderPath = ({ folderId, noteTitle }: FolderPathProps) => {
  // Get folders context with getFolderPath
  let { getFolderPath } = useFolders();
  
  // If getFolderPath is not available, provide a fallback
  if (!getFolderPath) {
    getFolderPath = (id) => ({ id: id || '', name: 'Unknown', path: '', parentFolders: [] });
  }
  
  // Get folder path
  const folderInfo = getFolderPath(folderId);
  
  // Create path array
  const pathParts = folderInfo.path ? folderInfo.path.split(' / ') : [];
  
  // If there's no path but there is a folder name, use it as the only path part
  if (pathParts.length === 0 && folderInfo.name && folderInfo.name !== 'No Folder') {
    pathParts.push(folderInfo.name);
  }
  
  // If no folder is assigned, show "No Folder" label
  if (pathParts.length === 0 || (pathParts.length === 1 && pathParts[0] === '')) {
    return (
      <div className="px-4 py-2 border-b border-border">
        <div className="flex items-center text-sm text-muted-foreground">
          <span>Location: </span>
          <span className="ml-1 italic">No Folder</span>
          {noteTitle && <span className="mx-1">•</span>}
          {noteTitle && <span className="font-medium text-foreground">{noteTitle}</span>}
        </div>
      </div>
    );
  }
  
  return (
    <div className="px-4 py-2 border-b border-border">
      <div className="flex items-center text-sm text-muted-foreground">
        <span>Location: </span>
        {pathParts.map((folderName, index) => (
          <div key={index} className="flex items-center">
            {index > 0 && <span className="mx-1">/</span>}
            <span className="hover:text-foreground">
              {folderName}
            </span>
          </div>
        ))}
        {noteTitle && <span className="mx-1">•</span>}
        {noteTitle && <span className="font-medium text-foreground">{noteTitle}</span>}
      </div>
    </div>
  );
};

export default FolderPath;
