這份文件收錄 `daily_rock` 專案「全系統皆須遵守」的業務規則與領域不變量（Domain Invariants）。目的是讓 AI 審查端（Business Logic Reviewer）在不需要人工確認的情況下，就能識別出「技術上代碼正確、但違反了業務領域約定或名詞定義」的問題。

---

## 1. 領域統一語言 (Ubiquitous Language) 與命名規範

本專案嚴格遵循領域驅動設計 (DDD) 的統一語言，命名不符合規範一律視為商業邏輯與架構違規：

- **Song (歌曲)**：
  - **定義**：指一首特定的搖滾樂曲，包含歌名 (title)、藝術家 (artist)、專輯 (album)、發行年份 (release_year) 及流派細節 (genre)。
  - **禁用詞**：`Track`、`Record`、`Music Piece`。在變數名、API 欄位、UI 顯示上嚴禁出現這三個詞。
  - **Reviewer 該做的事**：只要看到 diff 中新增了名為 `track`、`record` 等變數或型別，一律回報並要求重構為 `Song`。

- **Daily Selection (每日精選)**：
  - **定義**：指被指派給特定日曆日期 (Calendar Day) 以供使用者聆聽和評分的特定 `Song`。
  - **禁用詞**：`Today's Song`、`Featured Song`、`Daily Pick`。
  - **Reviewer 該做的事**：凡是涉及「某天的主打歌」、「當日歌曲」的邏輯或 API 欄位，名稱必須是 `daily_selection` 或 `DailySelection`，嚴禁使用 `featured` 或 `pick`。

- **Rating (評分與評論)**：
  - **定義**：使用者針對某個 `Daily Selection` 提交的評估分數（例如 1 到 5 星）與可選的文字評論。
  - **禁用詞**：`Score`、`Evaluation`、`Review`（單獨作為評論名詞時）。
  - **Reviewer 該做的事**：評分與評論合稱 `Rating`，嚴禁拆開命名為 `score` 或是單純的 `review`，必須統一命名為 `rating`。

- **Listening History (聆聽歷史)**：
  - **定義**：按時間順序排列的過去每日精選 (Daily Selections) 及其相關評分 (Ratings) 的列表。
  - **禁用詞**：`History List`、`Tracking Log`、`Timeline`。
  - **Reviewer 該做的事**：表示歷史記錄的模組或 API 路由必須命名為 `listening_history`，不可使用 `timeline` 或 `log`。

---

## 2. 每日精選與評分核心業務規則

- **單日唯一性約束 (Daily Selection Uniqueness)**：
  - **規則**：每個日曆天 (Calendar Day) **有且僅有** 一首 `Daily Selection`。同一天不能有兩首精選，也不允許出現某天空白（無精選）的情況。
  - **Reviewer 該做的事**：如果看見後端新增 `Daily Selection` 的 API 沒有對 `date` 欄位做唯一性約束 (Unique constraint/index) 或是驗證，一律回報。

- **評分限制與對象 (Rating Target Invariant)**：
  - **規則**：使用者**只能**針對 `Daily Selection` 進行 `Rating` 提交。使用者不可直接對單純的 `Song` 提交評分（若該 Song 尚未被指派為 Daily Selection 之前）。
  - **Reviewer 該做的事**：審查評分 API 時，確保其接收的是 `daily_selection_id` 而不是 `song_id`。如果可以直接對 `Song` 評分，視為違背業務邏輯。

- **未來精選不可見與不可評分 (Future Selections Isolation)**：
  - **規則**：未來的 `Daily Selection` 對一般使用者而言是不可見且不可評分的。只有日期小於或等於當前系統時間 (Today) 的 `Daily Selection` 才會對外公開並開放 `Rating`。
  - **Reviewer 該做的事**：檢查前端或後端的查詢 API，確認其有根據當前時間進行篩選，防止使用者透過修改 URL 或是直接調用 API 提前獲取未來的 Daily Selections。

- **單人單次評分 (One Rating Per User Per Daily Selection)**：
  - **規則**：每位使用者對同一個 `Daily Selection` 只能擁有一個 `Rating`。後續的提交行為必須是更新（Update/Upsert）既有的評分，而非建立重複的 Rating 記錄。
  - **Reviewer 該做的事**：驗證 Rating 提交的寫入邏輯（如 `POST /api/ratings`），確保其採用 Upsert 機制，或在資料庫層設有 `(user_id, daily_selection_id)` 的聯合唯一索引 (Composite Unique Index)。

- **歷史記錄時序性 (Listening History Chronological Order)**：
  - **規則**：`Listening History` 必須嚴格按照日期降序（Chronological Order Descending，即最新的一天在最前面）進行排列與呈現。
  - **Reviewer 該做的事**：若前端渲染歷史列表或後端 API 回傳 history 時未做顯式的 `ORDER BY date DESC` 排序，應回報。
