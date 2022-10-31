import * as Router from 'koa-router'
import shajs = require('sha.js')
import jwa = require('jwa')
import jwt = require('jsonwebtoken')
import * as fs from 'fs'
import * as path from 'path'
import Response from './requests/response'
import {
  IGetApiUserInfo,
  IPostApiValidate,
  IPostApiLogin,
  IPostApiRegister,
} from './requests/types'
import { SIGNATURE_SECRET, COLLECTION_NAME } from './config'
import DataBase from './database'
import User from './services/user'

const privateKey = fs.readFileSync(
  path.join(__dirname, '../public/rsa_private_key.pem')
)
const publicKey = fs.readFileSync(
  path.join(__dirname, '../public/rsa_public_key.pem')
)

const router = new Router()

const hmac = jwa('HS256')

const tickets = new Map<
  string,
  {
    uid: string
    sig: string
  }
>()

const requestCnt = new Map<string, number>()

router.post('/api/login', async (ctx) => {
  const res = new Response<IPostApiLogin>()
  try {
    const { email, phone, password } = <IPostApiLogin['IReq']>ctx.request.body
    const userKey = `${email}${phone}`
    if (requestCnt.has(userKey)) {
      requestCnt.set(userKey, requestCnt.get(userKey) + 1)
      if (requestCnt.get(userKey) > 3) {
        res.throw('Too much requests')
        setTimeout(() => {
          requestCnt.delete(userKey)
        }, 60000)
        return
      }
    } else {
      requestCnt.set(userKey, 0)
    }
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
    const ticket = shajs('sha256')
      .update(`${Date.now()}${user[0].uid}`)
      .digest('hex')
    const sig = hmac.sign(
      `${ticket}`,
      `${Math.floor(Date.now() / 60000)}${SIGNATURE_SECRET}`
    )
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
    const { email, phone, password, name, avatar } = <IPostApiRegister['IReq']>(
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
      name,
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
      name,
      avatar,
    })
  } catch (e) {
    res.throw(e.message)
  } finally {
    ctx.body = res.get()
  }
})

router.post('/api/validate', async (ctx) => {
  const res = new Response<IPostApiValidate>()
  try {
    ctx.cookies.set('auth-token', null)
    const { ticket, maxAge } = <IPostApiValidate['IReq']>ctx.request.body
    const user = tickets.get(ticket)
    if (user === undefined) {
      res.throw('Invalid ticket')
      return
    }
    // validate
    const s1 = `${Math.floor(Date.now() / 60000)}${SIGNATURE_SECRET}`
    const s2 = `${Math.floor(Date.now() / 60000) - 1}${SIGNATURE_SECRET}`
    if (
      hmac.verify(ticket, user.sig, s1) ||
      hmac.verify(ticket, user.sig, s2)
    ) {
      res.set({})
      const authToken = jwt.sign(
        {
          uid: user.uid,
        },
        privateKey,
        {
          // 默认提供 30 天的有效期
          expiresIn: maxAge === undefined ? '30d' : maxAge,
          algorithm: 'RS256',
        }
      )
      ctx.cookies.set('auth-token', authToken, {
        overwrite: true,
        maxAge: 30 * 60 * 60 * 1000,
        sameSite: 'none',
        secure: true,
      })
      tickets.delete(ticket)
    } else {
      res.throw('Invalid ticket')
    }
  } catch (e) {
    res.throw(e.message)
  } finally {
    ctx.body = res.get()
  }
})

router.get('/api/userInfo', async (ctx) => {
  const res = new Response<IGetApiUserInfo>()
  try {
    const authToken = ctx.cookies.get('auth-token')
    const { uid } = jwt.verify(authToken, publicKey) as {
      uid: string
    }
    const db = new DataBase()
    const user = await db.find(COLLECTION_NAME, {
      uid,
    })
    if (user.length < 1) {
      res.throw('User not exists')
      ctx.status = 403
      return
    }
    res.set({
      name: user[0].name,
      phone: user[0].phone,
      email: user[0].email,
      avatar: user[0].avatar,
    })
  } catch (e) {
    res.throw(e.message)
    ctx.status = 403
  } finally {
    ctx.body = res.get()
  }
})

export default router.routes()
