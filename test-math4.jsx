import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

const markdown = `Here is some math:
$$
E = mc^2
$$
and more.`;

const html = renderToStaticMarkup(
  <ReactMarkdown
    remarkPlugins={[remarkMath]}
    rehypePlugins={[rehypeKatex]}
  >
    {markdown}
  </ReactMarkdown>
);

console.log("HTML OUT:", html);
