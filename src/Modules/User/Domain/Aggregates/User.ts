/**
 * User Aggregate Root
 */

export interface UserProps {
  id: string
  name: string
  email: string
  createdAt: Date
}

export class User {
  private constructor(private props: UserProps) {}

  static create(id: string, name: string, email: string): User {
    return new User({
      id,
      name,
      email,
      createdAt: new Date(),
    })
  }

  get id(): string {
    return this.props.id
  }

  get name(): string {
    return this.props.name
  }

  get email(): string {
    return this.props.email
  }

  get createdAt(): Date {
    return this.props.createdAt
  }
}
