import * as Koa from 'koa'
import * as bodyParser from 'koa-bodyparser'
import logger = require('koa-logger')
import cors = require('koa-cors')
import router from './router'
import log from './middlewares/log'
import gateway from './middlewares/gateway'

const app = new Koa()

app.use(log())

app.use(
  cors({
    methods: '*',
  })
)

app.use(gateway())

app.use(bodyParser())

app.use(logger())

app.use(router)

app.listen(3000)
