import { describe, it, expect } from 'bun:test'
import { ValueObject } from '@/Shared/Domain/ValueObject'

/**
 * 测试 ValueObject 的泛型、结构相等性、不可变性
 */

// 测试用具体实现
interface EmailProps {
  readonly value: string
}

class Email extends ValueObject<EmailProps> {
  private constructor(props: EmailProps) {
    super(props)
  }

  static create(value: string): Email {
    return new Email({ value })
  }

  get value(): string {
    return this.props.value
  }

  toString(): string {
    return this.props.value
  }
}

interface NameProps {
  readonly firstName: string
  readonly lastName: string
}

class FullName extends ValueObject<NameProps> {
  private constructor(props: NameProps) {
    super(props)
  }

  static create(firstName: string, lastName: string): FullName {
    return new FullName({ firstName, lastName })
  }

  get firstName(): string {
    return this.props.firstName
  }

  get lastName(): string {
    return this.props.lastName
  }

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`
  }

  toString(): string {
    return this.fullName
  }
}

describe('ValueObject -- 泛型支援', () => {
  it('應支援泛型型別參數', () => {
    const email = Email.create('test@example.com')
    expect(email.value).toBe('test@example.com')
  })

  it('應支援複雜型別的 Props', () => {
    const name = FullName.create('John', 'Doe')
    expect(name.firstName).toBe('John')
    expect(name.lastName).toBe('Doe')
    expect(name.fullName).toBe('John Doe')
  })
})

describe('ValueObject -- 結構相等性', () => {
  it('相同值的兩個 VO 應相等', () => {
    const email1 = Email.create('test@example.com')
    const email2 = Email.create('test@example.com')

    expect(email1.equals(email2)).toBe(true)
  })

  it('不同值的 VO 應不相等', () => {
    const email1 = Email.create('test1@example.com')
    const email2 = Email.create('test2@example.com')

    expect(email1.equals(email2)).toBe(false)
  })

  it('複雜物件的值相等性應基於內容', () => {
    const name1 = FullName.create('John', 'Doe')
    const name2 = FullName.create('John', 'Doe')
    const name3 = FullName.create('Jane', 'Doe')

    expect(name1.equals(name2)).toBe(true)
    expect(name1.equals(name3)).toBe(false)
  })

  it('不同型別的 VO 應不相等', () => {
    const email = Email.create('john@example.com')
    const name = FullName.create('john', 'example.com')

    expect(email.equals(name as any)).toBe(false)
  })

  it('與 null 比較應回傳 false', () => {
    const email = Email.create('test@example.com')
    expect(email.equals(null as any)).toBe(false)
  })

  it('與 undefined 比較應回傳 false', () => {
    const email = Email.create('test@example.com')
    expect(email.equals(undefined as any)).toBe(false)
  })
})

describe('ValueObject -- 不可變性', () => {
  it('props 應被凍結，無法直接修改', () => {
    const email = Email.create('test@example.com')
    expect(() => {
      ;(email as any).props.value = 'hacked@example.com'
    }).toThrow()
  })

  it('即使外部試圖修改引用，內部 props 應保持不變', () => {
    const email = Email.create('test@example.com')
    const originalValue = email.value

    // 嘗試外部修改
    ;(email as any)._value = 'modified'

    // 應仍返回原值
    expect(email.value).toBe(originalValue)
  })

  it('複雜型別的 props 應深層凍結', () => {
    const name = FullName.create('John', 'Doe')
    expect(() => {
      ;(name as any).props.firstName = 'Jane'
    }).toThrow()
  })
})

describe('ValueObject -- toString()', () => {
  it('應正確實現 toString()', () => {
    const email = Email.create('test@example.com')
    expect(email.toString()).toBe('test@example.com')
  })

  it('複雜 VO 的 toString() 應返回有意義的字串', () => {
    const name = FullName.create('John', 'Doe')
    expect(name.toString()).toBe('John Doe')
  })
})
