# 要件定義書

## プロジェクト名
**HAR Automation** - Web パフォーマンス計測用 HAR ファイル自動取得ツール

## バージョン
1.0.0

## 作成日
2025年12月9日

---

## 1. プロジェクト概要

### 1.1 目的
認証が必要な Web サイトに対して、リアルなネットワーク条件下で HAR (HTTP Archive) ファイルを自動取得し、Web パフォーマンス計測を効率化する。

### 1.2 背景
- Web アプリケーションのパフォーマンス計測には、ネットワークトラフィックの詳細な記録が必要
- 認証が必要なサイトでは、毎回ログイン操作が必要で手間がかかる
- 複数回の計測を行う際、手動操作では再現性や効率性に課題がある
- ネットワーク条件を統一した計測環境が必要

### 1.3 対象ユーザー
- 性能試験チーム

---

## 2. システム要件

### 2.1 機能要件

#### 2.1.1 ログイン情報の保存機能 (login.js)

**機能概要:**
ユーザーが手動でログインした後、そのセッション情報（Cookie 等）を保存し、以降の自動計測で再利用できるようにする。

**機能詳細:**
- Chromium ブラウザを GUI モードで起動
- 対象サイト（https://sample.app）にアクセス
- ユーザーが手動でログイン操作を実行
- ユーザーが Enter キーを押すとセッション情報を `auth.json` に保存
- ブラウザを終了

**入力:**
- ユーザーによる手動ログイン操作
- ターミナルでの Enter キー入力

**出力:**
- `auth.json` ファイル（Cookie とセッション情報）

**実行コマンド:**
```bash
node login.js
```

#### 2.1.2 HAR ファイル自動取得機能 (get_har.js)

**機能概要:**
保存されたログイン情報を使用して、指定した URL に複数回アクセスし、HAR ファイルを自動で取得・保存する。

**機能詳細:**

##### (1) 認証情報の復元
- `auth.json` の存在チェック
- 各タスク実行時にログイン状態を復元

##### (2) 複数タスクの実行
- `TASKS` 配列に定義された各タスクを順次実行
- タスクごとに以下の情報を設定可能：
    - `label`: タスク識別名
    - `url`: アクセス対象 URL
    - `count`: 実行回数

##### (3) ネットワーク条件の制御
- **帯域制限:** Fast 3G 相当（ダウンロード 1.6 Mbps、アップロード 750 Kbps）
- **レイテンシー:** 10ms
- CDP (Chrome DevTools Protocol) を使用して設定

##### (4) キャッシュ制御
- `DISABLE_CACHE` フラグで有効/無効を切り替え
- `true`: キャッシュ無効（初回アクセスをシミュレート）
- `false`: キャッシュ有効（リピーターアクセスをシミュレート）

##### (5) シナリオ実行
- `runScenario()` 関数でページロード後の操作を定義
- デフォルト: ページロード完了後 15 秒待機
- カスタマイズ可能（スクロール、クリック等の操作）

##### (6) HAR ファイルの記録と保存
- Playwright の `recordHar` 機能を使用
- 各実行で独立した HAR ファイルを生成
- ファイル名形式: `{label}_{pageTitle}_{timestamp}.har`
- 保存先: デスクトップの `GetHars_YYYYMMDDHHMMSS` フォルダ

**入力:**
- `auth.json`（ログイン情報）
- `TASKS` 配列（実行タスク設定）
- `DISABLE_CACHE` フラグ
- `NETWORK_PRESET` 設定

**出力:**
- HAR ファイル群（デスクトップに保存）
- コンソールログ（実行状況）

**実行コマンド:**
```bash
node get_har.js
```

---

### 2.2 非機能要件

#### 2.2.1 性能要件
- 各タスク実行は独立しており、エラーが発生しても次のタスクに影響しない
- ブラウザ起動からページロード、HAR 保存まで、1 回の実行は約 20～30 秒程度

#### 2.2.2 信頼性要件
- ネットワーク条件を統一することで、計測の再現性を確保
- エラー発生時でもブラウザとコンテキストを適切にクローズ

#### 2.2.3 セキュリティ要件
- `auth.json` には認証情報が含まれるため、`.gitignore` で除外
- HAR ファイルにも機密情報が含まれる可能性があるため、同様に除外

#### 2.2.4 保守性要件
- 設定エリアを明確に分離し、技術者でなくても設定変更可能
- コメントで各設定項目の意味を明記

#### 2.2.5 互換性要件
- Node.js 環境で動作
- Chromium ブラウザ（Chrome チャンネル）を使用
- Windows 環境を想定（デスクトップパスの取得）

---

## 3. 機能仕様

### 3.1 設定可能なパラメータ

#### 3.1.1 キャッシュ設定
```javascript
const DISABLE_CACHE = true;  // true: キャッシュ無効, false: キャッシュ有効
```

#### 3.1.2 実行タスク
```javascript
const TASKS = [
  {
    label: 'Test',                                  // タスク名
    url: 'https://sample.app',       // アクセス先 URL
    count: 3                                         // 実行回数
  }
];
```

#### 3.1.3 ネットワーク設定
```javascript
const NETWORK_PRESET = {
  offline: false,                                    // オフラインモード
  downloadThroughput: (10 * 1024 * 1024) / 8,       // ダウンロード速度 (1.6 Mbps)
  uploadThroughput: (10 * 1024 * 1024) / 8,         // アップロード速度 (750 Kbps)
  latency: 10,                                       // レイテンシー (ms)
};
```

### 3.2 シナリオ定義

#### 3.2.1 デフォルトシナリオ
```javascript
async function runScenario(page, label) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(15000);  // 15 秒待機
}
```

#### 3.2.2 カスタムシナリオの例
```javascript
case 'SearchFlow':
  // スクロール操作
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  break;

case 'FormSubmit':
  // ボタンクリック
  await page.getByText('次へ').click();
  await page.waitForLoadState('networkidle');
  break;
```

---

## 4. データ仕様

### 4.1 auth.json の構造

```json
{
  "cookies": [
    {
      "name": "cookie_name",
      "value": "cookie_value",
      "domain": ".example.com",
      "path": "/",
      "expires": -1,
      "httpOnly": true,
      "secure": true,
      "sameSite": "Lax"
    }
  ],
  "origins": [
    {
      "origin": "https://example.com",
      "localStorage": []
    }
  ]
}
```

### 4.2 HAR ファイルの命名規則

**形式:**
```
{label}_{pageTitle}_{timestamp}.har
```

**例:**
```
Test_DoCoMoTOP_20251209143052.har
```

- `label`: TASKS 配列で定義したタスク名
- `pageTitle`: ページタイトル（特殊文字は除去）
- `timestamp`: YYYYMMDDHHmmss 形式

### 4.3 保存先フォルダの命名規則

**形式:**
```
GetHars_{timestamp}
```

**例:**
```
GetHars_20251209143000
```

**保存場所:**
デスクトップ（`os.homedir()` + `/Desktop/`）

---

## 5. 外部インターフェース

### 5.1 依存ライブラリ
- **Playwright:** ^1.57.0
    - ブラウザ自動化
    - HAR ファイル記録
    - CDP (Chrome DevTools Protocol) 制御

### 5.2 使用する Node.js 標準モジュール
- `fs`: ファイル操作
- `path`: パス操作
- `os`: OS 情報取得

### 5.3 外部サービス
- **対象サイト:** https://sample.app
    - ログイン対象サイト
    - HAR 取得対象サイト

---

## 6. エラー処理

### 6.1 auth.json が存在しない場合
```
エラー: auth.json が見つかりません。先に node login.js を実行してください。
```
プログラムを終了（`process.exit(1)`）

### 6.2 タスク実行中のエラー
- コンソールにエラーメッセージを出力
- ブラウザとコンテキストを適切にクローズ
- 次のタスクに継続

### 6.3 待機タイムアウト
```
[注意]待機中にタイムアウトしましたが、処理を続行します。
```
処理を継続し、HAR ファイルを保存

---

## 7. 実行フロー

### 7.1 初回実行フロー

```
1. node login.js を実行
   ↓
2. ブラウザが起動し、対象サイトにアクセス
   ↓
3. ユーザーが手動でログイン
   ↓
4. ターミナルで Enter キー押下
   ↓
5. auth.json にセッション情報を保存
   ↓
6. ブラウザを終了
```

### 7.2 計測実行フロー

```
1. node get_har.js を実行
   ↓
2. auth.json の存在をチェック
   ↓
3. デスクトップに保存フォルダを作成
   ↓
4. 各タスクをループ処理:
   ├─ 指定回数分ループ:
   │  ├─ ブラウザ起動
   │  ├─ auth.json でコンテキストを作成
   │  ├─ CDP でネットワーク・キャッシュ設定
   │  ├─ HAR 記録開始
   │  ├─ 対象 URL にアクセス
   │  ├─ runScenario() 実行
   │  ├─ コンテキスト・ブラウザクローズ
   │  └─ HAR ファイルをリネームして保存
   └─ 次のタスクへ
   ↓
5. すべてのタスク完了メッセージを表示
```

---

## 8. 使用シーン

### 8.1 初回アクセスのパフォーマンス計測
```javascript
const DISABLE_CACHE = true;  // キャッシュ無効
```
新規ユーザーの体験をシミュレート

### 8.2 リピーターアクセスのパフォーマンス計測
```javascript
const DISABLE_CACHE = false;  // キャッシュ有効
```
既存ユーザーの体験をシミュレート

### 8.3 複数ページの計測
```javascript
const TASKS = [
  { label: 'Top', url: 'https://example.com/', count: 3 },
  { label: 'Product', url: 'https://example.com/products', count: 3 },
  { label: 'Checkout', url: 'https://example.com/checkout', count: 3 },
];
```

### 8.4 ネットワーク条件別の計測
```javascript
// Fast 3G
const NETWORK_PRESET = {
  offline: false,
  downloadThroughput: (1.6 * 1024 * 1024) / 8,
  uploadThroughput: (0.75 * 1024 * 1024) / 8,
  latency: 562.5,
};

// 4G
const NETWORK_PRESET = {
  offline: false,
  downloadThroughput: (4 * 1024 * 1024) / 8,
  uploadThroughput: (3 * 1024 * 1024) / 8,
  latency: 20,
};
```

---

## 9. 制約事項

### 9.1 技術的制約
- Chrome ブラウザがインストールされている必要がある
- Node.js 環境が必要
- Windows 環境を想定（デスクトップパス取得）
- 実行前にすべての Chrome ブラウザを閉じる必要がある

### 9.2 機能的制約
- 対象サイトのログイン方式が変わると `auth.json` の再取得が必要
- ページロード時間が長い場合、タイムアウトする可能性がある
- JavaScript で動的に生成されるコンテンツの完全な読み込み保証はない

### 9.3 セキュリティ上の制約
- `auth.json` は機密情報を含むため、適切に管理する必要がある
- HAR ファイルにも Cookie やヘッダー情報が含まれるため、取り扱い注意

---

### 10.2 バージョン履歴
- **v1.0.0** (現在): 基本機能実装完了

---

## 11. 今後の拡張可能性

### 11.1 機能拡張案
- HAR ファイルの自動解析とレポート生成

### 11.2 改善案
- コマンドライン引数での設定変更

---

## 12. 参考資料

### 12.1 関連技術ドキュメント
- [Playwright Documentation](https://playwright.dev/)
- [HAR (HTTP Archive) Specification](http://www.softwareishard.com/blog/har-12-spec/)
- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)

### 12.2 プロジェクトファイル
- [package.json](package.json)
- [login.js](login.js)
- [get_har.js](get_har.js)
- [.gitignore](.gitignore)

---

## 付録

### A. ファイル構成

```
har-automation/
├── node_modules/          # 依存パッケージ
├── .git/                  # Git リポジトリ
├── .gitignore             # Git 除外設定
├── package.json           # プロジェクト設定
├── package-lock.json      # 依存関係ロック
├── auth.json              # 認証情報（Git 除外）
├── login.js               # ログイン処理スクリプト
└── get_har.js             # HAR 取得スクリプト
```

### B. 実行例

#### B.1 初回セットアップ
```bash
# 依存パッケージのインストール
npm install

# ログイン情報の保存
node login.js
# -> ブラウザでログイン後、Enter キー押下

# auth.json が作成されたことを確認
ls -l auth.json
```

#### B.2 HAR ファイルの取得
```bash
# 計測実行
node get_har.js

# 出力例:
# === HAR取得 自動化スクリプト開始 (auth.json利用版) ===
# 保存先フォルダを作成しました: C:\Users\...\Desktop\GetHars_20251209143000
# タスク数: 1 件
#
# ■ タスク開始: [Test] (https://sample.app)
#   --- 実行 1 / 3 ---
#     [操作] シナリオ: Test を実行中...
#     [待機] データ読み込みのため 5秒待機します...
#     -> 保存完了: Test_DoCoMoTOP_20251209143052.har
#   --- 実行 2 / 3 ---
#     ...
```

### C. トラブルシューティング

#### C.1 auth.json が見つからない
**エラー:**
```
エラー: auth.json が見つかりません。
```

**対処法:**
```bash
node login.js
```
を実行してログイン情報を保存してください。

#### C.2 ブラウザが起動しない
**原因:**
Chrome がインストールされていない、または Playwright が Chrome を検出できない。

**対処法:**
```bash
npx playwright install chrome
```

#### C.3 タイムアウトエラー
**原因:**
ページの読み込みに時間がかかっている。

**対処法:**
`get_har.js` の待機時間を延長：
```javascript
await page.waitForTimeout(30000);  // 15000 -> 30000
```

---

## 変更履歴

| 日付 | バージョン | 変更内容 | 作成者 |
|------|-----------|---------|--------|
| 2025-12-09 | 1.0.0 | 初版作成 | - |

---

**文書管理:**
- 文書名: 要件定義書
- プロジェクト: HAR Automation
- 対象バージョン: 1.0.0
- 最終更新日: 2025年12月9日