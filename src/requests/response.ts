import { IApi, IResponse } from './types'

interface IRequests {
  response: IResponse<Record<string, any> | Record<string, any>[]>
}

export default class Response<T extends IApi> implements IRequests {
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
