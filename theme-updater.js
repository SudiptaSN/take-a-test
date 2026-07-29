const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.css')) results.push(file);
    }
  });
  return results;
}

const files = walk('./app');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  
  // Replace standard tailwind colors
  content = content.replace(/text-slate-/g, 'text-zinc-');
  content = content.replace(/bg-slate-/g, 'bg-zinc-');
  content = content.replace(/border-slate-/g, 'border-zinc-');
  
  // Replace accent colors
  content = content.replace(/text-indigo-/g, 'text-orange-');
  content = content.replace(/bg-indigo-/g, 'bg-orange-');
  content = content.replace(/text-blue-/g, 'text-red-');
  content = content.replace(/bg-blue-/g, 'bg-red-');
  content = content.replace(/border-blue-/g, 'border-red-');
  
  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log('Updated ' + file);
  }
});
