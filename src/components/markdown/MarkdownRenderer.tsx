
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const MarkdownRenderer = ({ content, className = '' }: MarkdownRendererProps) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      className={`prose prose-sm dark:prose-invert max-w-none ${className}`}
      components={{
        // Override default components for better styling
        h1: ({ ...props }) => <h1 className="text-xl font-bold mt-4 mb-2" {...props} />,
        h2: ({ ...props }) => <h2 className="text-lg font-bold mt-4 mb-2" {...props} />,
        h3: ({ ...props }) => <h3 className="text-md font-bold mt-3 mb-1" {...props} />,
        h4: ({ ...props }) => <h4 className="text-base font-semibold mt-3 mb-1" {...props} />,
        p: ({ ...props }) => <p className="mb-2" {...props} />,
        a: ({ ...props }) => (
          <a 
            className="text-primary hover:underline" 
            target="_blank" 
            rel="noopener noreferrer" 
            {...props} 
          />
        ),
        ul: ({ ...props }) => <ul className="list-disc pl-5 mb-2" {...props} />,
        ol: ({ ...props }) => <ol className="list-decimal pl-5 mb-2" {...props} />,
        li: ({ ...props }) => <li className="mb-1" {...props} />,
        code: ({ className, children, ...props }) => {
          const match = /language-(\w+)/.exec(className || '');
          const isInline = !match && !className?.includes('code-block');
          
          if (isInline) {
            return (
              <code className="bg-muted px-1 py-0.5 rounded text-sm font-mono" {...props}>
                {children}
              </code>
            );
          }
          return (
            <code className="block bg-muted p-2 rounded-md text-sm font-mono overflow-x-auto whitespace-pre-wrap" {...props}>
              {children}
            </code>
          );
        },
        blockquote: ({ ...props }) => (
          <blockquote 
            className="border-l-4 border-primary/30 pl-4 italic text-muted-foreground" 
            {...props} 
          />
        ),
        table: ({ ...props }) => (
          <div className="overflow-x-auto mb-4">
            <table className="min-w-full divide-y divide-border" {...props} />
          </div>
        ),
        tr: ({ ...props }) => <tr className="border-b border-border" {...props} />,
        th: ({ ...props }) => (
          <th 
            className="px-2 py-1 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider" 
            {...props} 
          />
        ),
        td: ({ ...props }) => <td className="px-2 py-1 text-sm" {...props} />,
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

export default MarkdownRenderer;
