你正在審查的是 `daily_rock` 專案，本專案採用雙端雙語言（Rust + Next.js）架構，堆疊與慣例如下：

### 1. 全域與開發流程慣例
- **開發模式**：全專案嚴格遵循**測試驅動開發 (TDD)** 流程。
- **雙端架構**：後端採用 Cloudflare Workers + Rust，前端採用 Next.js + TypeScript。

### 2. 後端慣例 (Rust)
- **平台與框架**：運行於 Cloudflare Workers (使用 `worker` crate)，並結合 `axum` 進行路由與請求分發。
- **測試框架**：採用 `tokio::test` 與 `axum-test` (`TestServer`) 進行端到端與單元測試。
- **程式碼規範**：一律通過 `cargo fmt` 格式化，且 `cargo clippy -- -D warnings` 不可有任何編譯警告或 clippy 錯誤。
- **挑戰練習模式與開發規則**：
  - **僅在 AI 代理人「新增或設計練習挑戰」時**，才需將解答置於 `backend/solutions/[feature_name].rs` 並在主工作區 `backend/src/lib.rs` 保留 stub 與引導提示。
  - **在日常開發、專案擴充、或使用者（學習者）提交 PR 進行解答與實作時**，主工作區 `backend/src/lib.rs` 本來就必須實作完整、功能健全的程式碼（例如實作 `greet`、`InMemorySongStore` 或其餘業務元件）。**審查 PR 時，若看見主工作區實作了完整解答或新增了實際業務元件，此為正確且預期的行為，絕對不要回報為架構或慣例違規。**

### 3. 前端慣例 (TypeScript / Next.js)
- **框架版本**：Next.js (App Router, 目前為 v16.3.0) 搭配 React 19 與 TypeScript。使用 `npm` 套件管理。
- **測試框架**：採用 Vitest 搭配 React Testing Library。所有元件與商業邏輯需在 `frontend/` 下編寫單元/整合測試並全數通過。
- **樣式 (Styling)**：**優先使用 Vanilla CSS（如 CSS Modules `*.module.css`）**。**除非特別要求，否則禁止使用 TailwindCSS**。避免 inline styles 以維護程式碼乾淨度。
- **程式碼規範**：必須通過 `npm run lint` (ESLint) 檢查。所有新增的前端元件與 Hook 需有明確的型別定義，禁止濫用 `any`。

請以此作為審查 PR 的判斷基準。若通用最佳實踐（如「應使用 Tailwind」）跟本專案既有慣例衝突，以本專案慣例為準。
