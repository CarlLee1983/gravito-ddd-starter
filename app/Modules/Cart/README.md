# Cart 模組

購物車模組，實現使用者購物車的管理與結帳功能。

## 架構設計

### Domain 層（業務邏輯）

#### 聚合根
- **Cart**: 購物車聚合根，每個使用者有一個
  - 狀態：項目清單、建立時間
  - 行為：addItem、removeItem、updateItemQuantity、clear、requestCheckout
  - 不知道任何 ORM 或 HTTP

#### 實體
- **CartItem**: 購物車內項目實體（內部實體，非聚合根）

#### 值物件
- **CartId**: 購物車識別符（userId + "_cart"）
- **CartItemId**: 購物車項目識別符
- **Quantity**: 數量（1-99）

#### 事件
- **CartCreated**: 購物車建立
- **ItemAdded**: 商品加入
- **ItemRemoved**: 商品移除
- **ItemQuantityChanged**: 數量變更
- **CartCleared**: 購物車清空
- **CartCheckoutRequested**: 結帳請求（供 Order Context 監聽）

#### Port（防腐層介面）
- **IProductQueryPort**: 查詢商品價格（隱藏 Product Context）

### Application 層（使用案例）

#### 服務
- **AddItemToCartService**: 加入商品
- **RemoveItemFromCartService**: 移除商品
- **CheckoutCartService**: 結帳處理

#### DTOs
- **AddItemDTO**: 加入商品請求
- **CartResponseDTO**: 購物車回應

### Infrastructure 層（技術實現）

#### Repository
- **CartRepository**: Event Sourcing 型購物車倉儲

#### 適配器（防腐層實現）
- **ProductCatalogAdapter**: Product Context 防腐層
  - 隱藏 Product 模組複雜性
  - 只公開 Cart 需要的價格資訊

#### Service Provider
- **CartServiceProvider**: DI 容器配置
- **registerCartRepositories**: Repository 工廠

### Presentation 層（HTTP 層）

#### 控制器
- **CartController**: 處理 HTTP 請求

#### 路由
```
GET    /carts/:userId           - 取得購物車
POST   /carts/:userId/items     - 加入商品
DELETE /carts/:userId/items/:productId - 移除商品
PATCH  /carts/:userId/items/:productId - 更新數量
DELETE /carts/:userId           - 清空購物車
POST   /carts/:userId/checkout  - 結帳
```

## 防腐層設計

### ProductCatalogAdapter

Cart 模組完全無法感知 Product 模組的內部實現，只通過 **IProductQueryPort** 防腐層介面查詢商品價格。

```typescript
// Domain 層定義 Port
export interface IProductQueryPort {
  getProductPrice(productId: string): Promise<{ exists: boolean; price?: number } | null>
}

// Infrastructure 層實現
export class ProductCatalogAdapter implements IProductQueryPort {
  async getProductPrice(productId: string): Promise<{ exists: boolean; price?: number } | null> {
    const product = await this.productRepository.findById(productId)
    return { exists: !!product, price: product?.price.amount }
  }
}
```

## Event Sourcing

Cart 採用 Event Sourcing 架構：

1. 所有狀態變更都通過事件驅動
2. 事件持久化至 EventStore
3. Repository 透過重放事件重建聚合根
4. 事件分派至其他 Bounded Context（如 Order）

## 模組依賴

```
Cart Domain
  ├─ Product Domain (僅通過防腐層)
  └─ User Domain (可視需要擴展)

Cart Application
  ├─ Cart Domain
  └─ IProductQueryPort (Port)

Cart Infrastructure
  ├─ Cart Domain
  ├─ ProductCatalogAdapter (防腐層)
  └─ BaseEventSourcedRepository (Shared)
```

## 使用示例

### 加入商品
```bash
curl -X POST http://localhost:3000/carts/user123/items \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "prod456",
    "quantity": 2
  }'
```

### 結帳
```bash
curl -X POST http://localhost:3000/carts/user123/checkout
```

## 核心特性

✅ **Event Sourcing**: 所有狀態變更持久化
✅ **防腐層隔離**: Product Context 完全隱藏
✅ **跨 Context 事件**: CartCheckoutRequested 供 Order 監聽
✅ **ORM 無關**: 依賴 IDatabaseAccess 抽象
✅ **DDD 分層**: Domain 無依賴，Application 無 ORM，Infrastructure 可替換

## 相關文檔

- [Cart Module Design](./CART_MODULE_DESIGN.md)
- [防腐層設計模式](../../docs/05-Anti-Corruption-Layer/ACL_PATTERN.md)
- [Event Sourcing](../../docs/03-Domain-Driven-Design/EVENT_SOURCING.md)
