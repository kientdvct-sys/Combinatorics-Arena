import { emitKeypressEvents } from 'node:readline'
import { stdin, stdout } from 'node:process'
import { encodeVerifier, passwordRecord } from './admin-credentials.mjs'

function hiddenInput(prompt) {
  if (!stdin.isTTY || !stdout.isTTY) throw new Error('Hãy chạy lệnh trực tiếp trong PowerShell hoặc terminal.')
  return new Promise((resolve, reject) => {
    let text = ''
    const raw = stdin.isRaw
    stdout.write(prompt)
    emitKeypressEvents(stdin)
    stdin.setRawMode(true)
    stdin.resume()

    function finish(error) {
      stdin.off('keypress', keypress)
      stdin.setRawMode(raw)
      stdin.pause()
      stdout.write('\n')
      if (error) reject(error)
      else resolve(text)
    }

    function keypress(value, key = {}) {
      if (key.ctrl && key.name === 'c') { finish(new Error('Đã hủy thiết lập.')); return }
      if (key.name === 'return' || key.name === 'enter') { finish(); return }
      if (key.name === 'backspace') { text = Array.from(text).slice(0, -1).join(''); return }
      if (value && !key.ctrl && !key.meta && !/[\u0000-\u001f\u007f]/.test(value) && text.length + value.length <= 128) text += value
    }
    stdin.on('keypress', keypress)
  })
}

try {
  const password = await hiddenInput('Mật khẩu mới cho admin Vercel (16–128 ký tự, không hiển thị): ')
  if (password.length < 16) throw new Error('Mật khẩu cần ít nhất 16 ký tự.')
  if (password !== await hiddenInput('Nhập lại mật khẩu: ')) throw new Error('Hai lần nhập chưa giống nhau.')
  console.log('\nGiá trị để dán vào biến ARENA_ADMIN_CREDENTIAL trên Vercel:')
  console.log(encodeVerifier(await passwordRecord(password)))
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
