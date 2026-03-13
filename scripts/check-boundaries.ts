#!/usr/bin/env bun
/**
 * @file check-boundaries.ts
 * @description 架構邊界檢查腳本
 *
 * 掃描 app/Modules 下的所有 TypeScript 檔案，檢驗模組間的邊界規則。
 * 防止開發者誤改，確保架構穩定性。
 */

import * as fs from 'fs'
import * as path from 'path'

/** 邊界違規信息 */
interface Violation {
  file: string
  line: number
  rule: string
  message: string
}

/** 邊界檢查配置 */
const RULES = {
  RULE_1: {
    name: '【RULE-1】Domain 層禁止 import 任何他 Module',
    check: (filePath: string, importPath: string): string | null => {
      const isDomainFile = filePath.includes('/Domain/')
      const isOtherModule = /^@\/Modules\/(\w+)\//.test(importPath)
      const sourceModule = filePath.match(/\/Modules\/(\w+)\//)?.[1]
      const targetModule = importPath.match(/^@\/Modules\/(\w+)\//)?.[1]

      if (
        isDomainFile &&
        isOtherModule &&
        sourceModule &&
        targetModule &&
        sourceModule !== targetModule
      ) {
        return `Domain 層不應依賴他 Module：${importPath}`
      }
      return null
    },
  },

  RULE_2: {
    name: '【RULE-2】Application 層禁止 import 任何他 Module（含 DTOs）',
    check: (filePath: string, importPath: string): string | null => {
      const isAppFile = filePath.includes('/Application/')
      const isOtherModule = /^@\/Modules\/(\w+)\//.test(importPath)
      const sourceModule = filePath.match(/\/Modules\/(\w+)\//)?.[1]
      const targetModule = importPath.match(/^@\/Modules\/(\w+)\//)?.[1]

      if (
        isAppFile &&
        isOtherModule &&
        sourceModule &&
        targetModule &&
        sourceModule !== targetModule
      ) {
        return `Application 層不應依賴他 Module：${importPath}`
      }
      return null
    },
  },

  RULE_3: {
    name: '【RULE-3】任何層禁止 import 他 Module 的 Presentation',
    check: (_filePath: string, importPath: string): string | null => {
      if (importPath.match(/^@\/Modules\/\w+\/Presentation\//)) {
        return `不應 import 他 Module 的 Presentation 層：${importPath}`
      }
      return null
    },
  },

  RULE_4: {
    name: '【RULE-4】任何層禁止 import 他 Module 的 Infrastructure（非 Adapters）',
    check: (_filePath: string, importPath: string): string | null => {
      // Adapters 除外（ACL 模式）
      if (
        importPath.match(/^@\/Modules\/\w+\/Infrastructure\//) &&
        !importPath.includes('/Infrastructure/Adapters/')
      ) {
        return `不應 import 他 Module 的 Infrastructure 層：${importPath}`
      }
      return null
    },
  },

  RULE_5: {
    name: '【RULE-5】Infrastructure（非 Adapters）禁止 import 他 Module Domain',
    check: (filePath: string, importPath: string): string | null => {
      const isInfraFile =
        filePath.includes('/Infrastructure/') &&
        !filePath.includes('/Infrastructure/Adapters/')
      const isOtherModuleDomain = /^@\/Modules\/(\w+)\/Domain\//.test(importPath)
      const sourceModule = filePath.match(/\/Modules\/(\w+)\//)?.[1]
      const targetModule = importPath.match(/^@\/Modules\/(\w+)\//)?.[1]

      if (
        isInfraFile &&
        isOtherModuleDomain &&
        sourceModule &&
        targetModule &&
        sourceModule !== targetModule
      ) {
        return `Infrastructure 層不應依賴他 Module 的 Domain：${importPath}`
      }
      return null
    },
  },

  RULE_6: {
    name: '【RULE-6】Health 模組禁止 import 任何業務模組',
    check: (filePath: string, importPath: string): string | null => {
      const isHealthModule = filePath.includes('/Modules/Health/')
      const isBusinessModule = /^@\/Modules\/(User|Post|Session|Order|Product|Cart)\//.test(
        importPath
      )

      if (isHealthModule && isBusinessModule) {
        return `Health 模組不應依賴業務模組：${importPath}`
      }
      return null
    },
  },
}

/**
 * 提取檔案中的所有 import 陳述式
 */
function extractImports(
  filePath: string,
  content: string
): Array<{ line: number; path: string }> {
  const imports: Array<{ line: number; path: string }> = []
  const lines = content.split('\n')

  lines.forEach((line, index) => {
    // 匹配 import 語句（單行）
    const match = line.match(/from\s+['"`]([^'"`]+)['"`]/)
    if (match) {
      imports.push({
        line: index + 1,
        path: match[1],
      })
    }
  })

  return imports
}

/**
 * 檢查單個檔案的所有 import 是否違反邊界規則
 */
function checkFile(filePath: string): Violation[] {
  const violations: Violation[] = []

  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const imports = extractImports(filePath, content)

    imports.forEach(({ line, path: importPath }) => {
      // 只檢查 @/ 開頭的相對路徑
      if (!importPath.startsWith('@/')) {
        return
      }

      // 檢查所有規則
      Object.entries(RULES).forEach(([ruleKey, rule]) => {
        const violationMsg = rule.check(filePath, importPath)
        if (violationMsg) {
          violations.push({
            file: filePath.replace(process.cwd(), ''),
            line,
            rule: ruleKey,
            message: violationMsg,
          })
        }
      })
    })
  } catch (_error) {
    // 忽略讀取失敗的檔案
  }

  return violations
}

/**
 * 遞迴掃描目錄下的所有 TypeScript 檔案
 */
function scanModules(modulesDir: string): string[] {
  const files: string[] = []

  function walk(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true })

    entries.forEach((entry) => {
      const fullPath = path.join(dir, entry.name)

      if (entry.isDirectory()) {
        // 忽略 node_modules 和 tests
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== 'tests') {
          walk(fullPath)
        }
      } else if (entry.isFile() && entry.name.endsWith('.ts')) {
        files.push(fullPath)
      }
    })
  }

  walk(modulesDir)
  return files
}

/**
 * 主程序
 */
function main() {
  const modulesDir = path.join(process.cwd(), 'app/Modules')

  if (!fs.existsSync(modulesDir)) {
    console.error(`❌ 模組目錄不存在: ${modulesDir}`)
    process.exit(1)
  }

  console.log('🔍 掃描架構邊界...\n')

  const files = scanModules(modulesDir)
  const allViolations: Violation[] = []

  files.forEach((file) => {
    const violations = checkFile(file)
    allViolations.push(...violations)
  })

  if (allViolations.length === 0) {
    console.log('✅ 未發現邊界違規（檢查了 %d 個檔案）', files.length)
    process.exit(0)
  }

  // 按檔案分組顯示違規
  console.log(`❌ 發現 ${allViolations.length} 個邊界違規：\n`)

  const grouped = new Map<string, Violation[]>()
  allViolations.forEach((v) => {
    if (!grouped.has(v.file)) {
      grouped.set(v.file, [])
    }
    grouped.get(v.file)!.push(v)
  })

  grouped.forEach((violations, file) => {
    console.log(`📄 ${file}`)
    violations.forEach((v) => {
      const ruleName = RULES[v.rule as keyof typeof RULES].name
      console.log(`   ${v.line}:0 ${ruleName}`)
      console.log(`   └─ ${v.message}`)
    })
    console.log()
  })

  console.log(`\n⚠️  請修正上述違規後重新提交。`)
  process.exit(1)
}

main()
