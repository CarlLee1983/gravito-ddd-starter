
# Infrastructure Layer (基礎設施層)

基礎設施層提供技術實現，將外部工具適配到系統的 Ports。

## 技術適配器 (Adapters)

- **Database**:
  - **Atlas**: 高效能 ORM 適配，支援 PostgreSQL/SQLite/MySQL。
  - **Drizzle**: 輕量級 SQL 適配。
  - **Memory**: 測試與開發用的內存資料庫。
- **Messaging**:
  - **Redis**: 非同步事件與 Job 隊列。
  - **RabbitMQ**: 高可靠訊息交換與整合事件分發。
- **Services**:
  - **Logger**: 對接 Sentinel 的日誌系統。
  - **Mailer**: 對接 Signal 的郵件系統。
  - **Storage**: Drive 風格的磁碟管理（Local/S3）。
  - **i18n**: 多語系翻譯系統。

## 裝配與註冊 (Registries)

- **EventListenerRegistry**: 中心化事件監聽器註冊，解耦模組間的依賴。
- **JobRegistry**: 中心化背景任務註冊。

## 設計規約

1. **介面隔離**: 適配器必須實現位於 `Ports` 中的介面。
2. **隱藏細節**: 應用層不應知道底層使用的是哪種具體技術實現。
3. **第三方庫耦合**: 這是唯一允許引入特定技術框架庫的地方。
