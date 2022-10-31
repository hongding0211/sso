import * as Koa from 'koa'
import * as bodyParser from 'koa-bodyparser'
import logger = require('koa-logger')
import cors = require('koa-cors')
import https = require('https')
import fs = require('fs')
import sslify from 'koa-sslify'
import router from './router'

const app = new Koa()

app.use(sslify())

app.use(
  cors({
    credentials: true,
    maxAge: 60 * 60 * 1000,
  })
)

app.use(async (ctx, next) => {
  const startTime = Date.now()

  ctx.set('Content-Type', 'application/json')

  await next()

  ctx.set('x-time-cost', `${Date.now() - startTime}`)
})

app.use(bodyParser())

app.use(logger())

app.use(router)

const options = {
  key: fs.readFileSync('../cert/server.key', 'utf8'),
  cert: fs.readFileSync('../cert/server.cert', 'utf8'),
}

app.listen(3000)
https.createServer(options, app.callback()).listen(3001)
