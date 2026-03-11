/**
 * 聚合根基底類別 - Event Sourcing 支援
 *
 * @module AggregateRoot
 * @description 繼承 BaseEntity，提供：
 * - 事件產生 (raiseEvent)
 * - 事件回放 (loadFromEvents)
 * - 未提交事件管理 (getUncommittedEvents, markEventsAsCommitted)
 * - 聚合版本控制 (getVersion)
 *
 * 子類必須實作 applyEvent() 方法以定義事件如何影響聚合狀態。
 *
 * **DDD 角色**
 * - 核心：Aggregate Root（聚合根）
 * - 職責：維護聚合內部的完整性與一致性，管理領域事件。
 */

import { BaseEntity } from './BaseEntity'
import type { DomainEvent } from './DomainEvent'

/**
 * 聚合根抽象類別
 *
 * @abstract
 * @extends {BaseEntity}
 */
export abstract class AggregateRoot extends BaseEntity {
	/** 已套用事件的總數（聚合版本） */
	private appliedEventCount = 0

	/** 未提交的領域事件 */
	private uncommittedEvents: DomainEvent[] = []

	/**
	 * 產生領域事件：先套用狀態變更，再加入未提交清單
	 *
	 * @protected
	 * @param {DomainEvent} event - 要產生的領域事件
	 * @returns {void}
	 */
	protected raiseEvent(event: DomainEvent): void {
		this.applyEvent(event)
		this.uncommittedEvents.push(event)
		this.appliedEventCount++
	}

	/**
	 * 子類實作：定義單一事件如何影響聚合狀態
	 *
	 * @abstract
	 * @param {DomainEvent} event - 要套用的領域事件
	 * @returns {void}
	 */
	abstract applyEvent(event: DomainEvent): void

	/**
	 * 從事件流回放重建聚合狀態
	 * 只呼叫 applyEvent，不加入未提交事件
	 *
	 * @param {readonly DomainEvent[]} events - 事件流
	 * @returns {void}
	 */
	loadFromEvents(events: readonly DomainEvent[]): void {
		for (const event of events) {
			this.applyEvent(event)
			this.appliedEventCount++
		}
	}

	/**
	 * 取得未提交的領域事件（回傳唯讀副本）
	 *
	 * @returns {ReadonlyArray<DomainEvent>} 未提交事件清單
	 */
	getUncommittedEvents(): ReadonlyArray<DomainEvent> {
		return [...this.uncommittedEvents]
	}

	/**
	 * 標記所有事件為已提交，清除未提交清單
	 *
	 * @returns {void}
	 */
	markEventsAsCommitted(): void {
		this.uncommittedEvents = []
	}

	/**
	 * 取得聚合版本號（已套用事件的總數）
	 *
	 * @returns {number} 聚合版本號
	 */
	getVersion(): number {
		return this.appliedEventCount
	}
}
