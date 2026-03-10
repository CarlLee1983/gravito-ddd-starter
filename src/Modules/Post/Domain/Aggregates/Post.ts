/**
 * Post Aggregate Root
 *
 * 代表系統中的一篇文章
 */

export interface PostProps {
  id: string
  title: string
  content?: string
  userId: string
  createdAt: Date
}

export class Post {
  private constructor(private props: PostProps) {}

  static create(id: string, title: string, userId: string, content?: string): Post {
    return new Post({
      id,
      title,
      content,
      userId,
      createdAt: new Date(),
    })
  }

  static fromDatabase(data: {
    id: string
    title: string
    content?: string
    user_id: string
    created_at?: string | Date
  }): Post {
    return new Post({
      id: data.id,
      title: data.title,
      content: data.content,
      userId: data.user_id,
      createdAt: data.created_at instanceof Date ? data.created_at : new Date(data.created_at || new Date()),
    })
  }

  get id(): string {
    return this.props.id
  }

  get title(): string {
    return this.props.title
  }

  get content(): string | undefined {
    return this.props.content
  }

  get userId(): string {
    return this.props.userId
  }

  get createdAt(): Date {
    return this.props.createdAt
  }
}
