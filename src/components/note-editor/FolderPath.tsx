
interface FolderPathProps {
  folderPath: string[];
}

const FolderPath = ({ folderPath }: FolderPathProps) => {
  if (folderPath.length === 0) return null;
  
  return (
    <div className="px-4 py-2 border-b border-border">
      <div className="flex items-center text-sm text-muted-foreground">
        <span>Location: </span>
        {folderPath.map((folderName, index) => (
          <div key={index} className="flex items-center">
            {index > 0 && <span className="mx-1">/</span>}
            <span className="hover:text-foreground">
              {folderName}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FolderPath;
