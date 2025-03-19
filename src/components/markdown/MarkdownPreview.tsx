
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

const MarkdownPreview = ({ content, className }: MarkdownPreviewProps) => {
  return (
    <div className={cn("prose prose-invert max-w-none prose-pre:bg-secondary prose-pre:text-secondary-foreground prose-code:text-primary", className)}>
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node, ...props }) => <h1 className="text-2xl font-bold my-4" {...props} />,
          h2: ({ node, ...props }) => <h2 className="text-xl font-bold my-3" {...props} />,
          h3: ({ node, ...props }) => <h3 className="text-lg font-bold my-3" {...props} />,
          a: ({ node, ...props }) => <a className="text-primary hover:underline" {...props} />,
          p: ({ node, ...props }) => <p className="my-2" {...props} />,
          ul: ({ node, ...props }) => <ul className="list-disc pl-6 my-2" {...props} />,
          ol: ({ node, ...props }) => <ol className="list-decimal pl-6 my-2" {...props} />,
          li: ({ node, ...props }) => <li className="my-1" {...props} />,
          blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-primary/30 pl-4 my-3 italic" {...props} />,
          code: ({ node, className, children, ...props }) => {
            if (className) {
              return <code className="bg-secondary/50 p-1 rounded text-primary font-mono text-sm" {...props}>{children}</code>;
            }
            return <code className="bg-secondary/50 p-1 rounded text-primary font-mono text-sm" {...props}>{children}</code>;
          },
          pre: ({ node, children, ...props }) => <pre className="bg-secondary p-3 rounded-md overflow-x-auto my-3" {...props}>{children}</pre>,
          hr: ({ node, ...props }) => <hr className="my-6 border-border" {...props} />,
          table: ({ node, ...props }) => <table className="min-w-full divide-y divide-border my-4" {...props} />,
          th: ({ node, ...props }) => <th className="px-3 py-2 text-left font-semibold border-b border-border" {...props} />,
          td: ({ node, ...props }) => <td className="px-3 py-2 border-b border-border" {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownPreview;
