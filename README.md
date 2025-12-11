# HAR 自動取得ツール

Playwright を使用して、複数ページに渡る操作を含むシナリオの HAR ファイルを自動取得するツールです。

## セットアップ

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. タスク設定ファイルの作成

`config/tasks.config.js` ファイルが存在しない場合は作成してください。
ファイル内にサンプルコードがコメントで記載されています。

```javascript
// config/tasks.config.js
module.exports = {
  tasks: [
    // サンプルを参考に、実際のタスクを記述してください
    {
      label: 'MyTask',                    // タスク名
      url: 'https://example.com',         // 開始URL
      count: 3,                           // 実行回数
      scenario: 'my_scenario.js'          // シナリオファイル（オプション）
    },
  ],
};
```

**重要**: `config/tasks.config.js` は `.gitignore` に登録されているため、実際のURLを記載してもgit管理されません。

### 3. ネットワーク設定の調整（オプション）

必要に応じて `config/network.config.js` を編集してキャッシュやネットワーク帯域制限を変更できます。
デフォルト設定で問題ない場合は編集不要です。

### 4. ログイン状態の保存（必要な場合）

ログインが必要なサイトの場合：

```bash
node login.js
```

ブラウザが開くので、手動でログインしてください。ログイン状態が `auth.json` に保存されます。

---

## 使い方

### シンプルな使い方（シナリオなし）

指定したURLにアクセスして待機するだけの場合：

```javascript
// tasks.config.js
tasks: [
  {
    label: 'SimpleTest',
    url: 'https://example.com',
    count: 3,
    // scenarioを指定しない
  },
]
```

```bash
node get_har.js
```

### シナリオを使った使い方（複数ページ操作）

#### ステップ1: シナリオを記録

```bash
node record_scenario.js
```

- Chromeブラウザと Playwright Inspector が開きます
- ブラウザで実際に操作を行うと、コードが自動生成されます
- Inspector からコードをコピーします

#### ステップ2: シナリオファイルを作成

`scenarios/my_scenario.js` を作成：

```javascript
module.exports = async function(page) {
  // Inspector からコピーしたコードを貼り付け
  await page.getByRole('button', { name: '検索' }).click();
  await page.waitForLoadState('domcontentloaded');

  await page.getByRole('link', { name: '次のページ' }).click();
  await page.waitForLoadState('domcontentloaded');
};
```

#### ステップ3: タスク設定でシナリオを指定

```javascript
// tasks.config.js
tasks: [
  {
    label: 'SearchFlow',
    url: 'https://example.com',
    count: 3,
    scenario: 'my_scenario.js'  // :左向き指差し: シナリオを指定
  },
]
```

#### ステップ4: 実行

```bash
node get_har.js
```

---

## ファイル構成

```
har-automation/
├── get_har.js              # メインスクリプト
├── login.js                # ログイン状態保存用
├── record_scenario.js      # シナリオ記録用
│
├── config/                 # 設定ファイル専用
│   ├── tasks.config.js         # タスク設定（gitignore対象、サンプル内蔵）
│   └── network.config.js       # ネットワーク設定（git管理）
│
├── scenarios/              # シナリオファイル格納フォルダ
│   ├── sample_scenario.js  # サンプルシナリオ
│   └── your_scenario.js    # 独自のシナリオ
│
├── auth.json               # ログイン状態（gitignore対象）
├── SCENARIO_GUIDE.md       # シナリオ作成ガイド
└── README.md               # このファイル
```

---

## 詳細ガイド

- **シナリオ作成方法**: [SCENARIO_GUIDE.md](SCENARIO_GUIDE.md) を参照
- **トラブルシューティング**: [SCENARIO_GUIDE.md](SCENARIO_GUIDE.md) のトラブルシューティングセクションを参照

---

## セキュリティ

以下のファイルは `.gitignore` に登録されており、git管理されません：

- `config/tasks.config.js` - 実際のURL設定
- `auth.json` - ログイン状態
- `*.har` - 取得したHARファイル

**重要**: これらのファイルには機密情報が含まれる可能性があるため、共有しないでください。

---

## 設定項目

### キャッシュ設定

```javascript
disableCache: true  // true: キャッシュ無効, false: キャッシュ有効
```

### ネットワーク設定

```javascript
network: {
  offline: false,                              // オフラインモード
  downloadThroughput: (10 * 1024 * 1024) / 8,  // ダウンロード速度 (Bps)
  uploadThroughput: (10 * 1024 * 1024) / 8,    // アップロード速度 (Bps)
  latency: 10,                                 // レイテンシ (ms)
}
```

### タスク設定

| プロパティ | 説明 | 必須 |
|----------|------|------|
| `label` | タスク名（ファイル名に使用） | :チェックマーク_緑: |
| `url` | 開始URL | :チェックマーク_緑: |
| `count` | 実行回数 | :チェックマーク_緑: |
| `scenario` | シナリオファイル名 | :x: |

---

## Tips

1. **非エンジニア向け**: `config/tasks.config.js` だけ編集すれば使えます
2. **複数環境**: 環境ごとに異なる `config/tasks.config.js` を用意できます
3. **CI/CD**: 環境変数から設定を読み込むことも可能です

---

## ライセンス

このプロジェクトは自由に使用できます。