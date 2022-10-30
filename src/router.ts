import * as Router from 'koa-router'
import Response from './requests/response'
import { IPostApiLogin } from './requests/types'

const router = new Router()

router.get('/api/login', async (ctx) => {
  const res = new Response<IPostApiLogin>()
  try {
    // TODO
    res.set({
      ticket: '',
    })
  } catch (e) {
    res.throw(e)
  } finally {
    ctx.body = res.get()
  }
})

export default router.routes()
