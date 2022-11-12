import * as Koa from 'koa'
import * as bodyParser from 'koa-bodyparser'
import logger = require('koa-logger')
import cors = require('koa-cors')
import router from './router'

const app = new Koa()

app.use(cors())

app.use(async (ctx, next) => {
  const startTime = Date.now()

  ctx.set('Content-Type', 'application/json')

  await next()

  ctx.set('x-time-cost', `${Date.now() - startTime}`)
})

app.use(bodyParser())

app.use(logger())

app.use(router)

app.listen(3000)
