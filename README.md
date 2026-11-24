# Combinatorics Arena

Web game chiến thuật và logic toán học dành cho học sinh yêu thích tổ hợp. Năm đấu trường có 100 bài chiến dịch và 11.000 bài luyện, tổng cộng 11.100 bài. Chiến dịch có bốn bài mỗi cấp. Hoàn thành một bài chiến dịch để mở cấp tiếp theo trong cùng đấu trường.

Mỗi bài mở đầu bằng **Đề bài**. Phần này mô tả bàn hiện tại, nêu yêu cầu cần giải và liệt kê điều kiện với dữ kiện của đúng bài đang mở. Mục **Đọc đề** trên thẻ bài luyện cho phép xem đề trước khi vào bàn. Trên máy tính, đề và bàn chơi nằm cạnh nhau. Trên điện thoại, đề nằm trước bàn. Người mới có thể mở **Cách làm trên bàn và ví dụ**. Vòng tròn giữ số thứ tự ở cả ô cấm và đánh dấu từng cặp ô đang xung đột.

Trang chủ có bàn Binary Matrix chơi thử, lối tắt về ván đang dở, bài đã lưu và thành tích. Từ **Đấu trường**, mở thẳng **Bài luyện** dưới mỗi chế độ hoặc chơi **Thử thách hôm nay**. Nút dấu trang lưu bài vào hồ sơ đang dùng. Mở **Bài đã lưu** để quay lại danh sách.

Mở **Bài tập** để luyện ở bất kỳ cấp nào. Có thể lọc theo đấu trường, cấp độ và trạng thái đã giải, mở thẳng mã #00001–#11000 hoặc chơi một bài ngẫu nhiên trong bộ lọc. Kết quả bài luyện được lưu trong hồ sơ. Với bài luyện đã xong, trò chơi giữ lại trạng thái bàn của 24 bài gần nhất và lưu kỷ lục của tất cả bài đã giải.

## Chạy và quản trị trên máy

Bản ZIP đi kèm thư mục `dist` và máy chủ Node, chạy được bằng `npm start` mà không cần cài phụ thuộc. Để quản lý bài nổi bật, mở PowerShell trong thư mục dự án và chạy:

```powershell
npm run admin:setup
npm start
```

Lệnh thiết lập tạo tài khoản cho `trungkienng12@gmail.com` và hiện mật khẩu ngẫu nhiên một lần trong PowerShell. Mở `http://localhost:5173/#/admin` hoặc đi tới **Tài khoản → Quản trị nội dung**. Nhập mã bài có sẵn và chọn bản nháp hoặc công khai. Bài công khai xuất hiện ở màn **Chọn đấu trường**, theo độ ưu tiên từ cao xuống thấp. Đặt thời điểm công khai nếu muốn bài chỉ xuất hiện từ một giờ cụ thể. Giờ nhập theo múi giờ trình duyệt, máy chủ lưu theo UTC. Gỡ khỏi mục nổi bật không xóa bài khỏi ngân hàng hay thành tích của người chơi.

Nếu máy đang chạy Arena cũ trên cổng 5173, nhấn **Ctrl + C** trong cửa sổ terminal đó rồi chạy máy chủ mới. Dùng lại cùng địa chỉ và cổng để thấy tiến độ cũ. Mặc định dữ liệu quản trị nằm trong thư mục `.combinatorics-arena` của hồ sơ Windows. Có thể đặt biến môi trường `ARENA_DATA_DIR` và `ARENA_PORT` để đổi vị trí lưu hoặc cổng khi chạy cục bộ.

Máy chủ cục bộ chỉ nhận kết nối loopback. Phiên cục bộ kết thúc khi khởi động lại máy chủ. Phần triển khai Vercel bên dưới dùng API riêng và dữ liệu Redis.

## Phát triển giao diện

Cần Node.js 22.12+ trong nhánh 22 hoặc Node.js 24.

```bash
npm ci
npm run dev
```

Mở địa chỉ Vite in trong terminal. Nếu muốn xem bản build, chạy `npm run build` rồi `npm run preview`.

Gói ZIP có sẵn thư mục `dist`. Nếu đã cài Python, bạn có thể chơi ngay bằng cách chạy `python -m http.server 8080 --directory dist` từ thư mục dự án rồi mở `http://localhost:8080`.

## Kiểm thử

```bash
npm test
npm run test:server
npx playwright install chromium
npm run test:e2e
```

Nếu dùng Chrome đã có trên máy, đặt biến môi trường `ARENA_BROWSER_CHANNEL=chrome` khi chạy Playwright. E2E tự mở Vite trên cổng 4173. Trong môi trường giới hạn socket, chạy build rồi đặt biến ARENA_STATIC_TEST=1. Playwright sẽ nạp trực tiếp tài nguyên của dist vào Chromium.

## Triển khai Vercel

1. Đưa **mã nguồn** trong thư mục `combinatorics-arena` lên kho Git của bạn. Import kho vào Vercel với preset **Vite**, lệnh build `npm run build` và thư mục xuất `dist`. Chọn nhánh Node.js 24 hoặc 22. Thư mục `api` được triển khai thành Vercel Functions.
2. Kết nối một cơ sở dữ liệu **Upstash Redis** cho dự án, cấp biến môi trường theo phạm vi **Production**.
3. Trong PowerShell, chạy `npm run admin:vercel`, nhập mật khẩu mới ít nhất 16 ký tự rồi xác nhận. Terminal ẩn nội dung khi nhập và in ra mã xác thực đã băm.
4. Trong **Project Settings → Environment Variables**, kiểm tra các biến **Production** dưới đây rồi deploy hoặc redeploy. Bật tùy chọn cung cấp **System Environment Variables** để API nhận biết môi trường Production.
5. Mở domain Production của dự án, kiểm tra `/api/admin/session` ở cửa sổ ẩn danh. Kết quả khi cấu hình thành công có dạng `{"initialized":true,"email":null,"hosting":"vercel"}`. Dùng `/#/admin` để đăng nhập bằng email và mật khẩu bạn vừa chọn.

| Biến | Giá trị |
| --- | --- |
| `ARENA_ADMIN_EMAIL` | Email quản trị, ví dụ `trungkienng12@gmail.com`. |
| `ARENA_ADMIN_CREDENTIAL` | Toàn bộ mã do `npm run admin:vercel` in ra, bắt đầu bằng `pbkdf2-sha256:`. |
| `UPSTASH_REDIS_REST_URL` | URL REST HTTPS của Redis. Có thể đã được tích hợp Vercel điền sẵn. |
| `UPSTASH_REDIS_REST_TOKEN` | Token REST có quyền đọc và ghi, đặt dưới dạng Sensitive. |
| `ARENA_PUBLIC_ORIGIN` | Tùy chọn. Đặt địa chỉ HTTPS chuẩn nếu dùng domain riêng hoặc nếu địa chỉ Vercel chọn khác địa chỉ đang mở. Chỉ nhập origin, ví dụ `https://arena.example.com`. |

Đặt `ARENA_ADMIN_CREDENTIAL` và `UPSTASH_REDIS_REST_TOKEN` dưới dạng **Sensitive**. Các biến trong bảng là biến phía máy chủ. Tiền tố `VITE_` dành cho dữ liệu công khai trong frontend. Sau mỗi lần thay đổi biến, redeploy Production để áp dụng.

API xác minh mật khẩu trên máy chủ. Cookie phiên dùng Secure, HttpOnly và SameSite=Strict trên HTTPS. Redis lưu dấu vân tay của phiên cùng hạn dùng và kiểm soát số lần thử mật khẩu xuyên các instance. Build kiểm tra `dist` để chặn tệp cấu hình riêng tư, source map và dấu hiệu lộ mã xác thực. Muốn đổi mật khẩu, chạy lại `npm run admin:vercel`, thay mã băm trong Vercel và redeploy. Các phiên quản trị cũ hết hiệu lực trên deployment mới.

Phiên quản trị chỉ bật trên **Production** và trên domain chuẩn của dự án. Preview vẫn mở game và hiển thị bài gợi ý có sẵn. Bài nổi bật quản trị trên Vercel được lưu vào Redis của domain Production. Tiến độ và hồ sơ người chơi tiếp tục lưu theo trình duyệt. Xuất JSON ở bản cục bộ rồi nhập vào website Vercel để mang theo tiến độ.

- [Vite trên Vercel](https://vercel.com/docs/frameworks/frontend/vite)
- [Vercel Functions](https://vercel.com/docs/functions/runtimes/node-js)
- [Biến hệ thống trên Vercel](https://vercel.com/docs/environment-variables/system-environment-variables)
- [Kết nối Upstash Redis với Vercel](https://upstash.com/docs/redis/howto/vercelintegration)

## Hồ sơ trên thiết bị

Mở **Tài khoản** để tạo hồ sơ bằng tên và mật khẩu. Một hồ sơ có ván, thành tích và thiết lập riêng. Phiên đăng nhập giữ khi tải lại tab, còn dữ liệu hồ sơ và tiến độ lưu theo trình duyệt và địa chỉ website. Có thể chơi với tư cách khách và sao chép tiến độ khách vào hồ sơ khi tạo mới.

Khi thay bản cũ, giữ nguyên địa chỉ website và cổng đang dùng để truy cập hồ sơ khách cũ. Nếu đổi địa chỉ, xuất JSON ở bản cũ và nhập lại trong hồ sơ muốn dùng ở bản mới. JSON xuất chỉ chứa tiến độ và thiết lập.

Mật khẩu được dẫn xuất bằng Web Crypto PBKDF2-HMAC-SHA256, với salt ngẫu nhiên và 600.000 vòng. Hồ sơ cục bộ phù hợp để tách tiến độ trên cùng trình duyệt. Người có quyền truy cập vào kho dữ liệu trình duyệt trên thiết bị cũng có thể đọc hoặc chỉnh sửa tiến độ. Đăng nhập chạy trên HTTPS hoặc localhost.

- [Thiết lập PBKDF2 của OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [Web Crypto trên MDN](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/deriveBits)

- [Vite trên Vercel](https://vercel.com/docs/frameworks/frontend/vite)
- [Gói Vercel Hobby](https://vercel.com/pricing)

## Luật và thuật toán

| Chế độ | Luồng chơi | Bộ giải |
| --- | --- | --- |
| Nim Arena | Lấy đá và đấu AI. Có Nim thường, misère và giới hạn từ 2 đến 5 viên mỗi lượt. | XOR cho Nim thường, chẵn lẻ ở cuối ván misère và XOR giá trị Grundy của các đống lấy giới hạn. |
| Forbidden Circle | Dựng cấu hình, tối đa hóa hoặc dựng mẫu rồi đếm, có ghế bắt buộc và bị cấm. | Backtracking kiểm tra cả cạnh khép vòng trên tối đa 22 vị trí. Màn đếm cổ điển đối chiếu công thức Kaplansky. |
| Graph Coloring | Tô từng đỉnh, tránh cạnh xung đột và tối thiểu hóa số màu. | DSATUR chính xác trên đồ thị luyện tối đa 13 đỉnh, tôn trọng màu khóa và bảng màu giới hạn. |
| Domino Invariant | Xoay, bấm hoặc kéo quân vào bàn. Màn bất khả thi yêu cầu chứng minh trên ô. | Ghép cặp cực đại hai phía, kiểm tra chênh màu hoặc chứng chỉ Hall. |
| Binary Matrix | Lật ô và láng giềng, tắt đèn. Hai màn cuối yêu cầu số bước tối ưu. | Khử Gauss GF(2), rồi duyệt các tổ hợp của cơ sở hạt nhân để tìm trọng số nhỏ nhất. |

Mã seed tạo lại cùng một thử thách với cùng luật và cấp. Các biến thể dùng kích thước, thứ tự, phản chiếu, màu khóa hoặc chuỗi xáo trộn tùy chế độ. Mỗi màn được bộ giải kiểm tra khi sinh. Hoàn tác trong Nim có thể bật hoặc tắt từ trang Thành tích.

## Tính điểm

Điểm ban đầu theo năm cấp lần lượt là 1.000, 1.250, 1.500, 1.750 và 2.000. Mỗi giây tròn trừ 1 điểm, mỗi gợi ý trừ 150 điểm. Điểm thấp nhất là 0. Ví dụ, một bài Apprentice mất 42 giây và một gợi ý cho 808 điểm.

Đồng hồ bắt đầu từ thao tác hợp lệ đầu tiên trên bài, lần mở gợi ý đầu tiên hoặc lần bấm **Kiểm tra** đầu tiên. Đồng hồ tạm dừng khi tab bị ẩn và tiếp tục khi quay lại. Trò chơi chốt điểm khi bài được kiểm tra thành công. Kiểm tra sai không trừ khoản riêng. **Chơi lại** đặt đồng hồ về 0 và giữ số gợi ý đã dùng. Huy chương Vàng, Bạc và Đồng tương ứng với 0, 1 và từ 2 gợi ý.

Thành tích lưu trước v1.6 hiển thị điểm theo luật cũ cho tới khi người chơi giải lại bài. Khi đó hệ thống lưu kỷ lục điểm theo luật mới, đồng thời giữ số lần hoàn thành, huy chương, thời gian nhanh nhất và số bước ít nhất đã ghi nhận.

## Cấu trúc

- `src/games/` chứa luật, sinh màn chiến dịch, bộ giải độc lập, gợi ý và giải thích.
- `src/questions/` chứa các mẫu sinh bài luyện và chỉ mục 11.000 mã đã kiểm chứng. Mã 1–10.000 giữ nguyên từ v1.2. `npm run generate:questions` dựng lại chỉ mục từ cùng bộ sinh xác định. Chỉ mục được lưu cùng mã nguồn để giữ ổn định liên kết bài.
- `src/engine/` chứa kiểu engine, RNG có seed, lịch sử thao tác, schema tiến độ và Zustand.
- `api/` chứa các Vercel Function. `server/` chứa xác thực, lưu trữ và máy chủ cục bộ.
- API chỉnh sửa yêu cầu phiên bản hiện tại qua `If-Match`. Nếu hai phiên cùng sửa bài, phiên lưu sau phải đọc lại trước khi ghi. Nhật ký giữ 60 lần sửa gần nhất cùng với dữ liệu bài. Danh sách cũ từ v1.4 được đọc tự động rồi nâng schema khi lưu.
- `GET /api/health` trả trạng thái sẵn sàng của phần quản trị và kho lưu trữ. Lỗi máy chủ có mã hỗ trợ tương ứng trong runtime logs. Khách truy cập nhận danh sách công khai, không nhận lịch sử biên tập.
- `src/components/` chứa trang, điều khiển, UI SVG và bàn chơi.
- `tests/unit/` kiểm tra thuật toán, bất biến, lịch sử và lưu trữ. `tests/e2e/` thao tác trên website thực.

Tiến độ phiên bản 1 lưu cả tiến trình đang chơi dưới dạng danh sách thao tác có con trỏ Undo/Redo. Khi tải lại, engine phát lại các thao tác hợp lệ để khôi phục bàn.

