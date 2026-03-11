# Configs 目錄結構

專責存放特定工具和套件的設定檔，保持根目錄和 `config/` 目錄的乾淨。

## 目錄組織

```
configs/
├── packages/              # 特定套件的設定檔
│   ├── drizzle.config.ts  # Drizzle Kit ORM 設定
│   └── ...
└── README.md              # 本檔案
```

## 原則

1. **應用配置** → `config/` 目錄
   - app、database、cache、redis、orbits 等應用層級配置

2. **套件配置** → `configs/packages/` 目錄
   - Drizzle、Vite、PostCSS 等工具的設定檔

3. **轉發設置** → 根目錄（保持工具自動發現）
   - `drizzle.config.ts` - 指向 `configs/packages/drizzle.config.ts`
   - 其他工具配置如有需要可類似處理

## 如何新增套件配置

新增特定工具的配置時：

1. **在 `configs/packages/` 中建立配置檔**
   ```bash
   # 例：新增 Vite 配置
   configs/packages/vite.config.ts
   ```

2. **在根目錄建立轉發檔案**（若工具期望根目錄位置）
   ```typescript
   // vite.config.ts
   export { default } from './configs/packages/vite.config.ts'
   ```

3. **更新本 README** - 記錄新增的設定

## 管理原則

- ❌ 不在根目錄堆積工具配置
- ❌ 不混淆應用配置和工具配置
- ✅ 應用邏輯相關 → `config/`
- ✅ 工具相關 → `configs/packages/`
