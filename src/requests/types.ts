export type IResponse<T extends Record<string, any> | Record<string, any>[]> = {
  success: boolean
  msg?: string
  data?: T
}

export interface IApi {
  IReq: Record<string, any>
  IRes: IResponse<Record<string, any> | Record<string, any>[]>
}

export interface IPostApiLogin extends IApi {
  IReq: {
    email?: string
    phone?: string
    password: string
  }
  IRes: IResponse<{
    ticket: string
  }>
}

export interface IPostApiRegister extends IApi {
  IReq: {
    email?: string
    phone?: string
    password: string
    avatar: string
  }
  IRes: IResponse<{
    email?: string
    phone?: string
    avatar: string
  }>
}
