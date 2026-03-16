
# Application Layer (應用層)

應用層負責協調業務流程，它是領域層與外部世界的橋樑。

## 核心組件

- **BaseDTO**: 基礎資料傳輸物件，用於跨層級傳遞純數據。
- **CQRS 支援**:
  - `IQuerySide`: 定義讀取側（Read Side）的標準介面，支援過濾與分頁。
- **背景任務系統**:
  - `BaseJob`: Job 基類，定義重試、延遲與處理邏輯。
  - `IQueueWorker`: Worker 介面，支援優雅關閉（Graceful Shutdown）。
  - `SystemWorker`: 統一的背景處理器，同時消費領域事件與系統 Job。
  - `dispatchJob`: 類型安全的 Job 推送工具。

## 設計規約

1. **無狀態性**: 應用服務不應持有狀態。
2. **事務管理**: 複雜的業務流程應在應用層啟動資料庫事務（透過 `IDatabaseAccess.transaction`）。
3. **錯誤處理**: 捕獲領域異常並轉換為應用層可理解的錯誤，或透傳給展示層。
