import { useState, useEffect, useRef } from 'react';
import { Tab } from '@headlessui/react';
import { Eye, Code, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MarkdownRenderer from '@/components/markdown/MarkdownRenderer';

interface EditorContentProps {
  title: string;
  content: string;
  isPreviewMode: boolean;
  onTitleChange: (title: string) => void;
  onContentChange: (content: string) => void;
  togglePreviewMode: () => void;
}

const EditorContent = ({
  title,
  content,
  isPreviewMode,
  onTitleChange,
  onContentChange,
  togglePreviewMode
}: EditorContentProps) => {
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const [hasFocus, setHasFocus] = useState(false);
  
  // Focus title if empty
  useEffect(() => {
    if (!title && editorRef.current) {
      editorRef.current.focus();
    }
  }, [title]);
  
  // Set content height to fill available space
  useEffect(() => {
    const adjustHeight = () => {
      if (editorRef.current) {
        // Reset height to recalculate
        editorRef.current.style.height = 'auto';
        
        // Calculate available height (subtract title input and toolbar)
        const container = editorRef.current.parentElement;
        if (container) {
          const availableHeight = container.clientHeight - 120; // Adjust based on your layout
          editorRef.current.style.height = `${Math.max(100, availableHeight)}px`;
        }
      }
    };
    
    // Initial adjustment
    adjustHeight();
    
    // Adjust on window resize
    window.addEventListener('resize', adjustHeight);
    
    return () => {
      window.removeEventListener('resize', adjustHeight);
    };
  }, [isPreviewMode]);
  
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="px-4 pt-4 pb-2">
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Note title..."
          className="w-full text-xl font-medium bg-transparent border-none focus:outline-none focus:ring-0 mb-2"
        />
      </div>
      
      <div className="px-4 pb-2 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button
            variant={isPreviewMode ? "default" : "outline"}
            size="sm"
            onClick={togglePreviewMode}
            className="h-8"
          >
            {isPreviewMode ? (
              <>
                <Code className="mr-1 h-4 w-4" />
                Edit
              </>
            ) : (
              <>
                <Eye className="mr-1 h-4 w-4" />
                Preview
              </>
            )}
          </Button>
        </div>
        
        <div className="text-xs text-muted-foreground">
          {content.length} characters
        </div>
      </div>
      
      <div className="flex-1 px-4 overflow-hidden">
        {isPreviewMode ? (
          <div className="h-full overflow-auto scrollbar-thin py-2">
            {content ? (
              <MarkdownRenderer content={content} className="prose-sm" />
            ) : (
              <div className="text-muted-foreground italic">
                Nothing to preview. Start writing to see content.
              </div>
            )}
          </div>
        ) : (
          <textarea
            ref={editorRef}
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            onFocus={() => setHasFocus(true)}
            onBlur={() => setHasFocus(false)}
            placeholder="Write your note content here..."
            className={`w-full h-full bg-transparent resize-none border-none 
              focus:outline-none focus:ring-0 scrollbar-thin
              ${hasFocus ? 'placeholder-muted-foreground/50' : 'placeholder-muted-foreground/70'}
            `}
          />
        )}
      </div>
    </div>
  );
};

export default EditorContent;
