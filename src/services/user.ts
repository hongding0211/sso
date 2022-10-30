import { uid } from 'uid/secure'
import * as shajs from 'sha.js'

export default class User {
  email: string

  phone: string

  password: string

  uid: string

  avatar: string

  constructor(data: {
    email?: string
    phone?: string
    password: string
    avatar: string
  }) {
    this.email = data.email || null
    this.phone = data.phone || null
    this.avatar = data.avatar
    this.uid = uid(32)
    // hash password
    this.password = shajs('sha256').update(data.password).digest('hex')
  }

  get() {
    return {
      email: this.email,
      phone: this.phone,
      password: this.password,
      uid: this.uid,
      avatar: this.avatar,
    }
  }
}
