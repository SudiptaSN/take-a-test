import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

let markdown = `Here is some math: $$E = mc^2$$ and more.`;

// Add newlines inside the $$ blocks to ensure they act as block math
markdown = markdown.replace(/\$\$([\s\S]*?)\$\$/g, '\n\n$$$$\n$1\n$$$$\n\n');

const html = renderToStaticMarkup(
  <ReactMarkdown
    remarkPlugins={[remarkMath]}
    rehypePlugins={[rehypeKatex]}
  >
    {markdown}
  </ReactMarkdown>
);

console.log("HTML OUT:", html);
