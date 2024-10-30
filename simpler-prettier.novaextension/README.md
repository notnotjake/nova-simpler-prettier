This extension attempts to run prettier on the currently focused document upon save and then runs prettier on the whole project.

It runs prettier just as you would from a terminal so it will support any config files and ignore any files you have prettier set to ignore. It's literally just running prettier inside your project, nothing more. 

Requires that you have node as well as npx, bun or pnpm installed.

Only available when you have package.json and a prettier configuration file in your project.
