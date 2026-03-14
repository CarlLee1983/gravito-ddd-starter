import type { IDatabaseAccess } from '@/Foundation/Infrastructure/Ports/Database/IDatabaseAccess'
import { PaymentRepository } from '../Repositories/PaymentRepository'
import { getRegistry } from '@wiring/RepositoryRegistry'

export function registerPaymentRepositories(db: IDatabaseAccess): void {
	const registry = getRegistry()
	registry.register('payment', () => {
		return new PaymentRepository(db)
	})
}
