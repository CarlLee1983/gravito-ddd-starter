/**
 * PostRepository
 * Post 倉庫實現（Database-backed）
 *
 * 使用 IDatabaseAccess 與資料庫互動，支援完整的 CRUD 操作
 */

import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { IPostRepository } from '../../Domain/Repositories/IPostRepository'

export class PostRepository implements IPostRepository {
	constructor(private db: IDatabaseAccess) {}

	async findAll(): Promise<any[]> {
		return this.db.table('posts').select()
	}

	async findById(id: string): Promise<any | null> {
		return this.db.table('posts').where('id', id).first()
	}

	async save(entity: any): Promise<void> {
		const exists = await this.findById(entity.id)
		if (exists) {
			await this.db.table('posts').where('id', entity.id).update(entity)
		} else {
			await this.db.table('posts').insert(entity)
		}
	}

	async delete(id: string): Promise<void> {
		await this.db.table('posts').where('id', id).delete()
	}
}
