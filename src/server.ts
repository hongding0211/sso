import * as Koa from 'koa'
import * as bodyParser from 'koa-bodyparser'
import logger = require('koa-logger')
import cors = require('koa-cors')
import fetch from 'node-fetch'
import shajs = require('sha.js')
import router from './router'
import { SIGNATURE_SECRET } from './config'

const app = new Koa()

app.use(cors())

app.use(async (ctx, next) => {
  const startTime = Date.now()

  ctx.set('Content-Type', 'application/json')

  await next()

  ctx.set('x-time-cost', `${Date.now() - startTime}`)

  // TODO 待整理
  const token = shajs('sha256')
    .update(`${Math.floor(Date.now() / 600000)}${SIGNATURE_SECRET}`)
    .digest('hex')
  await fetch(`https://hong97.ltd/log/api/log?token=${token}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      system: 'sso',
      content: {
        url: ctx.url,
        request: {
          header: ctx.request.header,
          params: ctx.query,
          body: ctx.request.body,
        },
        response: {
          header: ctx.response.header,
          body: ctx.response.body,
        },
      },
    }),
  })
})

app.use(bodyParser())

app.use(logger())

app.use(router)

app.listen(3000)
