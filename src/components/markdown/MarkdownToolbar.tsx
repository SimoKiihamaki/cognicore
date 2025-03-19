
import {
  Bold, 
  Italic, 
  Heading1, 
  Heading2, 
  Heading3, 
  List, 
  ListOrdered, 
  Code, 
  Quote, 
  Link, 
  Image, 
  Strikethrough,
  Undo,
  Redo,
  EyeIcon,
  PenIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface MarkdownToolbarProps {
  onActionClick: (action: string, options?: any) => void;
  isPreviewMode: boolean;
  togglePreview: () => void;
  className?: string;
}

const MarkdownToolbar = ({ 
  onActionClick, 
  isPreviewMode,
  togglePreview,
  className 
}: MarkdownToolbarProps) => {
  return (
    <div className={cn("flex flex-wrap items-center gap-1 p-1 bg-secondary/50 rounded-md", className)}>
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={() => onActionClick('bold')}
        title="Bold (Ctrl+B)"
        className="h-8 w-8"
        disabled={isPreviewMode}
      >
        <Bold className="h-4 w-4" />
      </Button>
      
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={() => onActionClick('italic')}
        title="Italic (Ctrl+I)"
        className="h-8 w-8"
        disabled={isPreviewMode}
      >
        <Italic className="h-4 w-4" />
      </Button>
      
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={() => onActionClick('strikethrough')}
        title="Strikethrough"
        className="h-8 w-8"
        disabled={isPreviewMode}
      >
        <Strikethrough className="h-4 w-4" />
      </Button>
      
      <Separator orientation="vertical" className="h-6 mx-1" />
      
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={() => onActionClick('heading1')}
        title="Heading 1"
        className="h-8 w-8"
        disabled={isPreviewMode}
      >
        <Heading1 className="h-4 w-4" />
      </Button>
      
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={() => onActionClick('heading2')}
        title="Heading 2"
        className="h-8 w-8"
        disabled={isPreviewMode}
      >
        <Heading2 className="h-4 w-4" />
      </Button>
      
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={() => onActionClick('heading3')}
        title="Heading 3"
        className="h-8 w-8"
        disabled={isPreviewMode}
      >
        <Heading3 className="h-4 w-4" />
      </Button>
      
      <Separator orientation="vertical" className="h-6 mx-1" />
      
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={() => onActionClick('bulletList')}
        title="Bullet List"
        className="h-8 w-8"
        disabled={isPreviewMode}
      >
        <List className="h-4 w-4" />
      </Button>
      
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={() => onActionClick('orderedList')}
        title="Numbered List"
        className="h-8 w-8"
        disabled={isPreviewMode}
      >
        <ListOrdered className="h-4 w-4" />
      </Button>
      
      <Separator orientation="vertical" className="h-6 mx-1" />
      
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={() => onActionClick('code')}
        title="Code"
        className="h-8 w-8"
        disabled={isPreviewMode}
      >
        <Code className="h-4 w-4" />
      </Button>
      
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={() => onActionClick('quote')}
        title="Quote"
        className="h-8 w-8"
        disabled={isPreviewMode}
      >
        <Quote className="h-4 w-4" />
      </Button>
      
      <Separator orientation="vertical" className="h-6 mx-1" />
      
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={() => onActionClick('link')}
        title="Link"
        className="h-8 w-8"
        disabled={isPreviewMode}
      >
        <Link className="h-4 w-4" />
      </Button>
      
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={() => onActionClick('image')}
        title="Image"
        className="h-8 w-8"
        disabled={isPreviewMode}
      >
        <Image className="h-4 w-4" />
      </Button>
      
      <div className="flex-1"></div>
      
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={togglePreview}
        title={isPreviewMode ? "Edit Mode" : "Preview Mode"}
        className="h-8 px-2"
      >
        {isPreviewMode ? (
          <>
            <PenIcon className="h-4 w-4 mr-1" />
            <span className="text-xs">Edit</span>
          </>
        ) : (
          <>
            <EyeIcon className="h-4 w-4 mr-1" />
            <span className="text-xs">Preview</span>
          </>
        )}
      </Button>
    </div>
  );
};

export default MarkdownToolbar;
