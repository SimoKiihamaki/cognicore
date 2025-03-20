
import { useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileUp, Upload } from 'lucide-react';

interface ImportFileUploadProps {
  onFileChange: (files: File[]) => void;
  dragActive: boolean;
  setDragActive: (active: boolean) => void;
  handleDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDrag: (e: React.DragEvent<HTMLDivElement>) => void;
}

const ImportFileUpload = ({
  onFileChange,
  dragActive,
  setDragActive,
  handleDrop,
  handleDrag
}: ImportFileUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const selectedFiles = Array.from(event.target.files);
      onFileChange(selectedFiles);
    }
  }, [onFileChange]);

  const triggerFileSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div 
      className={`border-2 border-dashed rounded-md p-6 text-center transition-colors ${
        dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/20'
      }`}
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
    >
      <FileUp className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
      <p className="text-sm font-medium">
        Drag & drop files here or
      </p>
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={triggerFileSelect}
        className="mt-2"
      >
        <Upload className="h-4 w-4 mr-2" />
        Browse Files
      </Button>
      <Input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
        multiple
        accept=".json,.md,.csv,.zip"
      />
      <p className="text-xs text-muted-foreground mt-2">
        Supports: JSON, Markdown, CSV, or ZIP
      </p>
    </div>
  );
};

export default ImportFileUpload;
