# Config 目錄結構

集中管理應用和工具配置。

## 目錄組織

```
config/
├── app/               ← 應用級別配置
│   ├── app.ts        (應用核心)
│   ├── database.ts   (資料庫)
│   ├── cache.ts      (快取)
│   ├── redis.ts      (Redis)
│   ├── orbits.ts     (Orbits 註冊)
│   ├── types.ts      (型別定義)
│   └── index.ts      (導出入口)
├── tools/            ← 工具配置
│   └── drizzle.config.ts  (Drizzle Kit)
└── README.md         (本檔案)
```

## 應用配置 (config/app/)

由 `config/app/index.ts` 匯出，在 bootstrap 組裝給 `defineConfig`。

```typescript
import { buildConfig, useDatabase } from '../config/app'

defineConfig({
  config: buildConfig(port),
  orbits: [OrbitPrism, ...(useDatabase ? [OrbitAtlas] : [])],
})
```

### 檔案說明

| 檔案 | 用途 |
|------|------|
| `app.ts` | 應用：name、env、port、VIEW_DIR、debug、url |
| `database.ts` | Atlas ORM（ENABLE_DB !== 'false' 時注入） |
| `cache.ts` | Stasis 快取（可選） |
| `redis.ts` | Redis 設定（可選） |
| `orbits.ts` | Gravito Orbits 註冊（Prism、Atlas、Plasma 等） |
| `types.ts` | 型別（AppConfig 等） |
| `index.ts` | 匯出各 config、`buildConfig(port?)`、`useDatabase` |

## 工具配置 (config/tools/)

特定工具的設定檔，例如 Drizzle Kit、PostCSS 等。

```
config/tools/
├── drizzle.config.ts      ← Drizzle Kit ORM
└── ...（未來可添加其他工具）
```

### Drizzle 配置

實際配置在 `config/tools/drizzle.config.ts`，根目錄的 `drizzle.config.ts` 為轉發檔案，供 Drizzle Kit 自動發現。

## 環境變數

見專案根目錄 `.env.example`。

## 新增配置時

- **應用邏輯配置** → `config/app/`
- **工具特定設定** → `config/tools/`

新增模組時若需改動 Orbits 或設定，請對照 [docs/MODULE_ADD_CHECKLIST.md](../docs/MODULE_ADD_CHECKLIST.md) 的「選做設定」。
