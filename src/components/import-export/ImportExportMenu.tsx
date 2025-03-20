import { useState } from 'react';
import { useImportExport } from '@/hooks/useImportExport';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Import, Export, FileDown, FileUp, FilePlus, FileJson, Book } from 'lucide-react';
import ImportDialog from './ImportDialog';
import ExportDialog from './ExportDialog';

interface ImportExportMenuProps {
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

const ImportExportMenu = ({
  variant = "outline",
  size = "default",
  className = ""
}: ImportExportMenuProps) => {
  const { quickExportAll, exportNotesAsMarkdown } = useImportExport();
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={variant} size={size} className={className}>
            <FileDown className="h-4 w-4 mr-2" />
            Import / Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel>Data Management</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => setShowImportDialog(true)}>
              <FileUp className="mr-2 h-4 w-4" />
              <span>Import Data</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowExportDialog(true)}>
              <FileDown className="mr-2 h-4 w-4" />
              <span>Export Data...</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Quick Export</DropdownMenuLabel>
          
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => quickExportAll(false)}>
              <FileJson className="mr-2 h-4 w-4" />
              <span>All Data (JSON)</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportNotesAsMarkdown(false)}>
              <Book className="mr-2 h-4 w-4" />
              <span>All Notes (Markdown)</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportNotesAsMarkdown(true)}>
              <FilePlus className="mr-2 h-4 w-4" />
              <span>Notes as Separate Files</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      
      <ImportDialog 
        open={showImportDialog} 
        onOpenChange={setShowImportDialog} 
      />
      
      <ExportDialog 
        open={showExportDialog} 
        onOpenChange={setShowExportDialog} 
      />
    </>
  );
};

export default ImportExportMenu;
