# 翻譯簡寫方案決策樹

快速確定應該使用哪個方案。

---

## 決策流程圖

```
開始
  ↓
  你需要編譯時檢查嗎？
  ├─ 否 → 方案 2B（TypeScript Proxy）
  │       優點：最簡潔的語法
  │       缺點：無編譯時檢查
  │
  └─ 是 → 你需要參數類型推斷嗎？
          ├─ 否 → 方案 1（Message Constants）
          │       優點：實現最簡單
          │       缺點：仍無法防止參數錯誤
          │
          └─ 是 → 你對 DDD 分層有要求嗎？
                  ├─ 否 → 方案 3（Shorthand Methods）
                  │       優點：快速改進現有代碼
                  │       缺點：Presentation 層混淆
                  │
                  └─ 是 → 願意編寫 Service 類嗎？
                          ├─ 是 → 方案 4（Message Service）⭐
                          │       優點：最符合 DDD，易於測試
                          │       缺點：初期編寫稍長
                          │
                          └─ 否 → 方案 5（Generic Message Handler）
                                  優點：自動推斷
                                  缺點：TypeScript 複雜，維護困難
```

---

## 快速選擇表

### 根據項目特性選擇

#### 新專案/綠地開發
```
優先級 1: 方案 4 (Message Service)
  → 最符合 DDD
  → 易於擴展
  → 長期維護成本最低

優先級 2: 方案 4 + Code Generation
  → 自動生成 Message Service
  → 完全無手工維護
```

#### 現有項目快速改進
```
優先級 1: 方案 3 (Shorthand Methods)
  → 最小改動
  → 立竿見影
  → 5 分鐘內可看到效果

優先級 2: 分階段遷移到方案 4
  → 慢慢重構
  → 不影響業務
```

#### 對類型安全要求極高
```
優先級 1: 方案 5 (Generic Message Handler)
  → 完整編譯時檢查
  → 鍵名 + 參數都檢查

優先級 2: 方案 4 + 自動生成
  → 更易維護
  → 幾乎同樣的類型安全
```

#### 簡單訊息系統
```
優先級 1: 方案 1 (Message Constants)
  → 無過度設計
  → 足夠解決問題

優先級 2: 不做改變
  → 成本效益不高
```

---

## 場景分析

### 場景 A：快速啟動小型應用

**特徵**:
- 訊息數量少（< 50 個）
- 團隊小（< 5 人）
- 優先上線，後續改進

**推薦**: 方案 1 + 方案 3
```typescript
// 步驟 1：定義常量（5 分鐘）
export const AuthMessages = {
  INVALID_CREDENTIALS: 'auth.login.invalid_credentials',
} as const

// 步驟 2：Controller 中使用常量（10 分鐘）
this.translator.trans(AuthMessages.INVALID_CREDENTIALS)
```

**成本**: ~15 分鐘
**收益**: 編譯時檢查 + 減少拼寫錯誤

---

### 場景 B：中型企業應用

**特徵**:
- 訊息數量中等（100-500 個）
- 團隊中等（5-20 人）
- 需要規範的架構
- 未來可能有多語言擴展

**推薦**: 方案 4（Message Service）
```typescript
// 步驟 1：定義 Port 介面（30 分鐘）
export interface IAuthMessages { ... }

// 步驟 2：實現 Service（30 分鐘）
export class AuthMessageService { ... }

// 步驟 3：註冊 DI（10 分鐘）
container.singleton('authMessages', ...)

// 步驟 4：遷移 Controller（30 分鐘）
this.authMessages.loginInvalidCredentials()
```

**成本**: ~2 小時（首次模組）+ 30 分鐘（後續模組）
**收益**:
- ✅ 編譯時檢查
- ✅ 參數類型安全
- ✅ DDD 分層清晰
- ✅ 易於測試

---

### 場景 C：複雜、高度動態的系統

**特徵**:
- 訊息數量龐大（> 1000）
- 動態訊息模板
- 複雜的國際化需求
- 實時訊息更新

**推薦**: 方案 4 + Code Generation + CDN
```typescript
// 步驟 1：自動生成 Message Service（1 分鐘）
bun scripts/generate-messages.ts auth

// 步驟 2：CDN 存儲翻譯檔（動態加載）
const translations = await fetch('https://cdn.example.com/i18n/en/auth.json')

// 步驟 3：運行時更新 Translator（無需重啟）
translator.updateLocale('en', translations)
```

**成本**: 初期設置 ~4 小時，後續維護 ~30 分鐘/模組
**收益**:
- ✅ 自動化訊息生成
- ✅ 熱更新支持
- ✅ 零手工維護

---

### 場景 D：對類型安全有極致要求

**特徵**:
- 金融、醫療等高風險域
- 訊息錯誤可能造成嚴重後果
- 有預算做好基礎設施

**推薦**: 方案 5（Generic Message Handler）+ 類型檢查工具
```typescript
// 編譯時檢查：鍵名 + 參數都檢查
const msg = this.messages.trans(
  'auth.login.invalid_credentials'  // ✅ TS 檢查
  // { name: 'Carl' }  // ❌ TS 錯誤：無參數
)

const msg2 = this.messages.trans(
  'user.welcome_subject',
  { name: 'Carl' }  // ✅ TS 檢查
)
```

**成本**: ~8 小時（初期設置）
**收益**:
- ✅ 完全編譯時檢查
- ✅ 零運行時錯誤可能
- ❌ TypeScript 複雜度高

---

## 實施難度 vs 收益矩陣

```
高收益 ┌──────────────────────────────────┐
       │      方案 4 ⭐⭐⭐⭐⭐            │  低難度、高收益
       │  (Message Service)             │  最佳選擇
       │                                 │
       │  方案 3 ⭐⭐⭐⭐  方案 5 ⭐⭐⭐  │
       │(Shorthand)      (Generic)      │
       │                                 │
低收益 │  方案 1 ⭐  方案 2B ⭐⭐        │  高難度、低收益
       └──────────────────────────────────┘
       低難度          高難度
```

**四象限分析**:

| 象限 | 方案 | 特點 |
|------|------|------|
| 左上（高收益、低難度） | 方案 4 | ⭐ 強烈推薦 |
| 右上（高收益、高難度） | 方案 5 | 對類型安全有極致要求時才考慮 |
| 左下（低收益、低難度） | 方案 1 | 簡單項目可用 |
| 右下（低收益、高難度） | 方案 2B | 不推薦 |

---

## 遷移路徑建議

### 對現有項目的逐步改進

**第一階段**（0-2 周）- 快速贏得
```
使用方案 1：定義 Message Constants
時間: 2-4 小時
收益: 編譯時檢查，減少拼寫錯誤
```

**第二階段**（2-8 周）- 基礎改進
```
使用方案 3：添加 Shorthand Methods
時間: 8-16 小時
收益: 減少重複代碼
```

**第三階段**（8-16 周）- 完全遷移
```
使用方案 4：Message Service
時間: 每個模組 2-3 小時
收益: DDD 分層清晰 + 完整類型安全
```

**第四階段（可選）**（16+ 周）- 自動化
```
使用 Code Generation
時間: 4-6 小時（初期設置）
收益: 零手工維護，訊息與代碼同步
```

---

## 方案對比速查表

### 按優先級排列

| 排名 | 方案 | 最佳場景 | 實施時間 | 類型安全 | DDD 符合 |
|------|------|---------|---------|---------|---------|
| 1️⃣ | 方案 4 | 新專案、中大型應用 | 2-3h/模組 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 2️⃣ | 方案 3 | 快速改進現有項目 | 0.5-1h | ⭐⭐ | ⭐⭐ |
| 3️⃣ | 方案 1 | 簡單小型應用 | 0.5h | ⭐⭐⭐ | ⭐⭐⭐ |
| 4️⃣ | 方案 5 | 金融、醫療等高風險域 | 8h+ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| 5️⃣ | 方案 2B | （不推薦） | 1h | ⚠️⭐ | ⭐⭐ |

---

## 最終建議

### 對 gravito-ddd 的建議

鑑於 gravito-ddd 的特點（DDD 架構、中等項目規模、未來擴展），**強烈推薦**：

```
🎯 首選：方案 4（Message Service Object）

為什麼？
✅ 符合 DDD 分層原則
✅ 完整編譯時 + 類型檢查
✅ 可注入，易於測試
✅ 支持參數類型推斷
✅ 長期維護成本最低

進階選項：
🔄 配合 Code Generation 自動化
⏱️ 未來考慮方案 5（極致類型安全）

快速改進方案（如果時間緊張）：
🚀 先用方案 3，再逐步遷移到方案 4
```

### 實施優先級

1. **Session 模組**（現在有需求）→ 方案 4
2. **User 模組** → 方案 4
3. **其他模組** → 方案 4 + Code Generation
4. **Code Generation 自動化** → 進階優化

**預期收益**:
- 減少 40%+ 的翻譯相關 bug
- 改進代碼可讀性 30%+
- 測試覆蓋率提升 20%+
- 新開發效率提升 25%+

