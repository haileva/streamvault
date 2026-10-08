/* Vietnamese translations for all 6 StreamVault docs */

export const DOC_01_VI = `# StreamVault — Tổng Quan Dự Án

> Nền tảng thanh toán USDC theo luồng liên tục trên Arc Testnet.

---

## StreamVault là gì?

StreamVault là ứng dụng Web3 cho phép bất kỳ ai stream USDC liên tục — theo từng giây — đến người nhận. Người gửi nạp USDC một lần, tiền tự động chảy đến người nhận theo tốc độ cố định cho đến khi luồng kết thúc, bị tạm dừng hoặc bị hủy.

Hãy nghĩ đến nó như một hệ thống lương trực tiếp, công cụ thu phí đăng ký, hoặc bộ giải ngân tài trợ — tất cả đều vận hành trên blockchain mà không cần trung gian hay xuất hóa đơn thủ công.

---

## Các Trường Hợp Sử Dụng

| Trường hợp | Cách hoạt động |
|---|---|
| **Lương** | Nhà tuyển dụng tạo luồng đến ví nhân viên với tốc độ lương theo giây. Tiền chảy liên tục; nhân viên rút bất kỳ lúc nào. |
| **Đăng ký dịch vụ** | Nhà cung cấp đặt mức phí tháng quy đổi sang từng giây. Người dùng nạp trước. |
| **Hợp đồng tư vấn** | Khách hàng stream USDC cho nhà thầu theo tốc độ giờ/ngày đã thỏa thuận. |
| **Tài trợ DAO** | Kho bạc DAO stream tài trợ cho người nhận trong kỳ vesting. |
| **Chia sẻ doanh thu** | Protocol stream phần trăm phí thu được cho cộng tác viên theo thời gian thực. |

---

## Tính Năng Chính

### Onchain
- **Tích lũy USDC theo giây** — hợp đồng tính số dư có thể rút tại bất kỳ timestamp nào
- **Tạm dừng / Tiếp tục** — người gửi có thể tạm dừng; thời gian tạm dừng không tính vào tích lũy
- **Hủy với cơ chế rút pull-based** — hủy chia đúng khoản tiền; phần của người nhận vào \`pendingWithdrawals\` để tránh bị khóa do blocklist
- **Người nhận rút bất kỳ lúc nào** — không cần đợi luồng kết thúc
- **Đã kiểm toán** — ba phát hiện được sửa trước khi triển khai
- **Đã triển khai** — \`0xdf21ed361016bee04ea430f1c2d86ed9cc3b85b8\` trên Arc Testnet

### Offchain
- **PostgreSQL backend** — luồng, ngân sách, sự kiện onchain được lưu offchain để truy vấn nhanh
- **Express REST API** — CRUD cho streams, ngân sách, và thống kê
- **Phong bì ngân sách** — theo dõi chi tiêu theo danh mục

### Frontend
- **SPA 5 màn hình** — Dashboard, Streams, Tạo Stream, Lịch sử, Cài đặt
- **Chủ đề Sáng / Tối** — dựa trên CSS variable, lưu vào \`localStorage\`, không nhấp nháy khi tải
- **Sidebar thu gọn** — chế độ icon-only trên desktop, slide-over trên mobile
- **Responsive Full HD** — nội dung \`max-w-[1440px]\`, lưới XL breakpoint

---

## Tổng Quan Tech Stack

| Tầng | Công nghệ |
|---|---|
| Frontend | React 18, Vite 6, TypeScript, Tailwind CSS v3 |
| Web3 | wagmi v2, viem v2, ConnectKit |
| Backend | Express 5, Bun runtime |
| Database | PostgreSQL 18 (Docker) |
| Smart Contracts | Solidity 0.8.20, Foundry, OpenZeppelin 5.x |
| Chain | Arc Testnet (Chain ID 5042002) |
| Token | USDC — \`0x3600000000000000000000000000000000000000\` |

---

## Mạng Lưới

| Thuộc tính | Giá trị |
|---|---|
| Mạng | Arc Testnet |
| Chain ID | 5042002 |
| Gas gốc | USDC (18 decimal view native, 6 decimal view ERC-20) |
| Finality | Dưới 1 giây |
| RPC | \`https://rpc.testnet.arc.io\` |
| Explorer | \`https://explorer.testnet.arc.io\` |

---

## Trạng Thái

- Hợp đồng: **đã triển khai và kiểm toán**
- Frontend: **production-ready**
- Backend: **đang chạy**
- Database: **đã migrate (5 bảng hoạt động)**
- Bảo mật: **24/25 lỗ hổng transitive đã được vá**
`;

export const DOC_02_VI = `# StreamVault — Kiến Trúc

---

## Sơ Đồ Hệ Thống

\`\`\`
┌─────────────────────────────────────────────────────────────┐
│                        Trình duyệt                          │
│                                                             │
│   React SPA (Vite, port 5173)                               │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│   │Dashboard │  │ Streams  │  │  Tạo mới │  │ Lịch sử  │  │
│   └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
│          │ wagmi/viem (RPC)        │ fetch /api/*           │
└──────────┼─────────────────────────┼────────────────────────┘
           │                         │ Vite proxy /api → :3001
           │                         ▼
           │               ┌──────────────────┐
           │               │  Express API      │
           │               │  server/index.ts  │
           │               │  port 3001        │
           │               └────────┬─────────┘
           │                        │ pg Pool
           │                        ▼
           │               ┌──────────────────┐
           │               │   PostgreSQL      │
           │               │   streamvault DB  │
           │               │   port 5432       │
           │               └──────────────────┘
           │
           │ RPC (Arc Testnet)
           ▼
┌──────────────────────────────────────────────────────────────┐
│                  Arc Testnet Blockchain                       │
│                                                              │
│   StreamVault.sol                                            │
│   0xdf21ed361016bee04ea430f1c2d86ed9cc3b85b8                │
│                                                              │
│   USDC ERC-20                                                │
│   0x3600000000000000000000000000000000000000                │
└──────────────────────────────────────────────────────────────┘
\`\`\`

---

## Các Tầng

### 1. Frontend (src/)

**Entry:** \`src/main.tsx\` — bọc ứng dụng trong \`WagmiProvider\`, \`QueryClientProvider\`, \`ConnectKitProvider\`, \`ThemeProvider\`, và Sonner \`Toaster\`.

**Views** (\`src/views/\`):

| View | File | Mục đích |
|---|---|---|
| Dashboard | \`Dashboard.tsx\` | Thống kê, tóm tắt streams, CTA cards |
| Streams | \`Streams.tsx\` | Lưới stream có thể lọc và phân trang |
| Tạo Stream | \`CreateStream.tsx\` | Form 2 bước: approve USDC → tạo stream |
| Lịch sử | \`History.tsx\` | Bảng gọn của tất cả streams |
| Cài đặt | \`Settings.tsx\` | Thông tin ví, địa chỉ hợp đồng, ngân sách |
| Tài liệu | \`Docs.tsx\` | Portal tài liệu này |

---

### 2. Backend (server/)

**Routes:**

| Prefix | File | Endpoints |
|---|---|---|
| \`/streams\` | \`routes/streams.ts\` | \`GET /\` (danh sách), \`GET /:id\`, \`POST /\`, \`PATCH /:id\` |
| \`/budgets\` | \`routes/budgets.ts\` | \`GET /\`, \`POST /\`, \`DELETE /:id\` |
| \`/stats\` | \`routes/stats.ts\` | \`GET /\` (tổng hợp dashboard) |
| \`/health\` | inline | \`GET /health\` — \`{ ok: true }\` |

---

### 3. Database (PostgreSQL)

| Bảng | Mục đích |
|---|---|
| \`users\` | Địa chỉ ví → tên hiển thị, ngày tạo |
| \`streams\` | Bản sao offchain của streams onchain + metadata |
| \`budget_envelopes\` | Danh mục chi tiêu với giới hạn tháng |
| \`onchain_events\` | Sự kiện thô đã giải mã từ hợp đồng |
| \`indexer_state\` | Cursor một hàng: \`last_indexed_block\` |

---

## Luồng Dữ Liệu: Tạo Stream

\`\`\`
Người dùng điền form
     │
     ▼
CreateStream.tsx
     │
     ├─ Bước 1: useWriteContract → USDC.approve(StreamVault, amount)
     │         Chờ xác nhận tx
     │
     ├─ Bước 2: useWriteContract → StreamVault.createStream(...)
     │         Chờ xác nhận tx
     │
     └─ Bước 3: POST /api/streams  ← lưu bản ghi offchain
\`\`\`

---

## Biến Môi Trường

| Biến | Dùng bởi | Mục đích |
|---|---|---|
| \`DATABASE_URL\` | Backend | Chuỗi kết nối PostgreSQL |
| \`VITE_API_BASE\` | Frontend | URL API gốc (mặc định \`/api\` qua proxy) |

---

## Ranh Giới Bảo Mật

- Hợp đồng là nguồn sự thật tài chính chính thống. PostgreSQL là bản sao tối ưu hóa đọc.
- Backend không có private key và không có khả năng ký.
- Phê duyệt USDC được giới hạn đúng số tiền nạp mỗi stream — không có unlimited approval.
- Hợp đồng sử dụng \`SafeERC20\`, \`ReentrancyGuard\`, và pull-based payout khi hủy.
`;

export const DOC_03_VI = `# StreamVault — Tài Liệu Smart Contract

---

## Triển Khai

| Thuộc tính | Giá trị |
|---|---|
| Mạng | Arc Testnet |
| Chain ID | 5042002 |
| Địa chỉ | \`0xdf21ed361016bee04ea430f1c2d86ed9cc3b85b8\` |
| Compiler | Solidity 0.8.20 |
| OpenZeppelin | 5.x |

---

## Lịch Sử Kiểm Toán

| Phát hiện | Mức độ | Trạng thái |
|---|---|---|
| Thời gian tạm dừng vẫn tích lũy | Cao | Đã sửa — thêm \`totalPausedDuration\` |
| Hủy bị khóa do recipient trong blocklist | Nghiêm trọng | Đã sửa — pull qua \`pendingWithdrawals\` |
| Kế toán fee-on-transfer sai | Cao | Đã sửa — kiểm tra balance-delta |

---

## Cấu Trúc Dữ Liệu

### StreamStatus (enum)

\`\`\`
Active     — đang stream, tích lũy đang chạy
Paused     — không tích lũy, người gửi có thể tiếp tục
Cancelled  — đã dừng, chia payout
Completed  — đã rút hết
\`\`\`

### Stream (struct)

| Trường | Kiểu | Mô tả |
|---|---|---|
| \`id\` | \`uint256\` | ID stream (tự tăng) |
| \`sender\` | \`address\` | Địa chỉ tạo và nạp tiền stream |
| \`recipient\` | \`address\` | Địa chỉ tích lũy và có thể rút |
| \`ratePerSecond\` | \`uint128\` | USDC (6 decimal) mỗi giây |
| \`deposit\` | \`uint128\` | Khoản nạp thực tế nhận được |
| \`withdrawn\` | \`uint128\` | Tổng số đã rút |
| \`startTime\` | \`uint64\` | \`block.timestamp\` lúc tạo |
| \`stopTime\` | \`uint64\` | Mở rộng mỗi lần tiếp tục |
| \`pausedAt\` | \`uint64\` | Timestamp lúc tạm dừng (0 nếu đang chạy) |
| \`totalPausedDuration\` | \`uint128\` | Tổng giây đã tạm dừng |
| \`status\` | \`StreamStatus\` | Trạng thái hiện tại |

---

## Các Hàm

### createStream

\`\`\`solidity
function createStream(
    address recipient,
    uint128 ratePerSecond,
    uint64 durationSeconds,
    string calldata label
) external nonReentrant returns (uint256 streamId)
\`\`\`

Chuyển \`deposit\` USDC từ \`msg.sender\`, tạo bản ghi \`Stream\`, emit \`StreamCreated\`.

### withdrawFromStream

\`\`\`solidity
function withdrawFromStream(uint256 streamId) external nonReentrant
\`\`\`

Tính số dư có thể rút, chuyển cho recipient. Đánh dấu Completed nếu đã rút hết.

### cancelStream

\`\`\`solidity
function cancelStream(uint256 streamId) external nonReentrant
\`\`\`

Tính số đã tích lũy, thêm phần của recipient vào \`pendingWithdrawals\`, hoàn tiền sender trực tiếp.

### pauseStream / resumeStream

\`\`\`solidity
function pauseStream(uint256 streamId) external
function resumeStream(uint256 streamId) external
\`\`\`

Tạm dừng lưu snapshot \`accruedAtPause\`. Tiếp tục mở rộng \`stopTime\` và tăng \`totalPausedDuration\`.

### claimPending

\`\`\`solidity
function claimPending() external nonReentrant
\`\`\`

Nhận số dư \`pendingWithdrawals\` của người gọi (được tích lũy từ các stream bị hủy).

### balanceOf

\`\`\`solidity
function balanceOf(uint256 streamId) external view
    returns (uint128 recipientBalance, uint128 senderBalance)
\`\`\`

Trả về số dư có thể rút trực tiếp cho recipient và khoản nạp còn lại cho sender.

---

## Công Thức Tích Lũy

\`\`\`
Nếu Paused hoặc Cancelled:  trả về accruedAtPause
Nếu Completed:              trả về deposit

effectiveEnd = min(block.timestamp, stopTime)
elapsed = effectiveEnd - startTime - totalPausedDuration
accrued = elapsed * ratePerSecond
trả về min(accrued, deposit)
\`\`\`

Bất biến chính: **thời gian tạm dừng không bao giờ tích lũy giá trị.**

---

## Sự Kiện

| Sự kiện | Emit bởi | Các trường |
|---|---|---|
| \`StreamCreated\` | \`createStream\` | streamId, sender, recipient, ratePerSecond, deposit, startTime, stopTime |
| \`Withdrawal\` | \`withdrawFromStream\` | streamId, recipient, amount |
| \`StreamCancelled\` | \`cancelStream\` | streamId, sender, recipientPayout, senderRefund |
| \`StreamPaused\` | \`pauseStream\` | streamId, sender, accruedSoFar |
| \`StreamResumed\` | \`resumeStream\` | streamId, sender, newStopTime |
| \`PendingClaimed\` | \`claimPending\` | claimant, amount |

---

## Lỗi Tùy Chỉnh

| Lỗi | Khi nào xảy ra |
|---|---|
| \`StreamNotFound\` | Stream ID không có sender |
| \`NotStreamSender\` | Người gọi không phải sender |
| \`NotStreamRecipient\` | Người gọi không phải recipient |
| \`StreamNotActive\` | Thao tác yêu cầu trạng thái Active |
| \`StreamAlreadyPaused\` | Gọi pause trên stream đã tạm dừng |
| \`ZeroAddress\` | Truyền địa chỉ zero |
| \`SenderIsRecipient\` | Sender và recipient là cùng một địa chỉ |
| \`InvalidRate\` | Rate bằng 0 hoặc deposit overflow |
| \`InvalidDuration\` | Duration bằng 0 hoặc vượt quá 3650 ngày |
| \`NothingToWithdraw\` | Số dư có thể rút bằng 0 |
| \`InsufficientTransfer\` | Nhận được ít hơn dự kiến |
`;

export const DOC_04_VI = `# StreamVault — Hệ Thống Thiết Kế

---

## Triết Lý

StreamVault sử dụng hệ thống **glassmorphism + dark-safe layered surface**. Các card nổi trên nền gradient với blur và độ trong suốt tinh tế. Bảng màu nghiêng về dark-blue-navy trong cả hai chế độ sáng và tối.

Quy tắc thiết kế:
- Chỉ dùng semantic tokens — không dùng hex thô cho màu nhạy cảm với theme
- Dark mode là ưu tiên đầu, không phải bổ sung
- Phân cấp typography chặt chẽ: \`display\` (Space Grotesk) cho tiêu đề
- Whitespace rộng rãi; mật độ thông tin có chủ đích
- Các trạng thái tương tác luôn hiển thị rõ ràng

---

## CSS Tokens Màu Sắc

Tất cả tokens nằm trong \`src/index.css\` dưới \`:root\` (sáng) và \`.dark\` (tối).

### Nền & Bề Mặt

| Token | Sáng | Tối | Dùng cho |
|---|---|---|---|
| \`--bg\` | \`#f6f7fb\` | \`#0c1220\` | Nền trang |
| \`--surface\` | \`rgba(255,255,255,0.80)\` | \`rgba(22,32,52,0.85)\` | Nền glass card |
| \`--surface-muted\` | \`#f1f3f8\` | \`#111827\` | Nền input |
| \`--sidebar-bg\` | \`rgba(255,255,255,0.92)\` | \`rgba(10,18,32,0.95)\` | Panel sidebar |
| \`--topbar-bg\` | \`rgba(255,255,255,0.85)\` | \`rgba(10,18,32,0.90)\` | Panel topbar |

### Chữ

| Token | Sáng | Tối | Dùng cho |
|---|---|---|---|
| \`--ink\` | \`#0f1f3d\` | \`#e8f0ff\` | Chữ chính |
| \`--muted\` | \`#5a6a82\` | \`#7a90b0\` | Chữ phụ / nhãn |
| \`--subtle\` | \`#8a96ac\` | \`#4d6480\` | Placeholder, gợi ý |

### Thương Hiệu & Trạng Thái

| Token | Màu | Dùng cho |
|---|---|---|
| \`--accent\` | \`#122d45\` / \`#3b82f6\` | Màu hành động chính |
| \`--success\` | \`#1a8047\` | Stream đang chạy, trạng thái tích cực |
| \`--warn\` | \`#c47a0a\` | Stream tạm dừng, cảnh báo |
| \`--danger\` | \`#ba2b4c\` | Stream đã hủy, lỗi |

---

## Typography

| Font | Class | Dùng cho |
|---|---|---|
| Space Grotesk | \`.display\` | Tiêu đề, tên thương hiệu, số liệu |
| System sans-serif | mặc định | Nội dung, nhãn, input |
| Monospace | \`.mono\` | Địa chỉ, hash, tx ID |

---

## Patterns Component

### Glass Card

\`\`\`tsx
<div className="glass-card p-5">
  {/* background: var(--surface), blur(12px), border: 1px solid var(--border) */}
</div>
\`\`\`

### Hover Surface

\`\`\`tsx
className="hover-surface"
// An toàn trong cả sáng và tối — không dùng hover:bg-black/5
\`\`\`

### Status Badge

\`\`\`tsx
const STATUS_STYLES = {
  active:    { bg: 'color-mix(in srgb, var(--success) 12%, transparent)', color: 'var(--success)' },
  paused:    { bg: 'color-mix(in srgb, var(--warn) 12%, transparent)',    color: 'var(--warn)'    },
  cancelled: { bg: 'color-mix(in srgb, var(--danger) 12%, transparent)',  color: 'var(--danger)'  },
};
\`\`\`

---

## Hệ Thống Layout

| Context | Lưới |
|---|---|
| Stat cards Dashboard | \`grid-cols-1 sm:grid-cols-2 xl:grid-cols-4\` |
| Danh sách stream | \`grid-cols-1 md:grid-cols-2 xl:grid-cols-3\` |
| Tạo stream | \`grid-cols-1 xl:grid-cols-[1fr_380px]\` |
| Cài đặt | \`grid-cols-1 xl:grid-cols-[380px_1fr]\` |

---

## Quy Tắc Dark Mode

1. **Không dùng \`hover:bg-black/5\`** — dùng class \`hover-surface\`
2. **Không dùng rgba thô với white/black** cho surface nhạy theme — dùng CSS vars
3. **\`color-mix(in srgb, var(--token) N%, transparent)\`** cho nền tinted
4. **Footer** có palette tối riêng — cố ý, không thêm overrides light mode
5. **Màu chart và status** là brand colors — không đổi giữa các theme

---

## Màu Danh Mục

| Danh mục | Màu |
|---|---|
| payroll | \`#2563eb\` (xanh dương) |
| subscription | \`#7c3aed\` (tím) |
| grant | \`#059669\` (xanh lá) |
| retainer | \`#d97706\` (hổ phách) |
| other | \`#64748b\` (xám) |
`;

export const DOC_05_VI = `# StreamVault — Tiêu Chuẩn Code

---

## Quy Tắc Chung

1. **Đọc trước khi sửa.** Luôn đọc file trước khi dùng \`edit_file\`.
2. **Không hardcode giá trị trong UI.** Import từ \`src/onchain-facts.ts\` và \`src/onchain-money.ts\`.
3. **Không dùng hex thô** cho giá trị nhạy theme. Dùng CSS variables \`var(--token)\`.
4. **Không bao giờ \`hover:bg-black/5\`** — dùng class \`hover-surface\` (an toàn dark mode).
5. **TypeScript strict.** Không dùng \`any\`. Dùng type đúng cho tất cả props, state, và API response.
6. **Xử lý lỗi.** Không bao giờ bỏ qua lỗi im lặng.

---

## Patterns TypeScript

### Props và State

\`\`\`ts
interface StreamCardProps {
  stream: StreamRecord;
  onRefresh: () => void;
}

type StreamStatus = 'active' | 'paused' | 'cancelled' | 'completed';
\`\`\`

### Async / Effects

\`\`\`ts
useEffect(() => {
  if (!address) return;
  setLoading(true);
  api.streams.list(address)
    .then(({ streams, total }) => {
      setStreams(streams);
      setTotal(total);
    })
    .catch(console.error)
    .finally(() => setLoading(false));
}, [address]);
\`\`\`

---

## Patterns Onchain

### Luôn import facts, không tự gõ

\`\`\`ts
// SAI
const USDC = '0x3600000000000000000000000000000000000000';

// ĐÚNG
import { getUsdc } from '@/onchain-facts';
const usdc = getUsdc(chainId);
\`\`\`

### Tất cả phép toán decimal qua onchain-money

\`\`\`ts
// SAI
const amount = BigInt(value) * 10n ** 6n;

// ĐÚNG
import { parseUsdc, formatUsdc } from '@/onchain-money';
const amount = parseUsdc(value);
\`\`\`

---

## Quy Ước Đặt Tên

| Đối tượng | Quy ước | Ví dụ |
|---|---|---|
| React components | PascalCase | \`StreamCard\`, \`CreateStream\` |
| Hooks | camelCase với tiền tố \`use\` | \`useTheme\`, \`useStreamBalance\` |
| Hằng số | UPPER_SNAKE_CASE | \`STREAM_VAULT_ADDRESS\` |
| CSS variables | kebab-case với \`--\` | \`--surface-muted\` |
| DB tables | snake_case | \`budget_envelopes\` |
| DB columns | snake_case | \`rate_per_second\` |

---

## Patterns Bị Cấm

\`\`\`ts
// Không bao giờ dùng any
const data: any = response;

// Không bao giờ hover:bg-black/* trong components
className="hover:bg-black/5"  // dùng hover-surface thay thế

// Không hardcode địa chỉ onchain
const USDC = '0x3600...';

// Không tự viết bigint decimal math
const amount = BigInt(val) * 10n ** 6n;

// Không gọi .json() mà không kiểm tra response.ok
const data = await fetch(url).then(r => r.json()); // sai
// Đúng:
const r = await fetch(url);
if (!r.ok) throw new Error(\`HTTP \${r.status}\`);
const data = await r.json();
\`\`\`

---

## Kiểm Tra Lint & Type

\`\`\`bash
bun run check   # chạy oxlint + tsc --noEmit
\`\`\`

- **0 errors** bắt buộc trước mỗi commit
- Warnings chỉ được phép cho các patterns đã được chấp thuận
- Quy tắc \`react/set-state-in-effect\` được đặt thành \`warn\` — các effect fetch dữ liệu thông thường dùng pattern này
`;

export const DOC_06_VI = `# StreamVault — Quy Trình Phát Triển

---

## Bắt Đầu

### Yêu Cầu

- [Bun](https://bun.sh) >= 1.3
- [Foundry](https://book.getfoundry.sh) (cho công việc contract)
- [Docker](https://docker.com) (cho PostgreSQL cục bộ)
- Node.js >= 20 (cho Circle CLI)

### Cài Đặt

\`\`\`bash
# 1. Clone
git clone https://github.com/haileva/streamvault
cd streamvault

# 2. Cài dependencies
bun install

# 3. Cấu hình môi trường
cp .env.example .env   # điền DATABASE_URL

# 4. Khởi động PostgreSQL (Docker)
docker run -d \\
  --name streamvault-pg \\
  -e POSTGRES_USER=streamvault \\
  -e POSTGRES_PASSWORD=streamvault \\
  -e POSTGRES_DB=streamvault \\
  -p 5432:5432 \\
  postgres:18-alpine

# 5. Khởi động backend
bun run server

# 6. Khởi động frontend (terminal khác)
bun run dev
\`\`\`

---

## Scripts Có Sẵn

| Script | Lệnh | Mô tả |
|---|---|---|
| \`bun run dev\` | \`vite\` | Khởi động Vite dev server với HMR |
| \`bun run server\` | \`bun run server/index.ts\` | Khởi động Express API server |
| \`bun run check\` | \`bash scripts/check.sh\` | Chạy oxlint + TypeScript check |
| \`bun run contracts:build\` | \`forge build\` | Compile Solidity contracts |
| \`bun run contracts:test\` | \`forge test\` | Chạy Foundry unit tests |

---

## Quy Trình Git

### Chiến Lược Branch

\`\`\`
main            — production-ready, luôn có thể deploy
feat/<name>     — tính năng mới
fix/<name>      — sửa lỗi
refactor/<name> — refactor không thay đổi behavior
docs/<name>     — chỉ tài liệu
security/<name> — dependency hoặc security fixes
\`\`\`

### Định Dạng Commit

\`\`\`
<type>(<scope>): <mô tả ngắn>
\`\`\`

| Type | Khi nào dùng |
|---|---|
| \`feat\` | Tính năng mới |
| \`fix\` | Sửa lỗi |
| \`refactor\` | Thay đổi code không ảnh hưởng behavior |
| \`style\` | Format, chỉ thay đổi CSS |
| \`docs\` | Chỉ tài liệu |
| \`security\` | Sửa security / dependency |
| \`chore\` | Tooling, cấu hình |

---

## Quality Gates

Mỗi push lên \`main\` phải qua:

\`\`\`bash
bun run check           # 0 errors bắt buộc
bun run contracts:build # không lỗi compile (nếu contract thay đổi)
bun run contracts:test  # tất cả tests pass (nếu contract logic thay đổi)
bunx vite build         # build thành công
\`\`\`

---

## Chính Sách Audit

| Mức độ | Chính sách |
|---|---|
| Nghiêm trọng | Phải sửa trước khi deploy |
| Cao | Phải sửa trước khi deploy |
| Trung bình | Sửa hoặc ghi nhận rủi ro chấp nhận được |
| Thấp | Sửa khi có thể |

---

## Security Audits

\`\`\`bash
bun audit
\`\`\`

Dùng \`overrides\` trong \`package.json\` để force phiên bản đã vá của transitive dependencies.
**Không bao giờ dùng \`--force\` mà không kiểm tra tương thích.**

Hiện tại: 1 lỗ hổng low-severity còn lại trong \`elliptic\` (chưa có bản vá từ upstream).

---

## Triển Khai

\`\`\`bash
# Deploy contract
bun run compass:deploy

# Deploy frontend lên Netlify / Hugging Face
# → Kết nối qua Arc Studio sidebar → "deploy this"
\`\`\`

Triển khai mainnet yêu cầu kiểm toán bảo mật độc lập và được thực hiện ngoài Arc Studio.
`;

export interface DocEntryBilingual {
  id: string;
  title: { en: string; vi: string };
  subtitle: { en: string; vi: string };
  content: { en: string; vi: string };
  badge?: { en: string; vi: string };
}
