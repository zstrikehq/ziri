import type * as monacoedi from "monaco-editor";

function getThemeName(): string {
	if (typeof window === "undefined") return "min-light";


	const stored = localStorage.getItem("theme");
	if (stored) {
		return stored === "dark" ? "github-dark-default" : "min-light";
	}


	if (typeof document !== "undefined") {
		const cookie = document.cookie
			.split("; ")
			.find((c) => c.startsWith("theme="));
		const cookieVal = cookie?.split("=")[1];
		if (cookieVal) {
			return cookieVal === "dark"
				? "github-dark-default"
				: "min-light";
		}
	}


	if (typeof document !== "undefined") {
		if (document.documentElement.classList.contains("dark")) {
			return "github-dark-default";
		}
	}


	if (
		typeof window !== "undefined" &&
		window.matchMedia("(prefers-color-scheme: dark)").matches
	) {
		return "github-dark-default";
	}

	return "min-light";
}


const currentTheme = ref(
	typeof window !== "undefined" ? getThemeName() : "min-light"
);

export const useMonacoEditor = () => {
	const options: monacoedi.editor.IStandaloneEditorConstructionOptions = {
		automaticLayout: true,
		cursorStyle: "block",
		formatOnPaste: true,
		formatOnType: true,
		lineNumbersMinChars: 3,
		minimap: {
			enabled: false,
		},
		scrollBeyondLastLine: false,
		scrollbar: {
			alwaysConsumeMouseWheel: false,
		},
		stickyScroll: {
			enabled: false,
		},


	};

	const setTheme = async () => {
		const themeName = getThemeName();
		currentTheme.value = themeName;
		const monaco = await useMonaco();
		if (monaco) {
			monaco.editor.setTheme(themeName);
		}
	};

	const setEditorMarker = async (
		model: monacoedi.editor.ITextModel | null,
		errors: monacoedi.editor.IMarkerData[]
	) => {
		const monaco = await useMonaco();
		if (monaco && model && errors) {
			monaco.editor.setModelMarkers(model, model.uri.toString(), errors);
		}
	};

	return {
		options,
		getThemeName,
		setTheme,
		setEditorMarker,
	};
};
