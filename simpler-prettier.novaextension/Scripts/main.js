class PrettierExtension {
	constructor() {
		// Track if we've shown the error dialog to avoid spam
		this.hasShownError = false;
		// Track if we're currently formatting to avoid recursive saves
		this.isFormatting = false;
		// Store the workspace path
		this.workspacePath = null;
		// Tries to use your package manager (ie bun uses 'bun x', pnpm uses 'pnpm exec' and npm/default uses 'npx')
		this.packageManager = 'npm'
	}

	async activate() {		
		// Get the workspace path
		this.workspacePath = nova.workspace.path;
		
		// Check if we have the required files
		if (!await this.validateSetup()) {
			console.log('Project not validated')
			console.log("Prettier extension: Required files not found, deactivating");
			return;
		}
		console.log('Project looks good')
		
		// Detect the package manager
		this.packageManager = await this.detectPackageManager()
		console.log(this.packageManager)

		// Register save handler
		nova.workspace.onDidAddTextEditor((editor) => {
			editor.onDidSave(this.handleWillSave.bind(this));
		});

		// Register commands
		nova.commands.register("formatDocument", this.formatDocument.bind(this));
		nova.commands.register("formatProject", this.formatProject.bind(this));
		nova.commands.register("saveWithoutFormatting", this.saveWithoutFormatting.bind(this));
	}

	async validateSetup() {
		console.log('Attempting to validate')
		
		try {
			// Check for package.json
			const packageJsonPath = nova.path.join(this.workspacePath, "package.json");
			console.log(packageJsonPath)
			const hasPackageJson = await this.fileExists(packageJsonPath);
			if (!hasPackageJson) return false;

			// Check for any valid Prettier config file
			const configFiles = [
				".prettierrc",
				".prettierrc.json",
				".prettierrc.yml",
				".prettierrc.yaml",
				".prettierrc.json5",
				".prettierrc.js",
				".prettierrc.cjs",
				"prettier.config.js",
				"prettier.config.cjs"
			];

			for (const configFile of configFiles) {
				const configPath = nova.path.join(this.workspacePath, configFile);
				if (await this.fileExists(configPath)) {
					return true;
				}
			}

			return false;
		} catch (error) {
			console.error("Error validating setup:", error);
			return false;
		}
	}

	async fileExists(path) {
		try {
			const stats = nova.fs.stat(path)
			return stats && stats.isFile()
		} catch (error) {
			return false
		}
	}

	async handleWillSave(editor) {
		console.log('Save trigger')
		
		// Skip if we're already formatting or if this is a save-without-format
		if (this.isFormatting || editor.document.isUntitled) {
			return;
		}

		try {
			// Format the current file first
			await this.formatDocument(editor);
			// Then format the project
			await this.formatProject();
		} catch (error) {
			this.handleError(error);
		}
	}
	
	async detectPackageManager() {
		// Check lock files to infer package manager
		const lockFiles = {
			'bun.lockb': 'bun',
			'pnpm-lock.yaml': 'pnpm',
			'package-lock.json': 'npm'
		}
		
		for (const [lockFile, manager] of Object.entries(lockFiles)) {
			if (await this.fileExists(nova.path.join(this.workspacePath, lockFile))) {
				return manager
			}
		}
		
		// Default to npm if found none
		return 'npm'
	}
	
	getPackageManagerCommand(manager) {
		const commands = {
			'bun': ["bun", "x"],
			'pnpm': ['pnpm', 'exec'],
			'npm': ['npx']
		}
		return commands[manager] || commands.npm
	}
	
	async formatDocument(editor = nova.workspace.activeTextEditor) {
		if (!editor) return;
		this.isFormatting = true;
		try {
			console.log('Formatting document', editor.document.path)
			
			const options = {
				args: ["bun", "x", "prettier", "--write", editor.document.path],
				cwd: this.workspacePath
			}
			
			const process = new Process('/usr/bin/env', options)
			
			process.onStdout((line) => {
				console.log("Running " + line)
			})
			process.onStderr((line) => {
				console.log("Error?:" + line)
			})
			process.onDidExit((status) => console.log('process exited with status:', status))
			
			process.start()
			
		} finally {
			this.isFormatting = false;
		}
	}

	async formatProject() {
		this.isFormatting = true;
		try {
			console.log('Formatting project')
			
			const options = {
				args: ["bun", "x", "prettier", "--write", "."],
				cwd: this.workspacePath,
				shell: true
			}
			
			const process = new Process("/usr/bin/env", options);

			process.onStdout((line) => {
				console.log("Running " + line)
			})
			process.onStderr((line) => {
				console.log("Error?:" + line)
			})
			process.onDidExit((status) => console.log('process exited with status:', status))
			
			process.start()
			
		} finally {
			this.isFormatting = false;
		}
	}

	async saveWithoutFormatting() {
		console.log('Saving without formatting')
		const editor = nova.workspace.activeTextEditor;
		if (editor) {
			this.isFormatting = true;
			try {
				await editor.save();
			} finally {
				this.isFormatting = false;
			}
		}
	}

	handleError(error) {
		console.error("Prettier error:", error);

		// Only show the error dialog once
		if (!this.hasShownError) {
			this.hasShownError = true;
			nova.workspace.showErrorMessage(
				"Prettier encountered an error. Please ensure Prettier is installed in your project. Check the Extension Console for details."
			);
		}
	}
}

// Create and activate the extension
var extension = null;

exports.activate = function() {
	console.log('Activated')
	extension = new PrettierExtension();
	extension.activate();
}

exports.deactivate = function() {
	// Clean up any state if needed
}
