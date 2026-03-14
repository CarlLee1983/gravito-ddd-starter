/**
 * @file api.ts
 * @description 產品模組的 HTTP 路由定義
 */

import type { IModuleRouter } from '@/Foundation/Presentation/IModuleRouter'
import { ProductController } from '../Controllers/ProductController'

/**
 * 註冊產品模組路由
 *
 * @param router - 模組路由器
 * @param controller - 產品控制器
 */
export function registerProductRoutes(router: IModuleRouter, controller: ProductController): void {
  router.get('/products', (ctx) => controller.getAll(ctx))
  router.get('/products/:id', (ctx) => controller.getById(ctx))
  router.post('/products', (ctx) => controller.create(ctx))
}
