import * as Router from 'koa-router'
import shajs = require('sha.js')
import jwa = require('jwa')
import Response from './requests/response'
import { IPostApiLogin, IPostApiRegister } from './requests/types'
import { signatureSecret } from './config'
import DataBase from './database'

const router = new Router()

const hmac = jwa('HS256')

const tickets = new Map<
  string,
  {
    uid: string
    sig: string
  }
>()

router.post('/api/login', async (ctx) => {
  const res = new Response<IPostApiLogin>()
  try {
    const { email, phone, password } = <IPostApiLogin['IReq']>ctx.request.body
    const db = new DataBase()
    const user = await db.find('users', {
      $and: [
        {
          $or: [{ email }, { phone }],
        },
        {
          password,
        },
      ],
    })
    if (user.length < 1) {
      res.throw('Wrong user name or password')
      return
    }
    const sig = hmac.sign(
      `${Math.floor(Date.now() / 60000)}${user[0].uid}${signatureSecret}`,
      signatureSecret
    )
    const ticket = shajs('sha256')
      .update(`${Date.now}${user[0].uid}`)
      .digest('hex')
    tickets.set(ticket, {
      uid: user[0].uid,
      sig,
    })
    setTimeout(() => {
      tickets.delete(ticket)
    }, 60000)
    res.set({
      ticket,
    })
  } catch (e) {
    res.throw(e.message)
  } finally {
    ctx.body = res.get()
  }
})

router.post('/api/register', async (ctx) => {
  const res = new Response<IPostApiRegister>()
  try {
    const { email, phone, password, avatar } = <IPostApiRegister['IReq']>(
      ctx.request.body
    )
    const db = new DataBase()
  } catch (e) {
    res.throw(e.message)
  } finally {
    ctx.body = res.get()
  }
})

export default router.routes()
