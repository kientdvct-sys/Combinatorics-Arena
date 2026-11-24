import { seeded } from '../engine/core'
import { questionAddress, questionCount } from './address'

export function dailyQuestion(date = new Date()) {
  const day = [date.getFullYear(), date.getMonth() + 1, date.getDate()].join('-')
  const random = seeded('arena-daily-v1:' + day)
  return questionAddress(random.integer(1, questionCount))!
}
