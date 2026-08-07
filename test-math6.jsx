let markdown = `Here is some math: $$E = mc^2$$ and more.`;
markdown = markdown.replace(/\$\$([\s\S]*?)\$\$/g, '\n\n$$\n$1\n$$\n\n');
console.log(JSON.stringify(markdown));
