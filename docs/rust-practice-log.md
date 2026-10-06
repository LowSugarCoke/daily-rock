# Rust 練習紀錄

## 2026-10-06 - 第 4 題：AppError

- 狀態：實作完成，驗證通過。
- 練習分支：`practice/app-error`；來源分支：`feat/redesign`。
- 檔案：`backend/src/errors.rs`。
- 行事曆安排：17:35-18:05，America/Toronto，30 分鐘；實際練習時長未記錄。
- 教學頁：https://daily-rock-rust-app-error.jack20499.chatgpt.site

### 完成內容

- 實作 `From<worker::Error> for AppError`，將資料庫錯誤保存於 `Internal`。
- 實作 `IntoResponse for AppError`：`BadRequest` 回 400、`NotFound` 回 404，保留原訊息；`Internal` 回 500 與固定公開訊息。
- 三種回應皆為 JSON 字串，內部資料庫錯誤不會直接送給使用者。
- 與 `backend/solutions/errors.rs` 比較：實作邏輯相同，差異僅為註解與空行。

### 本次釐清的觀念

1. `AppError::Internal(error)` 保存原始錯誤，不會在這一步改寫成使用者訊息。學習者起初將這兩步混淆，後續以紙條與信封的比喻說明。
2. `From<worker::Error>` 只定義來源型別為 `worker::Error` 的轉換；handler 自己判斷輸入不合法與查無資料，建立 `BadRequest` 或 `NotFound`。
3. 資料庫回傳 `worker::Error`、handler 回傳 `AppError` 時，`?` 需要這個 `From` 轉換。移除此實作且不改寫呼叫處，現有 handler 會編譯失敗。
4. Axum 處理 handler 回傳的 `Err(AppError)` 時，透過 `IntoResponse` 產生 HTTP 回應。`from` 本身不會呼叫 `into_response`。
5. `match` 的每個分支產生一個 tuple；`let (status, message)` 按位置接住結果。分支內取出文字的 `message` 與外面接住結果的 `message` 是不同作用範圍的變數。

### 學習證據與下次教法

- 本次提供了完整範例，學習者完成程式並在逐步說明後表示理解；尚未驗證能否不看範例獨立重寫。
- 一次展示完整程式與術語表讓學習者表示看不懂。之後改成每次一個動作、日常比喻、具體值的流向，再對應 Rust 語法。
- 下次先用 5 分鐘複習：請學習者說出原始錯誤與公開訊息的差別，並追蹤一次 `match` tuple 如何成為 `status`、`message`。
- 不把本次完成等同於已熟練錯誤處理。確認上述觀念後，再進入第 5 題 Genre stats：`HashMap` 計數、排序與 closure，依計畫逐步讓學習者撰寫測試。

### 驗證

- `cargo test --locked`：41 個測試通過（35 個單元／路由測試、6 個整合測試）。
- `cargo clippy --all-targets --locked -- -D warnings`：通過，無警告。
- `cargo fmt --all -- --check`：通過。
