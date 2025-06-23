const fs = require('fs');
const path = require('path');
const pug = require('pug');
const beautify = require('js-beautify').html;
function createBorder(text = "", size = 0) {
	size = size - text.length - 2
	const edge = {
		l: "=".repeat(Math.floor(size / 2)),
		r: "=".repeat(Math.ceil(size / 2))
	}
	return `${edge.l} ${text} ${edge.r}`
};
String.prototype.recReplace = function (regex, replacement) {
	let str = this;
	let prev;
	do {
		prev = str;
		str = str.replace(regex, replacement);
	} while (str !== prev);
	return str;
};
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
		}
	});
};
function transpileToPug(fileInput) {
	const input = fs.readFileSync(path.join(".", "files", "input", `${fileInput}.ps`), 'utf8');
	function convertToPug(str) {
		if (
			//false
			true
		) {
			if (!/body \{/.test(str)) {
				if (/<==[\s\S]*==>/.test(str)) {
					str = str.replace(/(<==[\s\S]*?==>)([\s\S]*)/g, `$1body {$2};`.trim())
				}
				else {
					str = `${str}`
				}
			};
			if (!/html \{/.test(str)) {
				if (/<==[\s\S]*==>/.test(str)) {
					str = str.replace(/(<==[\s\S]*?==>)([\s\S]*)/g, `$1html {$2};`.trim())
				}
				else {
					str = `${str}`
				}
			};
			if (!/\[doctype:.*?\]/.test(str)) {
				if (/<==[\s\S]*==>/.test(str)) {
					str = str.replace(/(<==[\s\S]*?==>)(.*?)/g, "$1[doctype:html]$2")
				}
				else {
					str = `[doctype:html]${str}`
				}
			};
			str = str
				.replace(/(\S)(\[doctype:.*\])(\S)/g, "$1\n$2\n$3")
				.replace(/\s{2,}/g, "\n")
				.recReplace(/(\};?){2}/g, "$1\n$1")
				.recReplace(/\};(\s*?)\}/g, "}$1}")
				.replace(/\};$/g, "}")
		}
		let result = '';
		let indentLevel = 0;
		const INDENT = '  ';
		let variables = /<==[\s\S]*?==>/.test(str)
			?
			str
				.match(/<==([\s\S]*?)==>/)[1]
				.replace(/\s{2,}/g, " ")
				.replace(/\n/g, "")
				.replace(/(.*?);/g, "- $1\n")
				.replace(/</g, "{")
				.replace(/>/g, "}")
				.replace(/([,:])/g, "$1 ")
				.trim()
			:
			"";
		let locals = {};
		const varMatches = [...input.matchAll(/var\s+(\w+)\s+from\s+"(.+?\.json)";/g)];
		for (const [, varName, fileName] of varMatches) {
			const jsonPath = path.join(".", "files", "data", fileName);
			try {
				const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
				locals[varName] = jsonData;
			} catch (err) {
				console.error(`Failed to read ${fileName}:`, err);
			}
		}
		str = str.replace(/var\s+\w+\s+from\s+".+?\.json";/g, '');
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
		};
		result = result
			.replace(/"<=="[\s\S]*"==>"/g, "")
			.replace(/([a-z0-9]*)\n\s*"(.*)"/gi, "$1 $2")
			.replace(/for \((.*) in (.*)\)/g, "each $1 in $2")
			.replace(/(?<!")(.*): (.*)(?!")/g, "$1= $2")
			.replace(/\$\/ ?(.*?) ?\//g, "#{$1}")
			.replace(/\[doctype:(.+?)\]/g, "doctype $1")
			.replace(/([a-z])\[(.+?)\]/gi, "$1(<<$2>>)")
			.replace(/(.+?):"(.+?)"(?:, )?/gi, "$1=\"$2\", ")
			.replace(/\(<<(.*?)(?:, )?>>\)/gi, "($1)")
			.replace(/if \((.*?)\)/gi, "if $1")
			.replace(/(#\{.*?)(?<!\.(?:join|atIndex|at))\((.*?)\)(.*?\})/g, "$1[$2]$3")
			.replace(/\.join\((.*?)\)/g, ".filter(Boolean).join($1)")
			.replace(/(\w*?)\((\d+)\)/g, "$1[$2]")
			.replace(/#\{(.*?) \? (.*?) = (.*?)\}/g, "#{$1 ? $2 : $3}")
			.trim();
			console.log(result)
			variables = variables
				.replace(/- var .\S+ from ".*?"/g, "")
		return {
			pugSource: `
${variables}
${result}
`.trim(),
			locals
		};
	}
	const { pugSource, locals } = convertToPug(input);
	const html = htmlFormat(pug.compile(pugSource)(locals));
	console.log(`
${createBorder(fileInput.toUpperCase(), 50)}
${pugSource
	.replace(/(doctype .+?\n)/g, `${createBorder(fileInput.toUpperCase(), 50)}\n$1`)
}
${createBorder(fileInput.toUpperCase(), 50)}
${html}
${createBorder(fileInput.toUpperCase(), 50)}
`
.replace(/(=+ .+ =+)\n\1/g,"$1")
)
	writeToFile(path.join(".", "files", "output", `${fileInput}.html`), `${html}`);
};
const directory = path.join(".", "files", "input");
const psFiles = [];
fs.readdir(directory, (err, files) => {
	if (err) {
		return console.error('Error reading directory:', err);
	}
	files.forEach(file => {
		if (file.endsWith('.ps')) {
			psFiles.push(file.replace(/(.*?)\.ps/g, "$1"));
		}
	});
	psFiles.forEach(fileName => transpileToPug(fileName))
});