/**
 * @file scripts/cli/types.ts
 * @description 共用型別定義
 */

export interface CommandHandler {
	run(args: string[]): Promise<void>
}

export interface ParsedArgs {
	positional: string[]
	flags: Record<string, boolean | string>
}

export interface CommandContext {
	projectRoot: string
	moduleName: string
	modulePath: string
	pascalCase: string
	camelCase: string
	snakeCase: string
}
