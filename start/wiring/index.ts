/**
 * @file index.ts
 * @description 接線層 (Wiring Layer) 統一入口
 *
 * 核心責任：
 * 1. 導出核心裝配組件 (Registry, Factory, Builder, ModuleAutoWirer)
 * 2. 模組路由與 Controller 接線由各模組自行在 registerRoutes 內完成
 */

// 核心導出（應用啟動與 Auto-Wiring 使用）
export { DatabaseAccessBuilder, createDatabaseAccess } from './DatabaseAccessBuilder'
export { getCurrentORM, getDatabaseAccess } from './RepositoryFactory'
export { initializeRegistry, getRegistry, resetRegistry } from './RepositoryRegistry'
export { createRepositoryFactory } from './RepositoryFactoryGenerator'
export { ModuleAutoWirer } from './ModuleAutoWirer'

// P3 遷移：RepositoryResolver 已移除，使用容器式 Repository 解析
// 新模式：在 registerRepositories 中向容器直接註冊 Repository 實例

/**
 * 模組路由接線已改為「模組內自管」：
 * 各模組在 IModuleDefinition.registerRoutes 中自行從 core 取服務、組裝 Controller、註冊路由。
 * 新增模組時只需在該模組內實作 registerRoutes（與必要時在 Provider 註冊服務），
 * 無需在 start/wiring/index.ts 新增任何程式碼。
 */
