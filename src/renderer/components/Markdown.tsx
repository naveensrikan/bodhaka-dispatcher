import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface MarkdownProps {
  content: string;
  className?: string;
}

/**
 * Renders markdown with GFM (tables, strikethrough) and LaTeX math via KaTeX.
 * KaTeX supports \ce{...} for chemistry via the mhchem extension.
 *
 * Math syntax: $inline$, $$display$$
 * Chemistry:   $\ce{H2O}$
 */
export function Markdown({ content, className = '' }: MarkdownProps) {
  return (
    <div className={`markdown-output ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { trust: true, strict: false, output: 'html' }]]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
