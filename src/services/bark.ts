import fetch from 'node-fetch'
import { barkHost } from '../config'

export default function barkSend(content: string) {
  return fetch(
    `${barkHost}/SSO/${content}/?icon=https://hong97.ltd/files/sso_logo.png`
  )
}
