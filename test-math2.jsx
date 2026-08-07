const React = require('react');
const ReactMarkdown = require('react-markdown');
const remarkMath = require('remark-math');
const rehypeKatex = require('rehype-katex');
const { renderToStaticMarkup } = require('react-dom/server');

const markdown1 = `Here is some math: $$E = mc^2$$ and more.`;
const markdown2 = `$$$$ E = mc^2 $$$$`;

const html1 = renderToStaticMarkup(
  React.createElement(ReactMarkdown, {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
    children: markdown1
  })
);

console.log("MARKDOWN 1:", html1);
