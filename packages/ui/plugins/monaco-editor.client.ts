import { shikiToMonaco } from "@shikijs/monaco";
import { createHighlighter } from "shiki";


async function loadSyntaxDefinitions() {
	try {

		const [cedarSyntax, cedarSchemaSyntax, jsonSyntax] = await Promise.all([
			$fetch("/syntax/cedar.tmLanguage.json"),
			$fetch("/syntax/cedarschema.tmLanguage.json"),
			$fetch("/syntax/json.tmLanguage.json"),
		]);


		const cedar = {
			scopeName: "source.cedar",
			patterns: [],
			repository: {},
			...(cedarSyntax as any),
			name: "cedar-policy",
		};

		const cedarSchema = {
			scopeName: "source.cedarschema",
			patterns: [],
			repository: {},
			...(cedarSchemaSyntax as any),
			name: "cedar-schema",
		};

		const json = {
			scopeName: "source.json",
			patterns: [],
			repository: {},
			...(jsonSyntax as any),
			name: "custom-json",
		};

		return { cedar, cedarSchema, json };
	} catch (error) {
		console.error("Failed to load syntax definitions:", error);

		return {
			cedar: {
				name: "cedar-policy",
				scopeName: "source.cedar",
				patterns: [],
				repository: {},
			},
			cedarSchema: {
				name: "cedar-schema",
				scopeName: "source.cedarschema",
				patterns: [],
				repository: {},
			},
			json: {
				name: "custom-json",
				scopeName: "source.json",
				patterns: [],
				repository: {},
			},
		};
	}
}

export default defineNuxtPlugin(async () => {
	const monaco = await useMonaco();

	if (!monaco) return;


	const { cedar, cedarSchema, json } = await loadSyntaxDefinitions();


	const highlighter = await createHighlighter({
		langs: [cedar, cedarSchema, json],
		themes: ["catppuccin-latte", "catppuccin-mocha", "light-plus", "min-light", "vitesse-dark", "vitesse-black", "vesper", "material-theme-ocean", "github-dark-high-contrast", "github-dark-default", "github-light-high-contrast",],
	});


	monaco.languages.register({ id: "cedar-policy" });
	monaco.languages.register({ id: "cedar-schema" });
	monaco.languages.register({ id: "custom-json" });


	shikiToMonaco(highlighter, monaco);


	const { getThemeName } = useMonacoEditor();
	monaco.editor.setTheme(getThemeName());



	monaco.languages.setLanguageConfiguration("cedar-policy", {
		comments: {
			lineComment: "//",
		},
		autoClosingPairs: [
			{ open: "{", close: "}" },
			{ open: "[", close: "]" },
			{ open: "(", close: ")" },
			{ open: '"', close: '"' },
		],
		surroundingPairs: [
			{ open: "{", close: "}" },
			{ open: "[", close: "]" },
			{ open: "(", close: ")" },
			{ open: '"', close: '"' },
		],
		brackets: [
			["{", "}"],
			["[", "]"],
			["(", ")"],
		],
		onEnterRules: [
			{
				beforeText: /^\s*(?:permit|if|when|forbid).*?\s*\{[^}]*$/,
				action: {
					indentAction: monaco.languages.IndentAction.Indent,
				},
			},
			{
				beforeText: /^\s*}/,
				action: {
					indentAction: monaco.languages.IndentAction.Outdent,
				},
			},
		],
	});

	monaco.languages.registerCompletionItemProvider("cedar-policy", {
		provideCompletionItems: () => {
			const suggestions = [
				{
					label: "permit",
					kind: monaco.languages.CompletionItemKind.Keyword,
					insertText: "permit ",
					detail: "Keyword: permit a specific action",
				},
				{
					label: "forbid",
					kind: monaco.languages.CompletionItemKind.Keyword,
					insertText: "forbid ",
					detail: "Keyword: forbid a specific action",
				},
				{
					label: "when",
					kind: monaco.languages.CompletionItemKind.Keyword,
					insertText: "when ",
					detail: "Keyword: condition for permission or forbidding",
				},
				{
					label: "if",
					kind: monaco.languages.CompletionItemKind.Keyword,
					insertText: "if ",
					detail: "Keyword: conditional statement",
				},
				{
					label: "in",
					kind: monaco.languages.CompletionItemKind.Operator,
					insertText: " in ",
					detail: "Operator: membership check",
				},
				{
					label: "is",
					kind: monaco.languages.CompletionItemKind.Operator,
					insertText: " is ",
					detail: "Operator: type check",
				},
				{
					label: "principal",
					kind: monaco.languages.CompletionItemKind.Variable,
					insertText: "principal ",
					detail: "Variable: the principal entity performing the action",
				},
				{
					label: "action",
					kind: monaco.languages.CompletionItemKind.Variable,
					insertText: "action ",
					detail: "Variable: the action being performed",
				},
				{
					label: "resource",
					kind: monaco.languages.CompletionItemKind.Variable,
					insertText: "resource ",
					detail: "Variable: the resource being acted upon",
				},
				{
					label: "contains",
					kind: monaco.languages.CompletionItemKind.Function,
					insertText: "contains(",
					insertTextRules:
						monaco.languages.CompletionItemInsertTextRule
							.InsertAsSnippet,
					detail: "Function: contains a value",
				},
				{
					label: "==",
					kind: monaco.languages.CompletionItemKind.Operator,
					insertText: " == ",
					detail: "Operator: equality check",
				},
				{
					label: "&&",
					kind: monaco.languages.CompletionItemKind.Operator,
					insertText: " && ",
					detail: "Operator: logical AND",
				},
				{
					label: "unless",
					kind: monaco.languages.CompletionItemKind.Keyword,
					insertText: "unless ",
					detail: "Keyword: conditional guard",
				},
				{
					label: "then",
					kind: monaco.languages.CompletionItemKind.Keyword,
					insertText: "then ",
					detail: "Keyword: conditional expression",
				},
				{
					label: "else",
					kind: monaco.languages.CompletionItemKind.Keyword,
					insertText: "else ",
					detail: "Keyword: conditional expression",
				},
				{
					label: "has",
					kind: monaco.languages.CompletionItemKind.Operator,
					insertText: " has ",
					detail: "Operator: existence test",
				},
				{
					label: "like",
					kind: monaco.languages.CompletionItemKind.Operator,
					insertText: " like ",
					detail: "Operator: wildcard match",
				},
			];

			return { suggestions: suggestions };
		},
	});



	monaco.languages.setLanguageConfiguration("cedar-schema", {
		comments: {
			lineComment: "//",
		},
		autoClosingPairs: [
			{ open: "{", close: "}" },
			{ open: "[", close: "]" },
			{ open: "(", close: ")" },
			{ open: '"', close: '"' },
		],
		surroundingPairs: [
			{ open: "{", close: "}" },
			{ open: "[", close: "]" },
			{ open: "(", close: ")" },
			{ open: '"', close: '"' },
		],
		brackets: [
			["{", "}"],
			["[", "]"],
			["(", ")"],
		],
		onEnterRules: [
			{
				beforeText:
					/^\s*(?:namespace|type|entity|action|principal|resource|context).*?\s*\{[^}]*$/,
				action: {
					indentAction: monaco.languages.IndentAction.Indent,
				},
			},
			{
				beforeText: /^\s*}/,
				action: {
					indentAction: monaco.languages.IndentAction.Outdent,
					removeText: 1,
				},
			},
		],
	});

	monaco.languages.registerCompletionItemProvider("cedar-schema", {
		provideCompletionItems: () => {
			const suggestions = [
				{
					label: "namespace",
					kind: monaco.languages.CompletionItemKind.Keyword,
					insertText: "namespace ",
					detail: "Keyword: define a namespace",
				},
				{
					label: "type",
					kind: monaco.languages.CompletionItemKind.Keyword,
					insertText: "type ",
					detail: "Keyword: define a type",
				},
				{
					label: "entity",
					kind: monaco.languages.CompletionItemKind.Keyword,
					insertText: "entity ",
					detail: "Keyword: define an entity",
				},
				{
					label: "action",
					kind: monaco.languages.CompletionItemKind.Keyword,
					insertText: "action ",
					detail: "Keyword: define an action",
				},
				{
					label: "principal",
					kind: monaco.languages.CompletionItemKind.Keyword,
					insertText: "principal ",
					detail: "Keyword: define a principal",
				},
				{
					label: "resource",
					kind: monaco.languages.CompletionItemKind.Keyword,
					insertText: "resource ",
					detail: "Keyword: define a resource",
				},
				{
					label: "context",
					kind: monaco.languages.CompletionItemKind.Keyword,
					insertText: "context ",
					detail: "Keyword: define a context",
				},
				{
					label: "enum",
					kind: monaco.languages.CompletionItemKind.Keyword,
					insertText: "enum ",
					detail: "Keyword: define an enum",
				},
				{
					label: "tags",
					kind: monaco.languages.CompletionItemKind.Keyword,
					insertText: "tags: ",
					detail: "Keyword: define tags",
				},
				{
					label: "appliesTo",
					kind: monaco.languages.CompletionItemKind.Keyword,
					insertText: "appliesTo ",
					detail: "Keyword: defines the applicable type",
				},
				{
					label: "in",
					kind: monaco.languages.CompletionItemKind.Operator,
					insertText: " in ",
					detail: "Operator: membership check",
				},
				{
					label: "Set<…>",
					kind: monaco.languages.CompletionItemKind.Keyword,
					insertText: "Set<$1>",
					insertTextRules:
						monaco.languages.CompletionItemInsertTextRule
							.InsertAsSnippet,
					detail: "Keyword: define a set type",
				},
				{
					label: "Record { }",
					kind: monaco.languages.CompletionItemKind.Keyword,
					insertText: "Record { $1 }",
					insertTextRules:
						monaco.languages.CompletionItemInsertTextRule
							.InsertAsSnippet,
					detail: "Keyword: define a Record type",
				},
				{
					label: "Long",
					kind: monaco.languages.CompletionItemKind.Keyword,
					insertText: "Long",
					detail: "Keyword: define a long type",
				},
				{
					label: "String",
					kind: monaco.languages.CompletionItemKind.Keyword,
					insertText: "String",
					detail: "Keyword: define a string type",
				},
				{
					label: "Bool",
					kind: monaco.languages.CompletionItemKind.Keyword,
					insertText: "Bool",
					detail: "Keyword: define a boolean type",
				},
				{
					label: "IPAddr",
					kind: monaco.languages.CompletionItemKind.Keyword,
					insertText: "IPAddr",
					detail: "Keyword: define an IP address type",
				},
				{
					label: "Decimal",
					kind: monaco.languages.CompletionItemKind.Keyword,
					insertText: "Decimal",
					detail: "Keyword: define a decimal type",
				},
				{
					label: "Timestamp",
					kind: monaco.languages.CompletionItemKind.Keyword,
					insertText: "Timestamp",
					detail: "Keyword: define a timestamp type",
				},
				{
					label: "Duration",
					kind: monaco.languages.CompletionItemKind.Keyword,
					insertText: "Duration",
					detail: "Keyword: define a duration type",
				},
				{
					label: "UUID",
					kind: monaco.languages.CompletionItemKind.Keyword,
					insertText: "UUID",
					detail: "Keyword: define a UUID type",
				},
				{
					label: "EntityUID",
					kind: monaco.languages.CompletionItemKind.Keyword,
					insertText: "EntityUID",
					detail: "Keyword: define an entity UID type",
				},
				{
					label: "Record",
					kind: monaco.languages.CompletionItemKind.Keyword,
					insertText: "Record",
					detail: "Keyword: define a record type",
				},
				{
					label: "Extension",
					kind: monaco.languages.CompletionItemKind.Keyword,
					insertText: "Extension",
					detail: "Keyword: define an extension type",
				},
			];

			return { suggestions: suggestions };
		},
	});
});
