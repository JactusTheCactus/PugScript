const fs = require('fs');
const path = require('path');
const pug = require('pug');
const beautify = require('js-beautify').html;
function htmlFormat(htmlInput) {
const htmlOutput = beautify(htmlInput, {
  indent_with_tabs: true
});
return htmlOutput;
};
function writeToFile(file,data){
fs.writeFile(file, data, (err) => {
  if (err) {
    console.error('Oops! Something went wrong:', err);
  } else {
    console.log(`"${file}" has been written successfully!`);
  }
});};

// Step 1: Load .ps file (your JS-style Pug)
const input = fs.readFileSync('index.ps', 'utf8');
console.log('--- Raw PugScript ---\n' + input);

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
    .split('\n')
.filter(Boolean);

  const stack = [];

  for (let line of lines) {
    line = line.trim();

    if (line === '') continue;

    if (line === '}') {
      indentLevel--;
      stack.pop();
      continue;
    }

    const tagMatch = line.match(/^([a-zA-Z0-9, \(\)\[\]"]+:?)\{$/);
    const textMatch = line.match(/^"?(.+?)"?$/);

    if (tagMatch) {
      const tag = tagMatch[1];
      result += `${INDENT.repeat(indentLevel)}${tag}\n`;
      indentLevel++;
      stack.push(tag);
    } else if (textMatch) {
      //const tag = tagMatch[1];
      const text = textMatch[1];
      //result += `${INDENT.repeat(indentLevel)}tag: ${tag} text: "${text}"\n`;
      result += `${INDENT.repeat(indentLevel)}"${text}"\n`;
    }
  }
  result = result
.replace(/([a-z0-9]*)\n\s*"(.*)"/gi,"$1 $2")
.replace(/for \((.*) in (.*)\)/g,"each $1 in $2")

  return result;
}

// Step 3: Transpile
const pugSource = convertToPug(input);
console.log('--- Transpiled Pug ---\n' + pugSource);

// Step 4: Compile with real Pug
const html = htmlFormat(pug.compile(pugSource)());
console.log('--- Compiled HTML ---\n' + html);
writeToFile("index.html",`${html}`);