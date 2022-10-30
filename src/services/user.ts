import { uid } from 'uid/secure'

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
    this.password = data.password
    this.avatar = data.avatar
    this.uid = uid(32)
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
