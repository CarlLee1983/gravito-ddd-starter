/**
 * User Controller
 */

import type { GravitoContext, PlanetCore } from '@gravito/core'
import type { CreateUserHandler } from '../../Application/Commands/CreateUser/CreateUserHandler'
import type { IUserRepository } from '../../Domain/Repositories/IUserRepository'

export class UserController {
  /**
   * GET /api/users
   */
  async index(ctx: GravitoContext) {
    const core = ctx.get('core') as PlanetCore
    const userRepository = core.container.make('userRepository') as IUserRepository
    const users = await userRepository.list()

    return ctx.json({
      success: true,
      data: users.map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        createdAt: u.createdAt.toISOString(),
      }))
    })
  }

  /**
   * POST /api/users
   */
  async store(ctx: GravitoContext) {
    try {
      const body = await ctx.req.json<{ name: string; email: string }>()
      const core = ctx.get('core') as PlanetCore
      const createUserHandler = core.container.make('createUserHandler') as CreateUserHandler

      const user = await createUserHandler.handle({
        name: body.name,
        email: body.email,
      })

      return ctx.json({
        success: true,
        message: 'User created successfully',
        data: user,
      }, 201)
    } catch (error: any) {
      return ctx.json({
        success: false,
        message: error.message,
      }, 400)
    }
  }

  /**
   * GET /api/users/:id
   */
  async show(ctx: GravitoContext) {
    const id = ctx.req.param('id')
    const core = ctx.get('core') as PlanetCore
    const userRepository = core.container.make('userRepository') as IUserRepository
    const user = await userRepository.findById(id!)

    if (!user) {
      return ctx.json({
        success: false,
        message: 'User not found',
      }, 404)
    }

    return ctx.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt.toISOString(),
      }
    })
  }
}
