import { Next, ParameterizedContext } from 'koa'

export default function gateway() {
  return async (ctx: ParameterizedContext, next: Next) => {
    const startTime = Date.now()
    ctx.set('Content-Type', 'application/json')
    await next()
    ctx.set('x-time-cost', `${Date.now() - startTime}`)
  }
}
