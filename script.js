const fs = require('fs');
const path = require('path');
const pug = require('pug');

// Step 1: Load .ps file (your JS-style Pug)
const input = fs.readFileSync('index.ps', 'utf8');

// Step 2: Convert pseudo-Pug to real Pug (indent-based)
function convertToPug(str) {
  let result = '';
  let indentLevel = 0;
  const INDENT = '  ';

  const lines = str
.replace(/\t|(?: {2,})/g,"")
.replace(/ *({|}) */g,"$1")
    .replace(/;/g, '')// remove semicolons
    .replace(/\{/g, '{\n')// ensure braces open on new lines
    .replace(/\}/g, '\n}')// ensure braces close on new lines
    .split('\n');
console.log(lines.join(""))

  const stack = [];

  for (let line of lines) {
    line = line.trim();

    if (line === '') continue;

    if (line === '}') {
      indentLevel--;
      stack.pop();
      continue;
    }

    const tagMatch = line.match(/^([a-zA-Z0-9]+)\s*\{$/);
    const textMatch = line.match(/^([a-zA-Z0-9]+)\s*\{\s*"(.+?)"\s*\}$/);

    if (tagMatch) {
      const tag = tagMatch[1];
      result += INDENT.repeat(indentLevel) + "tag: " + tag + '\n';
      indentLevel++;
      stack.push(tag);
    } else if (textMatch) {
      const tag = textMatch[1];
      const text = textMatch[2];
      result += INDENT.repeat(indentLevel) + "tag: " + tag + ' ' + "text: " + text + '\n';
    }
  }

  return result;
}

// Step 3: Transpile
const pugSource = convertToPug(input);
console.log('--- Transpiled Pug ---\n' + pugSource);

// Step 4: Compile with real Pug
const html = pug.compile(pugSource)();
console.log('--- Compiled HTML ---\n' + html);