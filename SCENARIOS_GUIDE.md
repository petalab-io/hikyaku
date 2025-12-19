
# シナリオ作成ガイド - 非エンジニア向け

このガイドでは、実際のブラウザ操作から自動実行可能なシナリオを作成する方法を説明します。

## 初回セットアップ

初めて使う場合は、以下の手順でセットアップしてください：

### 1. タスク設定ファイルの確認

`config/tasks.config.js` ファイルを開いてください。
ファイル内にサンプルコードがコメントで記載されています。

### 2. タスクを設定
```javascript
// config/tasks.config.js
module.exports = {
  totalIterations: 3,  // 全シナリオを3回繰り返し実行
  tasks: [
    {
      label: 'scenario_01',
      url: 'https://example.com',
      scenario: 'my_scenario.js'  // シナリオファイル名
    },
  ],
};
```

---

## 全体の流れ
```
1. ブラウザ操作を記録する (record_scenario.js を実行)
   ↓
2. 生成されたコードをコピー
   ↓
3. scenarios/ フォルダにシナリオファイルを作成
   ↓
4. config/tasks.config.js でシナリオを指定
   ↓
5. npm run get_har を実行
```

## ステップ１: ブラウザ操作を記録する
### 1-1. 記録ツールを起動

コマンドプロンプトで以下を実行:

```bash
node record_scenario.js
```

### 1-2. ブラウザで操作を実行

- Chromeブラウザと「Playwright Inspector」ウィンドウが開きます
- ブラウザで実際に操作を行ってください:
    - リンクをクリック
    - フォームに入力
    - ボタンを押す
    - スクロールする
    - など

### 1-3. 生成されたコードを確認

- 「Playwright Inspector」の右側にコードが自動生成されます
- 例:
  ```javascript
  await page.getByRole('button', { name: '検索' }).click();
  await page.getByLabel('キーワード').fill('Playwright');
  await page.getByRole('link', { name: '次のページ' }).click();
  ```

### 1-4. コードをコピー

- Inspectorからコードをすべて選択してコピー
- ブラウザを閉じると記録ツールが終了します

---

## ステップ2: シナリオファイルを作成

### 2-1. scenarios フォルダに新しいファイルを作成

ファイル名の例:
- `login_flow.js` (ログイン操作)
- `search_and_click.js` (検索して結果をクリック)
- `multi_page_navigation.js` (複数ページを遷移)

### 2-2. ファイルの基本構造

以下のテンプレートを使用してください:

```javascript
/**
 * シナリオ名: [ここにシナリオの説明を書く]
 *
 * 実施する操作:
 * 1. [操作1の説明]
 * 2. [操作2の説明]
 * 3. [操作3の説明]
 */

module.exports = async function(page) {
  // ここに Playwright Inspector からコピーしたコードを貼り付け

  await page.getByRole('button', { name: '検索' }).click();
  await page.getByLabel('キーワード').fill('Playwright');

  // ページ遷移後は必ず待機を入れる
  await page.waitForLoadState('networkidle');

  await page.getByRole('link', { name: '次のページ' }).click();
  await page.waitForLoadState('networkidle');

  console.log('    [シナリオ] 操作が完了しました');
};
```

### 2-3. 重要なポイント

#### :チェックマーク_緑: ページ遷移後は基本的な待機を入れる

```javascript
// 悪い例
await page.click('button');
await page.click('a'); // ページが読み込まれる前に実行されてエラー

// 良い例
await page.click('button');
await page.waitForLoadState('domcontentloaded'); // DOM の読み込みを待つ
await page.click('a');
```

#### :チェックマーク_緑: シナリオ終了判定について

**重要**: シナリオファイル内では、最後のページ遷移後に `domcontentloaded` まで待機すればOKです。

**最終的なDOM完了待機（`document.readyState === 'complete'`）は、`get_har.js` の共通処理で自動的に実施されます。**

```javascript
module.exports = async function(page) {
  // 操作1
  await page.click('button');
  await page.waitForLoadState('domcontentloaded');

  // 操作2
  await page.click('a');
  await page.waitForLoadState('domcontentloaded');

  // ここで終了してOK！
  // DOM完全読み込み待機は get_har.js が自動で実施します
};
```

#### よく使う待機方法

```javascript
// DOM の読み込みを待つ（推奨）
await page.waitForLoadState('domcontentloaded');

// ネットワークが静まるまで待つ（タイムアウトしやすいので注意）
await page.waitForLoadState('networkidle');

// 特定の要素が表示されるのを待つ
await page.waitForSelector('button[type="submit"]');

// 指定時間待つ（最終手段）
await page.waitForTimeout(3000); // 3秒待機
```

---

## ステップ3: config/tasks.config.js でシナリオを設定

### 3-1. config/tasks.config.js を開く

`config/` フォルダにある `tasks.config.js` を開きます。

### 3-2. tasks にシナリオを追加

```javascript
// config/tasks.config.js
module.exports = {
    // 全シナリオを順繰りに実行する総回数
    totalIterations: 3,

    tasks: [
        {
            label: 'LoginFlow',                 // タスク名
            url: 'https://example.com/login',   // 開始URL
            scenario: 'login_flow.js'           // 作成したシナリオファイル名
        },
        {
            label: 'SearchTest',
            url: 'https://example.com',
            scenario: 'search_and_click.js'
        },
    ],
};
```

### 3-3. スクリプトを実行

```bash
npm run get_har
```

---

## シナリオサンプル集

### サンプル1: ログインして情報を閲覧

```javascript
/**
 * シナリオ: ログインして情報を閲覧
 */

module.exports = async function(page) {
  // ログインボタンをクリック
  await page.getByRole('button', { name: 'ログイン' }).click();

  // メールアドレスを入力
  await page.getByLabel('メールアドレス').fill('test@example.com');

  // パスワードを入力
  await page.getByLabel('パスワード').fill('password123');

  // ログイン実行
  await page.getByRole('button', { name: '送信' }).click();
  await page.waitForLoadState('domcontentloaded');

  // ダッシュボードのリンクをクリック
  await page.getByRole('link', { name: 'ダッシュボード' }).click();
  await page.waitForLoadState('domcontentloaded');

  // DOM完全読み込みは get_har.js が自動で待機します
};
```

### サンプル2: 検索して結果をクリック

```javascript
/**
 * シナリオ: 検索して結果の1件目をクリック
 */

module.exports = async function(page) {
  // 検索ボックスに入力
  await page.getByPlaceholder('検索...').fill('Playwright');

  // 検索ボタンをクリック
  await page.getByRole('button', { name: '検索' }).click();
  await page.waitForLoadState('domcontentloaded');

  // 検索結果の1件目をクリック
  await page.locator('.search-result').first().click();
  await page.waitForLoadState('domcontentloaded');

  // DOM完全読み込みは get_har.js が自動で待機します
};
```

### サンプル3: フォームを入力して送信

```javascript
/**
 * シナリオ: お問い合わせフォームの入力
 */

module.exports = async function(page) {
  // 名前を入力
  await page.getByLabel('お名前').fill('山田太郎');

  // メールアドレスを入力
  await page.getByLabel('メールアドレス').fill('yamada@example.com');

  // プルダウンを選択
  await page.getByLabel('お問い合わせ種別').selectOption('質問');

  // テキストエリアに入力
  await page.getByLabel('お問い合わせ内容').fill('テスト送信です');

  // チェックボックスをオン
  await page.getByLabel('個人情報の取り扱いに同意する').check();

  // 送信ボタンをクリック
  await page.getByRole('button', { name: '送信' }).click();
  await page.waitForLoadState('domcontentloaded');

  // DOM完全読み込みは get_har.js が自動で待機します
};
```

### サンプル4: スクロールして要素をクリック

```javascript
/**
 * シナリオ: ページをスクロールして下部の要素をクリック
 */

module.exports = async function(page) {
  // ページの最下部までスクロール
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

  // 少し待つ
  await page.waitForTimeout(1000);

  // フッターのリンクをクリック
  await page.getByRole('link', { name: '利用規約' }).click();
  await page.waitForLoadState('domcontentloaded');

  // DOM完全読み込みは get_har.js が自動で待機します
};
```

---

## トラブルシューティング

### :x: 「要素が見つかりません」エラー

**原因**: ページの読み込みが完了する前に要素を探している

**解決策**: 待機を追加
```javascript
await page.waitForLoadState('networkidle');
// または
await page.waitForSelector('.your-element');
```

### :x: タイムアウトエラー

**原因**: ページの読み込みに時間がかかりすぎている

**解決策**: get_har.js の待機時間を延長
```javascript
await page.waitForTimeout(15000); // 15秒に延長
```

### :x: クリックできない要素がある

**原因**: 要素が他の要素に隠れている、またはまだ表示されていない

**解決策**: 要素が表示されるのを待つ
```javascript
await page.waitForSelector('button', { state: 'visible' });
await page.click('button');
```

---

## ヒント

1. **小さく始める**: 最初は1-2ステップの簡単なシナリオから始めましょう
2. **こまめに待機**: ページ遷移やボタンクリック後は必ず待機を入れる
3. **エラーログを確認**: エラーが出たらコンソールのメッセージを確認
4. **Inspectorを活用**: 要素の選択方法が分からない場合は Inspector で確認

---

## サポート

問題が発生した場合は、以下の情報を添えて相談してください:
- エラーメッセージ
- 実行しようとしているシナリオファイル
- どの操作で失敗したか