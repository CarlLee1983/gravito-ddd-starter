# OpenAPI / Swagger 文件指南

此文檔說明如何為 Gravito DDD Starter 應用程式整合 OpenAPI 規範。

## 目錄

- [概述](#概述)
- [方案 1：手動 OpenAPI 規範](#方案-1手動-openapi-規範)
- [方案 2：自動代碼生成](#方案-2自動代碼生成)
- [方案 3：動態 API 文件](#方案-3動態-api-文件)
- [測試 API](#測試-api)

---

## 概述

OpenAPI 規範提供了一個標準的方式來描述 REST API。它可以用於：

- 📖 自動生成 API 文件（Swagger UI）
- 🧪 API 測試工具整合（Postman、Insomnia）
- 🔧 程式碼生成（客戶端、伺服器）
- 📝 API 版本控制和文件化

---

## 方案 1：手動 OpenAPI 規範

適合：小型專案或對 API 變更不頻繁的專案

### 1.1 建立 OpenAPI 文件

**`docs/openapi.yaml`**

```yaml
openapi: 3.0.0
info:
  title: Gravito DDD Starter API
  description: |
    Gravito DDD Starter - 一個基於 Domain-Driven Design 的現代化 TypeScript API 框架。

    此 API 使用 RESTful 設計模式，遵循 DDD 原則組織業務邏輯。
  version: 1.0.0
  contact:
    name: API Support
    url: https://github.com/gravito-framework/gravito-ddd-starter
  license:
    name: MIT
    url: https://opensource.org/licenses/MIT

servers:
  - url: http://localhost:3000
    description: 本地開發環境
  - url: https://api.example.com
    description: 正式環境

tags:
  - name: Health
    description: 應用程式健康狀態檢查
  - name: Products
    description: 產品管理 API
  - name: BlogPosts
    description: 部落格文章管理 API

paths:
  /health:
    get:
      summary: 健康檢查
      description: 檢查應用程式的健康狀態
      operationId: getHealth
      tags:
        - Health
      responses:
        '200':
          description: 應用程式正常運行
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    example: healthy
                  timestamp:
                    type: string
                    format: date-time
                  uptime:
                    type: integer
                    description: 運行時間（秒）
                  environment:
                    type: string
                    example: development

  /api:
    get:
      summary: API 根端點
      description: 獲取可用的 API 端點清單
      operationId: getApiRoot
      tags:
        - Health
      responses:
        '200':
          description: API 端點清單
          content:
            application/json:
              schema:
                type: object
                properties:
                  endpoints:
                    type: array
                    items:
                      type: string

  /api/products:
    get:
      summary: 列出所有產品
      description: 獲取所有產品的清單
      operationId: listProducts
      tags:
        - Products
      parameters:
        - name: status
          in: query
          description: 按狀態過濾
          schema:
            type: string
            enum: [draft, published, archived]
        - name: limit
          in: query
          description: 結果限制
          schema:
            type: integer
            default: 10
        - name: offset
          in: query
          description: 分頁偏移
          schema:
            type: integer
            default: 0
      responses:
        '200':
          description: 產品清單
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/Product'
                  meta:
                    type: object
                    properties:
                      total:
                        type: integer
                      limit:
                        type: integer
                      offset:
                        type: integer

    post:
      summary: 建立新產品
      description: 建立一個新的產品
      operationId: createProduct
      tags:
        - Products
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateProductRequest'
      responses:
        '201':
          description: 產品建立成功
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  data:
                    type: object
                    properties:
                      id:
                        type: string
                        format: uuid
                  message:
                    type: string
        '400':
          description: 無效的請求
          $ref: '#/components/responses/ValidationError'
        '422':
          description: 驗證失敗
          $ref: '#/components/responses/ValidationError'

  /api/products/{id}:
    get:
      summary: 獲取單個產品
      description: 根據 ID 獲取產品詳細資訊
      operationId: getProduct
      tags:
        - Products
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: 產品詳細資訊
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  data:
                    $ref: '#/components/schemas/Product'
        '404':
          description: 產品不存在
          $ref: '#/components/responses/NotFound'

    patch:
      summary: 更新產品
      description: 更新產品資訊
      operationId: updateProduct
      tags:
        - Products
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
                price:
                  type: number
                  minimum: 0
      responses:
        '200':
          description: 產品更新成功
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  data:
                    $ref: '#/components/schemas/Product'
        '404':
          description: 產品不存在
          $ref: '#/components/responses/NotFound'

    delete:
      summary: 刪除產品
      description: 刪除指定的產品
      operationId: deleteProduct
      tags:
        - Products
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '204':
          description: 產品已刪除
        '404':
          description: 產品不存在
          $ref: '#/components/responses/NotFound'

components:
  schemas:
    Product:
      type: object
      required:
        - id
        - name
        - description
        - price
        - status
        - sku
      properties:
        id:
          type: string
          format: uuid
          description: 產品唯一識別碼
        name:
          type: string
          minLength: 1
          maxLength: 255
          description: 產品名稱
        description:
          type: string
          description: 產品描述
        price:
          type: number
          minimum: 0
          description: 產品價格
        currency:
          type: string
          default: USD
          description: 貨幣代碼
        status:
          type: string
          enum: [draft, published, archived]
          description: 產品狀態
        sku:
          type: string
          description: 產品 SKU（庫存單位）
        createdAt:
          type: string
          format: date-time
          description: 建立時間
        updatedAt:
          type: string
          format: date-time
          description: 更新時間

    CreateProductRequest:
      type: object
      required:
        - name
        - description
        - price
        - sku
      properties:
        name:
          type: string
          minLength: 1
          maxLength: 255
          example: iPhone 15 Pro
        description:
          type: string
          example: 最新的 iPhone 專業版本
        price:
          type: number
          minimum: 0.01
          example: 999.99
        currency:
          type: string
          default: USD
          example: USD
        sku:
          type: string
          example: IPHONE-15-PRO-256GB
        status:
          type: string
          enum: [draft, published]
          default: draft

    Error:
      type: object
      required:
        - success
        - error
      properties:
        success:
          type: boolean
          example: false
        error:
          type: string
          description: 錯誤訊息
        code:
          type: string
          description: 錯誤碼
        errors:
          type: object
          description: 欄位級別的驗證錯誤

  responses:
    ValidationError:
      description: 驗證錯誤
      content:
        application/json:
          schema:
            allOf:
              - $ref: '#/components/schemas/Error'
              - type: object
                properties:
                  errors:
                    type: object
                    additionalProperties:
                      type: string

    NotFound:
      description: 資源不存在
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'

    InternalServerError:
      description: 伺服器內部錯誤
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
```

### 1.2 提供 Swagger UI

安裝 Swagger UI：

```bash
bun add swagger-ui-express
bun add -D @types/swagger-ui-express
```

在 `src/index.ts` 中整合：

```typescript
import swaggerUi from 'swagger-ui-express'
import yaml from 'yaml'
import { readFileSync } from 'fs'
import { join } from 'path'

async function bootstrap() {
  const core = await createApp()

  // 讀取 OpenAPI 規範
  const openapiPath = join(import.meta.dir, '../docs/openapi.yaml')
  const openapiFile = readFileSync(openapiPath, 'utf-8')
  const openapiSpec = yaml.parse(openapiFile)

  // 設定 Swagger UI
  core.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(openapiSpec, {
      customCss: '.swagger-ui { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }',
      customSiteTitle: 'Gravito API Documentation'
    })
  )

  // ... 其他設定
}
```

訪問 `http://localhost:3000/api-docs` 查看文檔。

---

## 方案 2：自動代碼生成

適合：大型專案或 API 頻繁變更

### 2.1 使用 @gravito/swagger (假設支援)

```bash
bun add @gravito/swagger
```

在控制器中使用裝飾器：

```typescript
import { ApiOperation, ApiResponse } from '@gravito/swagger'

export class ProductController {
  @ApiOperation({
    summary: '建立產品',
    description: '建立一個新的產品'
  })
  @ApiResponse(201, Product)
  async create(request: Request) {
    // ...
  }
}
```

自動生成 OpenAPI 規範：

```bash
bun run generate:openapi
```

### 2.2 使用 Tsoa

如果需要更強大的功能，可以使用 Tsoa：

```bash
bun add -D tsoa
```

設定 `tsoa.json`：

```json
{
  "entryFile": "src/index.ts",
  "noImplicitAdditionalProperties": "throw-on-extras",
  "controllerPathGlobs": ["src/**/*Controller.ts"],
  "spec": {
    "outputDirectory": "docs",
    "specVersion": 3
  }
}
```

在路由中使用：

```typescript
import { route } from 'tsoa'

@route('products')
export class ProductController {
  /**
   * 建立產品
   */
  @post()
  @response(201, 'Product created')
  async create(@body() dto: CreateProductDTO) {
    // ...
  }
}
```

---

## 方案 3：動態 API 文件

適合：高度動態的 API

### 3.1 建立 API 文件生成器

**`src/Shared/Infrastructure/OpenAPIGenerator.ts`**

```typescript
import { Context } from '@gravito/core'

/**
 * 動態 OpenAPI 規範生成器
 */
export class OpenAPIGenerator {
  generate(context: Context) {
    return {
      openapi: '3.0.0',
      info: {
        title: 'Gravito DDD Starter API',
        version: '1.0.0'
      },
      servers: [
        {
          url: `http://localhost:${process.env.PORT || 3000}`,
          description: 'Development server'
        }
      ],
      paths: this.generatePaths(context),
      components: {
        schemas: this.generateSchemas()
      }
    }
  }

  private generatePaths(context: Context) {
    // 根據註冊的路由自動生成路徑
    const paths = {}
    // ... 實作邏輯
    return paths
  }

  private generateSchemas() {
    return {
      // ... 常見的 schema
    }
  }
}
```

---

## 測試 API

### 使用 Swagger UI

1. 啟動應用程式：
   ```bash
   bun run dev
   ```

2. 訪問 API 文檔：
   ```
   http://localhost:3000/api-docs
   ```

3. 在 Swagger UI 中測試端點

### 使用 Insomnia

1. 在 Insomnia 中導入 OpenAPI 規範：
   - Design → New Document → Paste OpenAPI Spec

2. 選擇環境設定：
   ```
   base_url: http://localhost:3000
   ```

3. 開始測試 API

### 使用 Postman

1. 建立新的 Postman Collection
2. 導入 OpenAPI 規範：
   File → Import → Choose `docs/openapi.yaml`

3. 在 Postman 中測試所有端點

---

## 最佳實踐

✅ **更新規範**
- 每次 API 變更時更新 OpenAPI 規範
- 將 OpenAPI 文件與程式碼一起版本控制

✅ **保持一致**
- 確保 OpenAPI 規範與實際 API 實作同步
- 自動測試可以驗證一致性

✅ **文件清晰**
- 為所有端點提供有意義的描述
- 包含請求和回應範例
- 列出所有可能的錯誤狀態碼

❌ **避免的錯誤**
- 不要讓 OpenAPI 文件過時
- 不要省略錯誤回應文檔
- 不要忽視安全性（驗證、授權）

---

## 相關資源

- 📖 [OpenAPI 3.0 規範](https://spec.openapis.org/oas/v3.0.0)
- 🛠️ [Swagger Editor](https://editor.swagger.io/)
- 📚 [API 文件最佳實踐](https://swagger.io/blog/)
- 🔗 [Insomnia 文檔](https://insomnia.rest/documentation)
