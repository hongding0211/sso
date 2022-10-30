import * as Router from 'koa-router'
import shajs = require('sha.js')
import jwa = require('jwa')
import Response from './requests/response'
import { IPostApiLogin, IPostApiRegister } from './requests/types'
import { SIGNATURE_SECRET, COLLECTION_NAME } from './config'
import DataBase from './database'
import User from './services/user'

const router = new Router()

const hmac = jwa('HS256')

const tickets = new Map<
  string,
  {
    uid: string
    sig: string
    cnt: number
  }
>()

router.post('/api/login', async (ctx) => {
  const res = new Response<IPostApiLogin>()
  try {
    const { email, phone, password } = <IPostApiLogin['IReq']>ctx.request.body
    const db = new DataBase()
    const user = await db.find(COLLECTION_NAME, {
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
      `${Math.floor(Date.now() / 60000)}${user[0].uid}${SIGNATURE_SECRET}`,
      SIGNATURE_SECRET
    )
    const ticket = shajs('sha256')
      .update(`${Math.floor(Date.now() / 60000)}${user[0].uid}`)
      .digest('hex')
    if (tickets.has(ticket)) {
      tickets.get(ticket).cnt += 1
      if (tickets.get(ticket).cnt > 3) {
        res.throw('Too much requests')
        return
      }
    } else {
      tickets.set(ticket, {
        uid: user[0].uid,
        sig,
        cnt: 0,
      })
    }
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
    if (
      (
        await db.find(COLLECTION_NAME, {
          $or: [{ email }, { phone }],
        })
      ).length > 0
    ) {
      res.throw('User exists')
      return
    }
    const newUser = new User({
      email,
      phone,
      password,
      avatar,
    })
    await db.insert(COLLECTION_NAME, [
      {
        ...newUser.get(),
      },
    ])
    res.set({
      email,
      phone,
      avatar,
    })
  } catch (e) {
    res.throw(e.message)
  } finally {
    ctx.body = res.get()
  }
})

export default router.routes()
