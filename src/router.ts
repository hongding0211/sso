import * as Router from 'koa-router'
import shajs = require('sha.js')
import jwa = require('jwa')
import jwt = require('jsonwebtoken')
import * as fs from 'fs'
import * as path from 'path'
import Response from './utlis/response'
import {
  IGetApiUserInfo,
  IPostApiValidate,
  IPostApiLogin,
  IPostApiRegister,
  IPatchApiUserInfo,
  IPostApiModifyPassword,
  IPostApiSendCode,
  IPostApiForgetPassword,
  IPostApiResetPassword,
} from './services/types'
import { SIGNATURE_SECRET, COLLECTION_NAME } from './config'
import DataBase from './services/database'
import User from './services/user'
import barkSend from './services/bark'

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
    ticket: string
    signedTicket: string
  }
>()

const codes = new Map<
  string,
  {
    code: string
    time: number
  }[]
>()

const requestCnt = new Map<string, number>()

router.post('/api/login', async (ctx) => {
  const res = new Response<IPostApiLogin>()
  try {
    const { email, phone, password } = <IPostApiLogin['IReq']['body']>(
      ctx.request.body
    )
    const userKey = `${email}${phone}`
    if (requestCnt.has(userKey)) {
      requestCnt.set(userKey, requestCnt.get(userKey) + 1)
      if (requestCnt.get(userKey) > 10) {
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
    const user =
      phone !== undefined
        ? await db.find(COLLECTION_NAME, { phone })
        : await db.find(COLLECTION_NAME, { email })
    if (user.length < 1) {
      res.throw('邮箱 / 电话错误')
      return
    }
    // check password
    const originPassword = user[0].password
    const p1 = shajs('sha256')
      .update(`${Math.floor(Date.now() / 60000)}${originPassword}`)
      .digest('hex')
    const p2 = shajs('sha256')
      .update(`${Math.floor(Date.now() / 60000) - 1}${originPassword}`)
      .digest('hex')
    if (password !== p1 && password !== p2) {
      res.throw('密码错误')
      return
    }
    const ticket = shajs('sha256')
      .update(`${Date.now()}${user[0].uid}`)
      .digest('hex')
    const signedTicket = hmac.sign(
      `${ticket}`,
      `${Math.floor(Date.now() / 60000)}${SIGNATURE_SECRET}`
    )
    requestCnt.delete(userKey)
    tickets.set(signedTicket, {
      uid: user[0].uid,
      ticket,
      signedTicket,
    })
    setTimeout(() => {
      tickets.delete(signedTicket)
    }, 60000)
    res.set({
      ticket: signedTicket,
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
    const { email, phone, password, name, avatar } = <
      IPostApiRegister['IReq']['body']
    >ctx.request.body
    const db = new DataBase()
    if (
      (email && (await db.find(COLLECTION_NAME, { email })).length > 0) ||
      (phone && (await db.find(COLLECTION_NAME, { phone })).length > 0)
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
    const { ticket, maxAge } = <IPostApiValidate['IReq']['body']>(
      ctx.request.body
    )
    const user = tickets.get(ticket)
    if (user === undefined) {
      res.throw('Invalid ticket')
      return
    }
    // validate
    const s1 = `${Math.floor(Date.now() / 60000)}${SIGNATURE_SECRET}`
    const s2 = `${Math.floor(Date.now() / 60000) - 1}${SIGNATURE_SECRET}`
    if (
      hmac.verify(user.ticket, user.signedTicket, s1) ||
      hmac.verify(user.ticket, user.signedTicket, s2)
    ) {
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
      res.set({
        authToken,
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
    const { authToken, uuid } = ctx.query as IGetApiUserInfo['IReq']['params']
    if (authToken === undefined && uuid === undefined) {
      res.throw('no auth-token or uuid')
      return
    }
    if (authToken) {
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
    } else {
      const db = new DataBase()
      const user = await db.find(COLLECTION_NAME, {
        uid: uuid,
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
    }
  } catch (e) {
    res.throw(e.message)
    ctx.status = 403
  } finally {
    ctx.body = res.get()
  }
})

router.patch('/api/userInfo', async (ctx) => {
  const res = new Response<IPatchApiUserInfo>()
  try {
    const { authToken } = ctx.query as IPatchApiUserInfo['IReq']['params']
    if (authToken === undefined) {
      res.throw('no auth-token')
      ctx.status = 401
    }
    const { uid } = jwt.verify(authToken, publicKey) as {
      uid: string
    }
    const db = new DataBase()
    const user = await db.find(COLLECTION_NAME, {
      uid,
    })
    if (user.length < 1) {
      res.throw('User not exists')
      return
    }
    const modifyResult = await db.updateOne(
      COLLECTION_NAME,
      {
        uid,
      },
      {
        $set: {
          ...user[0],
          ...ctx.request.body,
        },
      }
    )
    if (modifyResult.acknowledged && modifyResult.modifiedCount > 0) {
      res.set({
        ...user[0],
        ...ctx.request.body,
      })
    } else {
      res.throw('Update failed')
    }
  } catch (e) {
    res.throw(e.message)
    ctx.status = 500
  } finally {
    ctx.body = res.get()
  }
})

router.post('/api/sendCode', async (ctx) => {
  const res = new Response<IPostApiSendCode>()
  try {
    const { authToken } = ctx.query as IPostApiSendCode['IReq']['params']
    if (authToken === undefined) {
      res.throw('no auth-token')
      ctx.status = 401
    }
    const { uid } = jwt.verify(authToken, publicKey) as {
      uid: string
    }
    const code = `000${Math.floor(Math.random() * 10000)}`.slice(-4)
    const node = {
      code,
      time: Date.now(),
    }
    if (!codes.has(uid) || codes.get(uid).length < 1) {
      codes.set(uid, [node])
      res.set({})
      await barkSend(`Uid: ${uid}, Code: ${node.code}`)
    } else if (
      codes.get(uid).length > 10 ||
      Date.now() - codes.get(uid)[codes.get(uid).length - 1].time < 1000
    ) {
      res.throw('Too much requests, try later.')
      return
    } else {
      codes.get(uid).push(node)
      res.set({})
      await barkSend(`Uid: ${uid}, Code: ${node.code}`)
    }
    setTimeout(() => {
      codes.set(
        uid,
        codes.get(uid).filter((c) => c.code !== code)
      )
    }, 3 * 60 * 1000)
  } catch (e) {
    res.throw(e.message)
    ctx.status = 500
  } finally {
    ctx.body = res.get()
  }
})

router.post('/api/modifyPassword', async (ctx) => {
  const res = new Response<IPostApiModifyPassword>()
  try {
    const { authToken } = ctx.query as IPostApiModifyPassword['IReq']['params']
    const { code, newPassword } = <IPostApiModifyPassword['IReq']['body']>(
      ctx.request.body
    )
    if (authToken === undefined) {
      res.throw('no auth-token')
      ctx.status = 401
    }
    const { uid } = jwt.verify(authToken, publicKey) as {
      uid: string
    }
    if (!codes.get(uid) || !codes.get(uid).find((e) => e.code === code)) {
      res.throw('Wrong digital code')
      return
    }
    const db = new DataBase()
    const user = await db.find(COLLECTION_NAME, {
      uid,
    })
    if (user.length < 1) {
      res.throw('User not exist')
      return
    }
    const modifyResult = await db.updateOne(
      COLLECTION_NAME,
      {
        uid,
      },
      {
        $set: {
          password: newPassword,
        },
      }
    )
    if (modifyResult.acknowledged) {
      res.set({})
    } else {
      res.throw('Modify failed')
    }
  } catch (e) {
    res.throw(e.message)
    ctx.status = 500
  } finally {
    ctx.body = res.get()
  }
})

router.post('/api/forgetPassword', async (ctx) => {
  const res = new Response<IPostApiForgetPassword>()
  try {
    const { email, phone } = <IPostApiForgetPassword['IReq']['body']>(
      ctx.request.body
    )
    const db = new DataBase()
    const user = email
      ? await db.find(COLLECTION_NAME, { email })
      : await db.find(COLLECTION_NAME, { phone })
    if (user.length < 1) {
      res.throw('User not exists')
      return
    }
    const { uid } = user[0]
    const code = `000${Math.floor(Math.random() * 10000)}`.slice(-4)
    const node = {
      code,
      time: Date.now(),
    }
    if (!codes.has(uid) || codes.get(uid).length < 1) {
      codes.set(uid, [node])
      res.set({})
      await barkSend(
        `${phone ? `Phone: ${phone}` : `Email: ${email}`}, Uid: ${uid}, Code: ${
          node.code
        }`
      )
    } else if (
      codes.get(uid).length > 10 ||
      Date.now() - codes.get(uid)[codes.get(uid).length - 1].time < 1000
    ) {
      res.throw('Too much requests, try later.')
      return
    } else {
      codes.get(uid).push(node)
      res.set({})
      await barkSend(
        `${phone ? `Phone: ${phone}` : `Email: ${email}`}, Uid: ${uid}, Code: ${
          node.code
        }`
      )
    }
    setTimeout(() => {
      codes.set(
        uid,
        codes.get(uid).filter((c) => c.code !== code)
      )
    }, 3 * 60 * 1000)
  } catch (e) {
    res.throw(e.message)
    ctx.status = 500
  } finally {
    ctx.body = res.get()
  }
})

router.post('/api/resetPassword', async (ctx) => {
  const res = new Response<IPostApiResetPassword>()
  try {
    const { code, newPassword, email, phone } = <
      IPostApiResetPassword['IReq']['body']
    >ctx.request.body
    const db = new DataBase()
    const user = email
      ? await db.find(COLLECTION_NAME, { email })
      : await db.find(COLLECTION_NAME, { phone })
    if (user.length < 1) {
      res.throw('User not exists')
      return
    }
    const { uid } = user[0]
    if (!codes.get(uid) || !codes.get(uid).find((e) => e.code === code)) {
      res.throw('Wrong digital code')
      return
    }
    const modifyResult = await db.updateOne(
      COLLECTION_NAME,
      {
        uid,
      },
      {
        $set: {
          password: newPassword,
        },
      }
    )
    if (modifyResult.acknowledged) {
      res.set({})
    } else {
      res.throw('Modify failed')
    }
  } catch (e) {
    res.throw(e.message)
    ctx.status = 500
  } finally {
    ctx.body = res.get()
  }
})

router.head('/api/checkAuthToken', async (ctx) => {
  const { authToken } = ctx.query as { authToken?: string }
  try {
    if (!authToken) {
      ctx.status = 401
    }
    const { uid } = jwt.verify(authToken, publicKey) as {
      uid: string
    }
    const db = new DataBase()
    const user = await db.find(COLLECTION_NAME, {
      uid,
    })
    if (user.length < 1) {
      ctx.status = 403
      return
    }
    ctx.status = 200
  } catch (e) {
    ctx.status = 500
  }
})

export default router.routes()
