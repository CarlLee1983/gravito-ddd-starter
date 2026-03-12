export interface PostReadModel {
  readonly id: string
  readonly title: string
  readonly content: string
  readonly authorId: string
  readonly isPublished: boolean
  readonly isArchived: boolean
  readonly createdAt: string
}
