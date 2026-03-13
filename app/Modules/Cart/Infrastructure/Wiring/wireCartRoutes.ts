/**
 * @file wireCartRoutes.ts
 * @description Cart 模組路由裝配
 *
 * 由 ModuleAutoWirer 調用，負責在 Express 路由器中註冊 Cart 相關路由
 */

import type { Router } from 'express'
import type { Container } from '@gravito/core'
import { registerCartRoutes } from '../../Presentation/Routes/api'

/**
 * 裝配 Cart 模組路由至 Express
 *
 * @param router - Express 路由器
 * @param container - DI 容器
 */
export function wireCartRoutes(router: Router, container: Container): void {
	registerCartRoutes(router, container)
}
