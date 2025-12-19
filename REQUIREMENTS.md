# 要件定義書

## プロジェクト名
**HAR Automation** - Web パフォーマンス計測用 HAR ファイル自動取得ツール

## バージョン
2.0.0

## 作成日
2025年12月9日

## 最終更新日
2025年12月19日

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
- 環境変数 `LOGIN_URL` で指定されたサイトにアクセス（`.env`　ファイルを作成し設定）
- ユーザーが手動でログイン操作を実行
- ユーザーが Enter キーを押すとセッション情報を `auth.json` に保存
- ブラウザを終了

**入力:**
- ユーザーによる手動ログイン操作
- ターミナルでの Enter キー入力
- 環境変数 `LOGIN_URL`（`.env` ファイルから読み込み）

**出力:**
- `auth.json` ファイル（Cookie とセッション情報）

**実行コマンド:**
```bash
npm run login
```

#### 2.1.2 HAR ファイル自動取得機能 (get_har.js)

**機能概要:**
保存されたログイン情報を使用して、指定した URL に複数回アクセスし、HAR ファイルを自動で取得・保存する。

**機能詳細:**

##### (1) 認証情報の復元
- `auth.json` の存在チェック
- 各タスク実行時にログイン状態を復元

##### (2) ブラウザ継続モード
- ブラウザを1回だけ起動し、全タスクを通して使用
- 初回安定化のためのダミーアクセスを実行
- タスクごとに新しいコンテキストを作成（HAR 記録をリセット）

##### (4) イテレーション実行
- `totalIterations` で指定された回数、全シナリオを順繰りに実行
- 例: `totalIterations = 3` で3つのシナリオがある場合、計9回のタスク実行

##### (4) ネットワーク条件の制御
- **帯域制限:** デフォルト 1G Mbps
- **レイテンシー:** 20ms
- CDP (Chrome DevTools Protocol) を使用して設定
- `config/network.config.js` で設定変更可能

##### (5) キャッシュ制御
- `DISABLE_CACHE` フラグで有効/無効を切り替え
- `true`: キャッシュ無効（初回アクセスをシミュレート）
- `false`: キャッシュ有効（リピーターアクセスをシミュレート）

##### (6) シナリオ実行
- 外部シナリオファイル（`scenario/` フォルダ）を読み込んでい実行
- シナリオ終了後、共通の完了待機処理（DOM 読み込み完了確認）を自動実行

##### (7) HAR ファイルの記録と保存
- Playwright の `recordHar` 機能を使用
- 各実行で独立した HAR ファイルを生成
- ファイル名形式: `{label}_{pageTitle}_{timestamp}.har`
- 保存先: デスクトップの `measures/get_har_YYYYMMDDHHMMSS/` フォルダ

**入力:**
- `auth.json`（ログイン情報）
- `cofig/tasks.config.js` 配列（実行タスク設定）
- `config/network.config.js` (ネットワーク設定)

**出力:**
- HAR ファイル群（`measures/` フォルダに保存）
- コンソールログ（実行状況）

**実行コマンド:**
```Shell Script
npm run get_har
```

#### 2.1.3 シナリオ記録機能 (record_scenario.js)
**機能要件**: Playwright Inspector を使用してブラウザ操作を記録し、シナリオコードを自動生成する。

**機能詳細**

- Chromium ブラウザと Playwright　Inspector を起動
- `auth.json` が存在する場合はログイン状態で復元
- ユーザーの操作を自動的にコードに変換
- `scenarios/` フォルダにサンプルシナリオを自動作成


実行コマンド:
```
node record_scenario.js
```

---

### 2.2 非機能要件

#### 2.2.1 性能要件
- 各タスク実行は独立しており、エラーが発生しても次のタスクに影響しない
- ブラウザは全タスクを通して1回だけ起動（起動オーバーヘッドを削減
- 初回ダミーアクセスでブラウザの安定化を図る

#### 2.2.2 信頼性要件
- ネットワーク条件を統一することで、計測の再現性を確保
- エラー発生時でもコンテキストを適切にクローズし、次のタスクを継続
- タイムアウト時も処理を継続し、HAR ファイルを保存

#### 2.2.3 セキュリティ要件
- `auth.json` には認証情報が含まれるため、`.gitignore` で除外
- `.env` ファイルは `.gitignore` で除外
- HAR ファイルにも機密情報が含まれる可能性があるため、`measures/` は除外

#### 2.2.4 保守性要件
- 設定ファイルを `config/` フォルダに集約
- 環境変数は `.env` ファイルで管理
- `npm scripts` でコマンドを簡略化

#### 2.2.5 互換性要件
- Node.js 環境で動作
- Chromium ブラウザ（Chrome チャンネル）を使用
- Windows 環境を想定

---

## 3. 機能仕様

### 3.1 設定可能なパラメータ

#### 3.1.1 キャッシュ設定
```javascript
const DISABLE_CACHE = true;  // true: キャッシュ無効, false: キャッシュ有効
```

#### 3.1.2 実行タスク（config/tasks.config.js）
```javascript
module.exports = {
  totalIterations: 3,  // 全シナリオを順繰りに実行する回数
  tasks: [
    {
      label: 'scenario_01',         // タスク名
      url: 'https://sample.app',    // アクセス先 URL
      scenario: 'my_scenario.js'    // シナリオファイル（オプション）
    }
  ],
};
```

#### 3.1.3 ネットワーク設定 (config/network.config.js)

```javascript
network: {
  offline: false,                              // オフラインモード
  downloadThroughput: (10 * 1024 * 1024) / 8,  // ダウンロード速度 (10 Mbps)
  uploadThroughput: (10 * 1024 * 1024) / 8,    // アップロード速度 (10 Mbps)
  latency: 20,                                 // レイテンシー (ms)
}
```

### 3.2 シナリオ定義

#### 3.2.1 シナリオファイル形式
```javascript
module.exports = async function(page) {
  // 操作コードを記述
  await page.getByRole('button', { name: '検索' }).click();
  await page.waitForLoadState('domcontentloaded');
};
```

#### 3.2.2 共通完了待機処理
シナリオ終了後、get_har.js が自動的に以下の待機処理を実行：
```javascript
await page.waitForLoadState('domcontentloaded');
await page.waitForFunction(() => document.readyState === 'complete');
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
{label}_{pageTitle}_iter{n}_{timestamp}.har
```

**例:**
```
scenario_01_ExamplePage_iter1_20251219143052.har
```

- `label`: TASKS 配列で定義したタスク名
- `pageTitle`: ページタイトル（特殊文字は除去）
- `iter{n}`: イテレーション番号
- `timestamp`: YYYYMMDDHHmmss 形式

### 4.3 保存先フォルダの命名規則

**形式:**
```
measures/get_hars_{timestamp}/
```

**例:**
```
measures/get_hars_20251219143000/
```

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

### 5.3 環境変数
- `LOGIN_URL`: ログイン対象サイトのURL（`.env` ファイルで設定）

---

## 6. エラー処理

### 6.1 auth.json が存在しない場合
```
エラー: auth.json が見つかりません。先に npm run login を実行してください。
```
プログラムを終了（`process.exit(1)`）

### 6.2 config/tasks.config.js が存在しない場合
```
エラー: auth.json が見つかりません。先に npm run login を実行してください。
```
プログラムを終了（`process.exit(1)`）

### 6.3 タスク実行中のエラー
- コンソールにエラーメッセージを出力
- ブラウザとコンテキストを適切にクローズ
- 次のタスクに継続

### 6.4 待機タイムアウト
```
[注意]待機中にタイムアウトしましたが、処理を続行します。
```
処理を継続し、HAR ファイルを保存

---

## 7. 実行フロー

### 7.1 初回実行フロー

```
1. npm run login を実行
   ↓
2. ブラウザが起動し、LOGIN_URL にアクセス
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
1. npm run get_har を実行
   ↓
2. auth.json の存在をチェック
   ↓
3. measures/ に保存フォルダを作成
   ↓
4. ブラウザを1回起動
   ↓
5. ダミーアクセスで安定化
   ↓
6. イテレーションループ:
   ├─ 各タスクをループ:
   │  ├─ 新しいコンテキストを作成（HAR 記録開始）
   │  ├─ CDP でネットワーク・キャッシュ設定
   │  ├─ 対象 URL にアクセス
   │  ├─ シナリオ実行
   │  ├─ 共通完了待機処理
   │  ├─ コンテキストクローズ（HAR 保存）
   │  └─ HAR ファイルをリネーム
   └─ 次のイテレーションへ
   ↓
7. ブラウザを終了
   ↓
8. 完了メッセージを表示
```

---

## 8. 使用シーン

### 8.1 初回アクセスのパフォーマンス計測
```javascript
// config/network.config.js
disableCache: true  // キャッシュ無効
```
新規ユーザーの体験をシミュレート

### 8.2 リピーターアクセスのパフォーマンス計測
```javascript
// config/network.config.js
disableCache: false  // キャッシュ有効
```
既存ユーザーの体験をシミュレート

### 8.3 複数シナリオの反復計測
```javascript
// config/tasks.config.js
module.exports = {
  totalIterations: 5,  // 5回繰り返し
  tasks: [
    { label: 'Top', url: 'https://example.com/' },
    { label: 'Product', url: 'https://example.com/products' },
    { label: 'Checkout', url: 'https://example.com/checkout' },
  ],
};
// → 計15回のHARファイルが生成される
```

---

## 9. 制約事項

### 9.1 技術的制約
- Chrome ブラウザがインストールされている必要がある
- Node.js 環境が必要
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
バージョン | 日付 | 変更内容
--- | --- | ---
1.0.0 | 2025-12-09 | 初版作成
2.0.0 | 2025-12-19 | ブラウザ継続モード、イテレーション機能、npm scripts対応

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

---

## 付録

### A. ファイル構成

```
hikyaku/
├── config/
│   ├── network.config.js  # ネットワーク設定
│   └── tasks.config.js    # タスク設定
├── measures/              # HAR ファイル保存先（gitignore対象）
├── scenarios/             # シナリオファイル
│   └── sample_scenario.js
├── node_modules/          # 依存パッケージ
├── .env                   # 環境変数（gitignore対象）
├── .gitignore             # Git 除外設定
├── auth.json              # 認証情報（gitignore対象）
├── get_har.js             # HAR 取得スクリプト
├── login.js               # ログイン処理スクリプト
├── record_scenario.js     # シナリオ記録スクリプト
├── package.json           # プロジェクト設定
├── README.md              # 使い方ガイド
├── REQUIREMENTS.md        # 要件定義書（このファイル）
└── SCENARIOS_GUIDE.md     # シナリオ作成ガイド
```

### B. 実行例

#### B.1 初回セットアップ
```shell script
# 依存パッケージのインストール
# 依存パッケージのインストール
npm install

# .env ファイルを作成
echo "LOGIN_URL=https://example.com" > .env

# ログイン情報の保存
npm run login
# -> ブラウザでログイン後、Enter キー押下
```

#### B.2 HAR ファイルの取得
```bash
# 計測実行
npm run get_har

# 出力例:
# === HAR取得 自動化スクリプト開始 (Browser継続版) ===
# 保存先フォルダを作成しました: /path/to/hikyaku/measures/get_hars_20251219143000
# タスク数: 3 件
# 総イテレーション数: 3 回
#
# [ブラウザ] 起動中...
# [ブラウザ] ダミーアクセス完了。本番タスクを開始します。
#
# ========== イテレーション 1 / 3 ==========
# --- タスク 1 / 3: scenario_01 ---
#     [アクセス] https://example.com
#     [操作] シナリオ: scenario_01 を実行中...
#     -> 保存完了: scenario_01_ExamplePage_iter1_20251219143052.har
```

### C. トラブルシューティング

#### C.1 auth.json が見つからない
**エラー:**
```
エラー: auth.json が見つかりません。
```

**対処法:**
```bash
npm run login
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
シナリオファイル内で待機時間を調整してください。

---

**文書管理:**
- 文書名: 要件定義書
- プロジェクト: Hikyaku
- 対象バージョン: 2.0.0
- 最終更新日: 2025年12月19日