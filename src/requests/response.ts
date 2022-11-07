import { IApi, IResponseBody } from './types'

interface IResponse {
  response: IResponseBody<Record<string, any> | Record<string, any>[]>
}

export default class Response<T extends IApi> implements IResponse {
  response: T['IRes'] = {
    success: false,
    msg: '',
    data: undefined,
  }

  set(data: T['IRes']['data'], success = true) {
    this.response.data = data
    this.response.success = success
  }

  throw(msg: string) {
    this.response.success = false
    this.response.msg = msg
    this.response.data = undefined
  }

  get(): T['IRes'] {
    return this.response
  }
}
