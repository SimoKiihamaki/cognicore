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
        h1: ({ node, ...props }) => <h1 className="text-xl font-bold mt-4 mb-2" {...props} />,
        h2: ({ node, ...props }) => <h2 className="text-lg font-bold mt-4 mb-2" {...props} />,
        h3: ({ node, ...props }) => <h3 className="text-md font-bold mt-3 mb-1" {...props} />,
        h4: ({ node, ...props }) => <h4 className="text-base font-semibold mt-3 mb-1" {...props} />,
        p: ({ node, ...props }) => <p className="mb-2" {...props} />,
        a: ({ node, ...props }) => (
          <a 
            className="text-primary hover:underline" 
            target="_blank" 
            rel="noopener noreferrer" 
            {...props} 
          />
        ),
        ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-2" {...props} />,
        ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-2" {...props} />,
        li: ({ node, ...props }) => <li className="mb-1" {...props} />,
        code: ({ node, inline, className, children, ...props }) => {
          if (inline) {
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
        blockquote: ({ node, ...props }) => (
          <blockquote 
            className="border-l-4 border-primary/30 pl-4 italic text-muted-foreground" 
            {...props} 
          />
        ),
        table: ({ node, ...props }) => (
          <div className="overflow-x-auto mb-4">
            <table className="min-w-full divide-y divide-border" {...props} />
          </div>
        ),
        tr: ({ node, ...props }) => <tr className="border-b border-border" {...props} />,
        th: ({ node, ...props }) => (
          <th 
            className="px-2 py-1 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider" 
            {...props} 
          />
        ),
        td: ({ node, ...props }) => <td className="px-2 py-1 text-sm" {...props} />,
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

export default MarkdownRenderer;
