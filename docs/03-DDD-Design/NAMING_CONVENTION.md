# 🗣️ 通用語言與命名規範 (Ubiquitous Language)

在 DDD 中，代碼即語言。我們必須確保業務專家、開發者與代碼之間使用相同的術語。

---

## 1. 核心原則
- **拒絕技術術語**: 在 Domain 層，使用 `User.deactivate()` 而非 `User.setStatus(0)`.
- **業務導向**: 變數名稱應反映其業務含義，而非資料型別（如使用 `retryCount` 而非 `countInt`）。
- **一致性**: 一個業務概念在所有層級（從資料庫到 UI）應使用相同的名詞。

---

## 2. 各層命名契約

### 領域層 (Domain Layer)
| 組件 | 命名規範 | 範例 |
| :--- | :--- | :--- |
| **實體 (Entity)** | 單數名詞 | `User`, `Post`, `Order` |
| **值物件 (VO)** | 屬性名詞 | `Email`, `Address`, `Money` |
| **領域服務** | `[業務動作]Service` | `AuthenticationService` |
| **領域事件** | `[名詞][過去分詞]` | `UserCreated`, `OrderPaid` |
| **Repository 介面** | `I[名詞]Repository` | `IUserRepository` |

### 應用層 (Application Layer)
| 組件 | 命名規範 | 範例 |
| :--- | :--- | :--- |
| **應用服務** | `[動詞][名詞]Service` | `CreateUserService`, `PlaceOrderService` |
| **DTO** | `[名詞]DTO` | `UserDTO`, `OrderSummaryDTO` |
| **Port (介面)** | `I[功能]Port` | `IPaymentGatewayPort` |

### 表現層 (Presentation Layer)
| 組件 | 命名規範 | 範例 |
| :--- | :--- | :--- |
| **控制器** | `[名詞]Controller` | `UserController` |
| **路由** | 複數名詞 (RESTful) | `/users`, `/orders` |

---

## 3. 動詞準則 (業務語意)
在定義方法時，優先使用具備業務意圖的動詞：

| 業務動作 | 推薦動詞 | 避免使用的動詞 |
| :--- | :--- | :--- |
| 建立 | `register`, `place`, `onboard` | `create`, `add` |
| 更新 | `change`, `rename`, `adjust` | `update`, `modify` |
| 刪除 | `remove`, `cancel`, `archive` | `delete`, `drop` |
| 查詢 | `find`, `match`, `search` | `get` (除非是純 Getter) |

最後更新: 2026-03-13
