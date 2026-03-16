# DCI (Data-Context-Interaction) 模式實作指南

## 概述

在傳統的 DDD 中，業務邏輯往往被分散在 **Domain Service** 或變得肥大的 **Entity** 中。Gravito DDD 引入了 **DCI (Data-Context-Interaction)** 模式，旨在解決「對象在不同場景下具有不同行為」的問題。

DCI 的核心思想是將 **數據 (Data)** 與 **行為 (Interaction)** 分離，並透過 **場景 (Context)** 將它們動態結合。

---

## DCI 三大組件

### 1. Data (數據層)
- **對象**: Domain Entities / Value Objects。
- **特徵**: 只包含狀態和基本驗證（例如 `isValidEmail`），不包含複雜的跨對象互動邏輯。
- **角色**: 它是演員，本身只有基本的屬性。

### 2. Context (場景層)
- **對象**: Application Services 或專用的 Context 類。
- **特徵**: 定義了一個業務場景（例如「轉帳」、「結帳」）。它負責識別參與者，並將 **Role (角色)** 賦予 **Data**。
- **角色**: 它是劇本，決定了演員在這一幕中該做什麼。

### 3. Interaction (交互層)
- **對象**: Role 介面及其方法。
- **特徵**: 定義了角色在特定場景下的行為。
- **角色**: 這是演員在劇本中的演出動作。

---

## 實作範例：銀行轉帳 (Bank Transfer)

### 1. Data 層 (Entity)

```typescript
// Domain/Entities/Account.ts
export class Account extends BaseEntity {
  balance: number;
  
  constructor(id: string, balance: number) {
    super(id);
    this.balance = balance;
  }
}
```

### 2. Interaction 層 (Roles)

在 DCI 中，角色是臨時的。我們定義演員在轉帳場景中需要扮演的角色。

```typescript
// Application/Contexts/TransferContext/Roles.ts

export interface TransferSource {
  withdraw(amount: number): void;
}

export interface TransferDestination {
  deposit(amount: number): void;
}
```

### 3. Context 層 (劇本)

這是最關鍵的部分。Context 負責協調兩個 Account，讓它們分別扮演「轉帳發起者」與「接收者」。

```typescript
// Application/Contexts/TransferContext/TransferContext.ts

import { Account } from '../../Domain/Entities/Account';
import { TransferSource, TransferDestination } from './Roles';

export class TransferContext {
  constructor(
    private source: Account,
    private destination: Account,
    private amount: number
  ) {}

  async execute(): Promise<void> {
    // 1. 賦予角色 (Role Binding)
    // 在 TypeScript 中，我們可以透過擴展或簡單的轉譯器來實現行為注入
    // 這裡使用最直觀的裝飾器/包裝器模式
    const sourceRole = this.bindSource(this.source);
    const destRole = this.bindDestination(this.destination);

    // 2. 執行交互 (Interaction)
    if (this.source.balance < this.amount) {
      throw new Error("餘額不足");
    }

    sourceRole.withdraw(this.amount);
    destRole.deposit(this.amount);
    
    // 3. 觸發領域事件 (選配)
    // this.source.recordEvent(new MoneyTransferredEvent(...));
  }

  private bindSource(acc: Account): TransferSource {
    return {
      withdraw: (amount: number) => { acc.balance -= amount; }
    };
  }

  private bindDestination(acc: Account): TransferDestination {
    return {
      deposit: (amount: number) => { acc.balance += amount; }
    };
  }
}
```

---

## 在 Application Service 中呼叫

```typescript
// Application/Services/TransferService.ts
export class TransferService {
  constructor(private repo: IAccountRepository) {}

  async handle(fromId: string, toId: string, amount: number) {
    const fromAcc = await this.repo.findById(fromId);
    const toAcc = await this.repo.findById(toId);

    const context = new TransferContext(fromAcc, toAcc, amount);
    await context.execute();

    await this.repo.save(fromAcc);
    await this.repo.save(toAcc);
  }
}
```

---

## 為什麼要用 DCI？

1.  **避免肥大的實體 (Anemic vs Fat Entity)**:
    - Entity 保持精簡，只包含該對象在「所有場景」下都適用的邏輯。
    - 轉帳邏輯只在轉帳時存在，查詢餘額時不需要知道如何轉帳。
2.  **代碼即業務 (Readable Code)**:
    - 在 `TransferContext` 中，你可以一眼看出誰是 Source，誰是 Destination。
3.  **易於擴展**:
    - 如果未來需要增加「手續費」或「多幣種轉換」，只需要修改 `TransferContext` 或增加新的 Role，而不需要更動底層的 `Account` 實體。

---

## 最佳實踐

- **Context 應該是短命的**: 只在一次 Request 或一個 Use Case 中存在。
- **避免跨 Context 依賴**: 一個 Context 處理一個完整的業務場景。
- **與領域事件結合**: Interaction 執行完畢後，由 Context 負責收集領域事件並發布。

---
*最後更新: 2026-03-16*
