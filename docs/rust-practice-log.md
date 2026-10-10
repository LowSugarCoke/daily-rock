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

## 2026-10-07 - 第 5 題：Genre stats

- 狀態：實作完成，驗證通過。
- 練習分支：`practice/genre-stats`；來源分支：`feat/redesign`。
- 檔案：`backend/src/genres.rs`（`GenreCount`、`genre_counts`）。
- 行事曆安排：21:55-22:25，America/Toronto，30 分鐘。
- 教學頁：https://claude.ai/artifact/QpzpBbASM8faQZA7NgCEZf

### 完成內容

- `genre_counts(&[HistoryItem]) -> Vec<GenreCount>`：每個曲風標籤出現幾次，次數由大到小，同次數照名字 A 到 Z。
- 5 個測試：空紀錄、每個標籤都算、聽最多的在前、同次數照名字、沒標籤的歌不加東西。

### 學習者自己做的與提供的協助

- 計畫第 5 週要學習者自己設計 struct、簽名和測試；學習者看到「全部通過」時不懂為什麼（因為還沒有任何 genres 測試），之後請 Claude Code 寫測試，struct、簽名和 5 個測試都由 Claude Code 提供。
- 學習者寫出 C++ 風格的虛擬碼：兩層 for 加線性搜尋的計數邏輯正確，缺排序。Claude Code 列出問題和 C++ 到 Rust 的對照表，給 `sort_by` 的提示（另一個 struct 的範例：`cmp`、對調 a b、`.then`）。
- 學習者把範例那一行照抄進迴圈裡，之後要求正確寫法；Claude Code 照學習者的邏輯翻成 Rust，學習者自己打進檔案，5 個測試通過、clippy 無警告。
- 之後比較了 `iter_mut().find` + `if let` 和 `HashMap` 的寫法；收尾前檔案已改成與 `backend/solutions/genres.rs` 相同的 `HashMap` 版本，所以 commit 的是解答版本。

### 學習證據與下次教法

- 能用兩層迴圈和線性搜尋寫出計數邏輯（與第 1 題 `era_progress` 相同的思路）。
- 尚未獨立寫出：Rust 的 for 語法、`iter_mut`、`*` 解參考比較、`clone`、`sort_by` 的組合、`HashMap` 的 `entry().or_insert()`。
- 下次先用 10 分鐘，不看答案把 `genre_counts` 重寫成 `HashMap` 版本（`flat_map`、`entry`、`sort_by`），讓 5 個測試通過，再準備第 6 題。

### 驗證

- `cargo test --locked`：46 個測試通過（40 個單元／路由測試、6 個整合測試）。
- `cargo clippy --all-targets --locked -- -D warnings`：通過，無警告。
- `cargo fmt --all -- --check`：通過。

## 2026-10-09 - 第 5 題重寫:`genre_counts` 改用 HashMap

- 狀態:完成,沒有看答案。
- 練習分支:`practice/genre-hashmap`;來源分支:`feat/redesign`。
- 行事曆安排:19:35-20:05,America/Toronto,30 分鐘。
- 教學頁:https://claude.ai/artifact/QpzpBbASM8faQZA7NgCEZf

### 學習者自己做的與提供的協助

- 學習者自己寫出整個函式:`HashMap<&str, usize>` 計數、`into_iter().map(...).collect()` 轉成 `Vec<GenreCount>`、`sort_by` 加 `then_with` 排序。
- 第一版直接拿 `item.genre_tags` (整個 `Vec<String>`) 當 key,數的是歌不是標籤,編譯失敗 (`&str: Borrow<Vec<String>>`)。Claude Code 指出少了一層走過每個標籤的迴圈,並給 `for tag in &item.genre_tags` 和 `tag.as_str()` 的對照;學習者補上後 5 個測試通過。
- 測試通過後,學習者問一行的寫法;Claude Code 解釋 `*map.entry(key).or_insert(0) += 1`,學習者自己打進檔案。
- 和解答的差別:解答用 `flat_map` 把兩層迴圈攤成一層,其餘幾乎相同。

### 學習證據與下次教法

- 已能獨立寫出:`HashMap` 宣告與更新、`into_iter().map().collect()`、`sort_by` 加 `cmp` 和 `then_with`、`&String` 轉 `&str`。
- 還要注意:先確認欄位的型別 (單一值還是清單),再決定迴圈有幾層。
- 下次準備第 6 題 Cloudflare Access JWT 檢查。

### 驗證

- `cargo test --locked`:46 個測試通過 (40 個單元/路由測試、6 個整合測試)。
- `cargo fmt --all -- --check`:通過。
- `cargo clippy`:未執行,Windows Application Control 擋住了 `cargo-clippy.exe` (os error 4551)。

## 2026-10-10 - 第 6 題:Cloudflare Access JWT 檢查

- 狀態:完成,但程式都由 Claude Code 寫。
- 練習分支:`practice/access-jwt`;來源分支:`feat/redesign`。
- 檔案:`backend/src/access.rs` (`AccessConfig`、`AccessError`、`verify_access`)、`backend/test-keys/` (只給測試用的 RSA 金鑰)。
- 行事曆安排:當天行事曆沒有 Daily Rock 時段。
- 教學頁:https://claude.ai/artifact/CWZYcT4DHRQKzZQZfbnrRi

### 完成內容

- `verify_access(&HeaderMap, &DecodingKey, &AccessConfig) -> Result<String, AccessError>`:從 `Cf-Access-Jwt-Assertion` 拿出門票,用 `jsonwebtoken` 驗 RS256 簽章、`exp`、`iss`、`aud`,回傳 email;沒有 header 是 `MissingToken`,過期是 `Expired`,其他是 `InvalidToken`。
- 7 個測試:正常的票、沒有 header、不是 JWT、別的私鑰簽的、別的 `aud`、別的 `iss`、過期。
- 加入 `jsonwebtoken` 10 (`rust_crypto`、`use_pem`),以及 wasm32 用的 `getrandom` `js` feature;確認能編成 wasm32。

### 學習者自己做的與提供的協助

- 計畫第 6 週要學習者自己設計型別、簽名、測試和本體。學習者請 Claude Code 寫測試,所以型別和簽名也一起由 Claude Code 寫;之後又請 Claude Code 寫本體。學習者這題沒有寫程式。
- 學習者問了三個觀念:測試用的私鑰和公鑰放在哪、公鑰會不會由 client 送 (不會,否則壞人可以用自己的鑰匙做假票)、Worker 什麼時候下載公鑰 (第一個請求需要時下載並存在記憶體,門票的 `kid` 不認得時再重新下載)。
- 本體寫好後,Claude Code 分三段配 C++ 對照解釋:`get` / `and_then` / `ok_or` / `?`、`Validation` 設定、`decode` 加 `map_err` 與 `match error.kind()`。

### 學習證據與下次教法

- 能說出:門票三段的意義、私鑰蓋章公鑰驗章、公鑰必須來自後端信任的來源。
- 尚未獨立寫出:`Option` 串接 (`and_then`、`ok_or`)、`map_err`、讀外部 crate 文件並對到 API。
- 下次先刪掉 `verify_access` 的本體 (保留測試),不看答案重寫到 7 個測試通過;再做下載公鑰、每個請求都驗票、沒過回 401。

### 驗證

- `cargo test --locked`:53 個測試通過 (47 個單元/路由測試、6 個整合測試)。
- `cargo clippy --all-targets --locked -- -D warnings`:通過,無警告。
- `cargo fmt --all -- --check`:通過。
- `cargo check --target wasm32-unknown-unknown`:通過。

