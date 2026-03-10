/**
 * IPostRepository
 * Post 倉庫介面（倒依賴）
 */

export interface IPostRepository {
	findAll(): Promise<any[]>
	findById(id: string): Promise<any | null>
	save(entity: any): Promise<void>
	delete(id: string): Promise<void>
}
