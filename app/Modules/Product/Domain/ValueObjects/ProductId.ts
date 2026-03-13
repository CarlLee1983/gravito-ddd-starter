import { ValueObject } from '@/Shared/Domain/ValueObject'
import { v4 as uuid } from 'uuid'

interface ProductIdProps extends Record<string, unknown> {
  readonly value: string
}

export class ProductId extends ValueObject<ProductIdProps> {
  private constructor(props: ProductIdProps) {
    super(props)
  }

  static create(value?: string): ProductId {
    const id = value || uuid()
    ProductId.validate(id)
    return new ProductId({ value: id })
  }

  static reconstitute(value: string): ProductId {
    ProductId.validate(value)
    return new ProductId({ value })
  }

  private static validate(value: string): void {
    if (!value || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
      throw new Error('Invalid ProductId format')
    }
  }

  get value(): string {
    return this.props.value
  }

  toString(): string {
    return this.props.value
  }
}
