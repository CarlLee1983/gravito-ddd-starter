
# Domain Layer (領域層)

領域層是整個系統的核心，包含所有的業務邏輯與規則。

## 核心組件

- **BaseEntity**: 實體基類，具備唯一的 Identity (ID) 與時間戳。
- **AggregateRoot**: 聚合根基類，支援領域事件的產生與版本控制（樂觀鎖）。
- **ValueObject**: 值對象，不可變且基於屬性值判斷相等性。
- **DomainEvent**: 領域事件，代表領域中發生的重要事實。
- **IntegrationEvent**: 整合事件，跨 Bounded Context 的通訊契約，只包含 JSON 可序列化的原始型別。
- **Exceptions**: 定義如 `EntityNotFoundException`、`ValidationException` 等業務異常。
- **IRepository**: 倉儲介面，定義實體的持久化合約。

## 設計規約

1. **業務規則保護**: 所有的驗證與狀態變更邏輯應封裝在實體或聚合根內部。
2. **事件驅動**: 聚合根變更應產生領域事件，透過 `recordEvent` 記錄。
3. **不可變性**: 值對象一旦建立不可修改，變更屬性需建立新的實體。
