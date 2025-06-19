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
function transpileToPug(fileInput, logs = []) {
	const input = fs.readFileSync(path.join(".","files","input",`${fileInput}.ps`), 'utf8');
	function convertToPug(str) {
		let result = '';
		let indentLevel = 0;
		const INDENT = '  ';
		const variables = str
			.replace(/\n/g, "")
			.match(/<==(.*?)==>/)[1]
			.replace(/(.*?);/g, "- $1\n")
			.trim()
		const lines = str
			.replace(/\t|(?: {2,})/g, "")
			.replace(/ *({|}) */g, "$1")
			.replace(/;/g, '')
			.replace(/\{/g, '{\n')
			.replace(/\}/g, '\n}')
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
			.replace(/\/ ?(.*?) ?\//gi, "{$1}")
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
	const pugSource = convertToPug(input);
	const html = htmlFormat(pug.compile(pugSource)());
	writeToFile(path.join(".", "files", "output", `${fileInput}.html`), `${html}`);
};
const directory = path.join(".","files","input");
const psFiles = [];
fs.readdir(directory, (err, files) => {
	if (err) {
		return console.error('Error reading directory:', err);
	}
	files.forEach(file => {
		if (file.endsWith('.ps')) {
			console.log(file)
			psFiles.push(file.replace(/(.*?)\.ps/g,"$1"));
		}
	});
	console.log('Found .ps files:', psFiles);
psFiles.forEach(fileName => transpileToPug(fileName, ["test"]))
});
