#!/usr/bin/env bun
/**
 * @file port-lint.ts
 * @description Port 層級檢測工具 - 自動檢測違反 DDD 分層的 Port import
 *
 * 用法：
 *   bun scripts/port-lint.ts                # 掃描所有檔案
 *   bun scripts/port-lint.ts --fix          # 自動修復（將來功能）
 *   bun scripts/port-lint.ts --strict       # 嚴格模式（將來功能）
 *
 * 規則：
 *   1. Domain 層不能 import Application/Presentation/Infrastructure Port
 *   2. Application 層不能 import Presentation/Infrastructure Port 實現
 *   3. Presentation 層不能 import Infrastructure 實現
 *   4. Module 不能直接 import 特定 ORM
 */

import { readFileSync } from 'fs'
import { globSync } from 'glob'
import * as path from 'path'

interface LintError {
  file: string
  line: number
  column: number
  message: string
  severity: 'error' | 'warning'
  rule: string
}

const errors: LintError[] = []
const warnings: LintError[] = []

// ============================================================================
// 規則定義
// ============================================================================

const LAYERING_RULES = {
  // Domain 層規則
  domain: {
    forbiddenImports: [
      /@\/Foundation\/Application\/Ports/,
      /@\/Foundation\/Presentation/,
      /@\/Foundation\/Infrastructure\/Ports/,
      /@\/Modules\/\w+\/Application/,
      /@\/Modules\/\w+\/Presentation\/Ports/,
      /@\/Modules\/\w+\/Infrastructure/,
    ],
    reason: 'Domain 層應零外部依賴，只定義業務邏輯',
  },

  // Application 層規則
  application: {
    forbiddenImports: [
      /@\/Foundation\/Infrastructure\/Ports\/Auth\/(ITokenValidator)/,  // Application 可以使用 ITokenSigner（例如 LoginService），但不應使用 ITokenValidator（驗證是 Presentation 的職責）
      /@\/Modules\/\w+\/Infrastructure\/Repositories/,  // 禁止直接依賴具體 Repository 實現
    ],
    reason: 'Application 層應只依賴 Domain 和自己的 Port，以及 Infrastructure 提供的跨層 Port（ILogger、ITokenSigner）',
  },

  // Presentation 層規則
  presentation: {
    forbiddenImports: [
      /@\/Foundation\/Infrastructure\/Ports\/Auth\/(ITokenSigner)/,  // Presentation 可以使用 ITokenValidator（驗證）但不應使用 ITokenSigner（簽名）
      /@\/Foundation\/Infrastructure\/Ports\/Database/,  // 禁止 Presentation 直接依賴數據庫
    ],
    reason: 'Presentation 層不應直接依賴技術實現（除了 ILogger 等跨層 Port）',
  },

  // Module 規則
  module: {
    forbiddenImports: [
      /from ['"]@gravito\/atlas['"]/, // ORM
      /from ['"]typeorm['"]/, // ORM
      /from ['"]prisma['"]/, // ORM
      /from ['"]drizzle-orm['"]/, // ORM
    ],
    reason: 'Module 應通過 IDatabaseAccess Port 隔離 ORM 選擇',
  },
}

// ============================================================================
// 輔助函數
// ============================================================================

/**
 * 判斷檔案所屬的層級
 */
function getFileLayer(filePath: string): 'domain' | 'application' | 'presentation' | 'infrastructure' | 'module' {
  const normalizedPath = filePath.replace(/\\/g, '/')

  if (normalizedPath.includes('/Domain/')) return 'domain'
  if (normalizedPath.includes('/Application/')) return 'application'
  if (normalizedPath.includes('/Presentation/')) return 'presentation'
  if (normalizedPath.includes('/Infrastructure/')) return 'infrastructure'
  if (normalizedPath.includes('/Modules/')) return 'module'

  return 'module' // 預設為 module
}

/**
 * 提取檔案中的所有 import 語句
 */
function extractImports(content: string): Array<{ line: number; importPath: string; column: number }> {
  const imports: Array<{ line: number; importPath: string; column: number }> = []

  const importRegex = /(?:import|from)\s+['"]([^'"]+)['"]/g
  let lineNum = 1
  const lines = content.split('\n')

  lines.forEach((line, index) => {
    let match
    const lineRegex = /(?:import|from)\s+['"]([^'"]+)['"]/g
    while ((match = lineRegex.exec(line)) !== null) {
      imports.push({
        line: index + 1,
        importPath: match[1],
        column: match.index + 1,
      })
    }
  })

  return imports
}

/**
 * 檢查 import 路徑是否違反規則
 */
function checkImport(
  filePath: string,
  importPath: string,
  lineNum: number,
  columnNum: number
): { isViolation: boolean; error?: LintError } {
  const fileLayer = getFileLayer(filePath)
  const rules = LAYERING_RULES[fileLayer]

  if (!rules) return { isViolation: false }

  for (const forbiddenRegex of rules.forbiddenImports) {
    if (forbiddenRegex.test(importPath)) {
      return {
        isViolation: true,
        error: {
          file: filePath,
          line: lineNum,
          column: columnNum,
          message: `${fileLayer.toUpperCase()} 層不能 import: ${importPath}\n  原因: ${rules.reason}`,
          severity: 'error',
          rule: `layering-violation-${fileLayer}`,
        },
      }
    }
  }

  return { isViolation: false }
}

/**
 * 檢查特定模式的違規
 */
function checkPortPlacement(filePath: string, content: string): LintError[] {
  const foundErrors: LintError[] = []
  const normalizedPath = filePath.replace(/\\/g, '/')

  // 規則：Message Port 應在 Modules/{Module}/Presentation/Ports/
  const oldMessagePortRegex = /@\/Foundation\/(Infrastructure|Presentation)\/Ports\/Messages\/I\w+Messages/g
  const lines = content.split('\n')

  lines.forEach((line, index) => {
    const matches = line.match(oldMessagePortRegex)
    if (matches) {
      foundErrors.push({
        file: filePath,
        line: index + 1,
        column: line.indexOf(matches[0]) + 1,
        message: `Message Port 應分散到各模組 Presentation/Ports/\n  發現舊位置: ${matches[0]}\n  應改為: @/Modules/{Module}/Presentation/Ports/I{Module}Messages`,
        severity: 'error',
        rule: 'message-port-placement',
      })
    }
  })

  // 規則：Application Port 應在 Application/Ports 或 Application/Sagas
  const oldAppPortRegex = /@\/Foundation\/(Infrastructure\/Sagas|Infrastructure\/Ports\/Messaging)\/I(Saga|EventDispatcher)/g

  lines.forEach((line, index) => {
    const matches = line.match(oldAppPortRegex)
    if (matches) {
      foundErrors.push({
        file: filePath,
        line: index + 1,
        column: line.indexOf(matches[0]) + 1,
        message: `Application Port 位置錯誤: ${matches[0]}\n  應改為: @/Foundation/Application/Ports/ 或 @/Foundation/Application/Sagas/`,
        severity: 'error',
        rule: 'application-port-placement',
      })
    }
  })

  return foundErrors
}

// ============================================================================
// 主檢測邏輯
// ============================================================================

function lintFile(filePath: string): void {
  try {
    const content = readFileSync(filePath, 'utf-8')
    const imports = extractImports(content)

    // 檢查每個 import
    imports.forEach(({ importPath, line, column }) => {
      const { isViolation, error } = checkImport(filePath, importPath, line, column)
      if (isViolation && error) {
        errors.push(error)
      }
    })

    // 檢查 Port 放置
    const placementErrors = checkPortPlacement(filePath, content)
    errors.push(...placementErrors)
  } catch (err) {
    console.error(`Error reading file ${filePath}:`, err)
  }
}

function scanProject(): void {
  const projectRoot = process.cwd()

  // 掃描 app 目錄下的所有 TypeScript 檔案
  const files = globSync('app/**/*.ts', {
    cwd: projectRoot,
    ignore: ['node_modules/**', '**/*.test.ts', '**/*.spec.ts'],
  })

  console.log(`🔍 掃描 ${files.length} 個檔案...`)

  files.forEach((file) => {
    lintFile(path.join(projectRoot, file))
  })
}

// ============================================================================
// 輸出結果
// ============================================================================

function printResults(): void {
  const totalErrors = errors.length
  const totalWarnings = warnings.length

  console.log('\n' + '='.repeat(80))
  console.log('📋 Port Lint 檢測結果')
  console.log('='.repeat(80))

  if (totalErrors === 0 && totalWarnings === 0) {
    console.log('✅ 完美！所有 Port 都遵循分層規則')
    process.exit(0)
  }

  // 按檔案分組
  const groupedErrors = new Map<string, LintError[]>()
  errors.forEach((err) => {
    if (!groupedErrors.has(err.file)) {
      groupedErrors.set(err.file, [])
    }
    groupedErrors.get(err.file)!.push(err)
  })

  // 輸出錯誤
  if (errors.length > 0) {
    console.log(`\n❌ 發現 ${errors.length} 個違規（錯誤）\n`)

    Array.from(groupedErrors.entries()).forEach(([file, fileErrors]) => {
      const relPath = path.relative(process.cwd(), file)
      console.log(`\n📄 ${relPath}`)
      console.log('-'.repeat(80))

      fileErrors.forEach((err) => {
        console.log(
          `  ${err.line}:${err.column} [${err.rule}] ${err.message}`
        )
      })
    })
  }

  if (warnings.length > 0) {
    console.log(`\n⚠️  發現 ${warnings.length} 個警告\n`)
  }

  console.log('\n' + '='.repeat(80))
  console.log(`總計: ${totalErrors} 個錯誤, ${totalWarnings} 個警告`)
  console.log('='.repeat(80))

  // 提示
  if (totalErrors > 0) {
    console.log('\n💡 修復建議：')
    console.log('  1. 根據錯誤訊息檢查 import 路徑')
    console.log('  2. 參考 CLAUDE.md 中的 "Port 層級放置規則"')
    console.log('  3. 將 Port 移動到正確的位置')
    console.log('  4. 更新所有引用的 import 路徑')

    process.exit(1)
  }

  process.exit(0)
}

// ============================================================================
// 執行
// ============================================================================

console.log('🚀 啟動 Port 層級檢測工具...\n')
scanProject()
printResults()
