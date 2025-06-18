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
function writeToFile(file, data) {
	fs.writeFile(file, data, (err) => {
		if (err) {
			console.error('Oops! Something went wrong:', err);
		} else {
			console.log(`"${file}" has been written successfully!`);
		}
	});
};
function transpileToPug(fileInput, logs=[]) {
	// Step 1: Load .ps file (JS-style Pug)
	const input = fs.readFileSync(`${fileInput}.ps`, 'utf8');
	// Step 2: Convert pseudo-Pug to real Pug (indent-based)
	function convertToPug(str) {
		let result = '';
		let indentLevel = 0;
		const INDENT = '  ';
		const variables = str
			.replace(/\n/g, "")
			.match(/<==(.*?)==>/)[1]
			.replace(/(.*?);/g, "- $1\n")
			.trim()
		//console.log(variables)
		const lines = str
			.replace(/\t|(?: {2,})/g, "")
			.replace(/ *({|}) */g, "$1")
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
			const tagMatch = line.match(/^(.+?:?)\{$/);
			const textMatch = line.match(/^"?(.+?)"?$/);
			if (tagMatch) {
				const tag = tagMatch[1];
				result += `${INDENT.repeat(indentLevel)}${tag}\n`;
				indentLevel++;
				stack.push(tag);
			} else if (textMatch) {
				const text = textMatch[1];
				result += `${INDENT.repeat(indentLevel)}"${text}"\n`;
			}
		}
		result = result
			.replace(/"<=="(?:[\s\S]*)"==>"/g, "").trim()
			.replace(/([a-z0-9]*)\n\s*"(.*)"/gi, "$1 $2")
			.replace(/for \((.*) in (.*)\)/g, "each $1 in $2")
			.replace(/(?<!")(.*): (.*)(?!")/g, "$1= $2")
			.replace(/\$\/ ?(.*?) ?\//g, "#{$1}")
			.replace(/"\[doctype:(.+?)\]"/g, "doctype $1")
			.replace(/([a-z])\[(.+?)\]/gi, "$1(<<$2>>)")
			.replace(/(.+?):"(.+?)"(?:, )?/gi, "$1=\"$2\", ")
			.replace(/\(<<(.*?)(?:, )?>>\)/gi, "($1)")
			.replace(/if \((.*?)\)/gi, "if $1")
			.trim();
		result = `
${variables}
${result}
	`.trim()
		if (logs.includes(fileInput)) {
			const header = fileInput.toUpperCase();
			const bordered = `== ${header} ==`;
			console.log(`${bordered}\n${result}\n${bordered}`);
		}
		return result;
	}
	// Step 3: Transpile
	const pugSource = convertToPug(input);
	// Step 4: Compile with real Pug
	const html = htmlFormat(pug.compile(pugSource)());
	writeToFile(`${fileInput}.html`, `${html}`);
	// Step 5: Log Results
	[
		//`--- Raw PugScript ---\n${input}`,
		//`--- Transpiled Pug ---\n${pugSource}`,
		//`--- Compiled HTML ---\n${html.replace(/\t/g, " ".repeat(4))}`
	].forEach(log => console.log(log))
};
[
	"index",
	"test"
].forEach(fileName => transpileToPug(fileName,["test"]))