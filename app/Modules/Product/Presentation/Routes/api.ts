/**
 * @file api.ts
 * @description 產品路由
 */

import { Router } from 'express'
import type { ProductController } from '../Controllers/ProductController'

export function registerProductRoutes(router: Router, controller: ProductController): void {
  router.post('/api/products', (req: any, res: any) => controller.create(req, res))
  router.get('/api/products/:id', (req: any, res: any) => controller.getById(req, res))
  router.get('/api/products', (req: any, res: any) => controller.getAll(req, res))
}
