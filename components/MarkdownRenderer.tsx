"use client";
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface Props {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className = '' }: Props) {
  return (
    <div className={`prose prose-invert prose-zinc max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" />,
          // Tailwind prose takes care of headings, paragraphs, lists, etc.
          // But we can override specific ones if we want.
          p: ({node, ...props}) => <p className="mb-4 last:mb-0" {...props} />
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
