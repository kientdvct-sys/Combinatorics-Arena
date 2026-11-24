import { ownerEmail, provisionAdmin } from './admin-store.mjs'

const admin = await provisionAdmin()
if (admin) {
  console.log('Admin email:', admin.email)
  console.log('Password:', admin.password)
  console.log('Save this password. It is displayed only once.')
} else console.log('The admin account has already been set up:', ownerEmail)
