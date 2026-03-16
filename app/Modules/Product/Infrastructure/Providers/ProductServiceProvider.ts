/**
 * @file ProductServiceProvider.ts
 * @description 產品 Service Provider (DI 容器配置)
 */

import { ModuleServiceProvider, type IContainer } from '@/Foundation/Infrastructure/Ports/Core/IServiceProvider'
import type { IDatabaseAccess } from '@/Foundation/Infrastructure/Ports/Database/IDatabaseAccess'
import type { ITranslator } from '@/Foundation/Infrastructure/Ports/Services/ITranslator'
import { CreateProductService } from '../../Application/Services/CreateProductService'
import { GetProductService } from '../../Application/Services/GetProductService'
import { ProductMessageService } from '../Services/ProductMessageService'

import { ProductQueryService } from '../Persistence/ProductQueryService'
import type { RepositoryRegistry } from '@wiring/RepositoryRegistry'
import { getCurrentORM, getDatabaseAccess } from '@wiring/RepositoryFactory'

export class ProductServiceProvider extends ModuleServiceProvider {
  /**
   * 註冊服務到容器
   *
   * @param container - DI 容器
   * @returns void
   */
  override register(container: IContainer): void {
    // 註冊 Repository
    container.singleton('productRepository', (c: IContainer) => {
      const registry = c.make('repositoryRegistry') as RepositoryRegistry
      const orm = getCurrentORM()
      const db = orm !== 'memory' ? getDatabaseAccess() : undefined
      return registry.create('product', orm, db)
    })

    // 註冊訊息服務（使用工廠方法延遲解析 translator）
    container.singleton('productMessages', (c) => {
      try {
        const translator = c.make('translator') as ITranslator
        return new ProductMessageService(translator)
      } catch {
        // 如果 translator 還未註冊（啟動期間），使用虛擬實現
        // 在 boot 階段會被正確的實例替換
        const fallback: any = {
          trans: (key: string) => key,
          choice: (key: string) => key,
          setLocale: () => {},
          getLocale: () => 'en',
        }
        return new ProductMessageService(fallback)
      }
    })

    // 註冊查詢服務 (CQRS Read Side)，從容器取得 databaseAccess 與 bootstrap 一致
    container.singleton('productQueryService', (c) => {
      return new ProductQueryService(c.make('databaseAccess') as IDatabaseAccess)
    })

    // 註冊應用層服務
    container.singleton('createProductService', (c) => {
      const productRepository = c.make('productRepository')
      return new CreateProductService(productRepository)
    })

    container.singleton('getProductService', (c) => {
      const productQueryService = c.make('productQueryService')
      return new GetProductService(productQueryService)
    })
  }
}
