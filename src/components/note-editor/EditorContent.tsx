
import { useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import MarkdownToolbar from '../markdown/MarkdownToolbar';
import MarkdownPreview from '../markdown/MarkdownPreview';
import { insertMarkdown, insertLineMarkdown, handleMarkdownShortcuts } from '@/utils/markdownUtils';

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
  togglePreviewMode,
}: EditorContentProps) => {
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const handleMarkdownAction = (action: string, options?: any) => {
    if (!contentRef.current || isPreviewMode) return;
    
    const textarea = contentRef.current;
    
    switch (action) {
      case 'bold':
        insertMarkdown(textarea, '**', '**', 'bold text');
        break;
      case 'italic':
        insertMarkdown(textarea, '*', '*', 'italic text');
        break;
      case 'strikethrough':
        insertMarkdown(textarea, '~~', '~~', 'strikethrough text');
        break;
      case 'heading1':
        insertLineMarkdown(textarea, '# ', 'Heading 1');
        break;
      case 'heading2':
        insertLineMarkdown(textarea, '## ', 'Heading 2');
        break;
      case 'heading3':
        insertLineMarkdown(textarea, '### ', 'Heading 3');
        break;
      case 'bulletList':
        insertLineMarkdown(textarea, '- ', 'List item');
        break;
      case 'orderedList':
        insertLineMarkdown(textarea, '1. ', 'List item');
        break;
      case 'code':
        if (textarea.value.substring(textarea.selectionStart, textarea.selectionEnd).includes('\n')) {
          insertMarkdown(textarea, '```\n', '\n```', 'code block');
        } else {
          insertMarkdown(textarea, '`', '`', 'inline code');
        }
        break;
      case 'quote':
        insertLineMarkdown(textarea, '> ', 'Blockquote');
        break;
      case 'link':
        insertMarkdown(textarea, '[', '](https://example.com)', 'link text');
        break;
      case 'image':
        insertMarkdown(textarea, '![', '](https://example.com/image.jpg)', 'alt text');
        break;
      default:
        break;
    }
    
    // Update content state after modification
    if (textarea) {
      onContentChange(textarea.value);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (contentRef.current) {
      if (handleMarkdownShortcuts(e, contentRef.current)) {
        // Update content state after shortcut
        onContentChange(contentRef.current.value);
      }
    }
    
    // Save on Ctrl+S or Command+S
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      // We don't call onSave here because we can't access it directly
      // The parent component handles this through the keydown event
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto scrollbar-thin">
      {/* Title Input */}
      <div className="glass rounded-lg">
        <Input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Note title"
          className="border-none glass bg-transparent focus-visible:ring-0 text-lg font-medium"
        />
      </div>
      
      {/* Markdown Toolbar */}
      <MarkdownToolbar
        onActionClick={handleMarkdownAction}
        isPreviewMode={isPreviewMode}
        togglePreview={togglePreviewMode}
        className="sticky top-0 z-10"
      />
      
      {/* Editor / Preview Area */}
      <div className="flex-1 glass rounded-lg overflow-hidden flex flex-col">
        {isPreviewMode ? (
          <div className="p-4 overflow-y-auto h-full scrollbar-thin">
            <MarkdownPreview content={content} />
          </div>
        ) : (
          <Textarea
            ref={contentRef}
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Start writing in Markdown..."
            className="w-full h-full bg-transparent border-none p-4 resize-none focus-visible:ring-0 focus:outline-none scrollbar-thin font-mono"
          />
        )}
      </div>
    </div>
  );
};

export default EditorContent;
