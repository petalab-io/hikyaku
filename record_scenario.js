const {chromium} = require('playwright');
const fs = require('fs');

/**
 * ===========================================================================
 * シナリオ記録ツール - Playwright Codegen
 * ===========================================================================
 *
 * 使い方:
 * 1. node record_scenario.js を実行
 * 2. 開いたブラウザで実際に操作を行う
 * 3. "Playwright Inspector" ウィンドウに操作コードが自動生成される
 * 4. 生成されたコードをコピーして scenarios/YOUR_SCENARIO.js に保存
 * 5. get_har.js でそのシナリオファイルを読み込んで使用
 *
 * ===========================================================================
 */

async function main() {
    console.log('=== Playwright シナリオ記録ツール ===\n');
    console.log('【手順】');
    console.log('1. Chromeブラウザが開きます');
    console.log('2. "Playwright Inspector"ウィンドウも同時に開きます');
    console.log('3. ブラウザで実際の操作を行ってください');
    console.log('4. Inspectorに操作コードが自動生成されます');
    console.log('5. コードをコピーして scenarios/ フォルダに保存してください\n');

    // auth.json の存在チェック
    if (!fs.existsSync('auth.json')) {
        console.error('警告: auth.json が見つかりません。');
        console.log('ログイン済みの状態で記録したい場合は、先に node login.js を実行してください。\n');
    }

    // scenarios フォルダの作成
    if (!fs.existsSync('scenarios')) {
        fs.mkdirSync('scenarios');
        console.log('scenarios/ フォルダを作成しました。');
    }

    // サンプルシナリオファイルを作成
    const samplePath = 'scenarios/sample_scenario.js';
    if (!fs.existsSync(samplePath)) {
        const sampleContent = `/**
  * シナリオサンプル
  *
  * このファイルをコピーして新しいシナリオを作成してください。
  * Playwright Inspectorで生成されたコードを貼り付けます。
  */
 
 module.exports = async function(page) {
   // ここに Playwright Inspector で生成されたコードを貼り付けてください
 
   // 例: ボタンをクリック
   // await page.getByRole('button', { name: '検索' }).click();
 
   // 例: テキストを入力
   // await page.getByLabel('キーワード').fill('Playwright');
 
   // 例: ページ遷移を待つ
   // await page.waitForLoadState('networkidle');
   // await page.waitForLoadState('domcontentloaded');
 
   // 例: スクロール
   // await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
 
   console.log('    [シナリオ] サンプルシナリオを実行しました');
 };
 `;
        fs.writeFileSync(samplePath, sampleContent);
        console.log(`サンプルファイルを作成しました: ${samplePath}\n`);
    }

    console.log('記録を開始します...\n');
    console.log('===================================================');
    console.log('記録を終了するには、ブラウザを閉じてください。');
    console.log('===================================================\n');

    // ブラウザを起動してコード生成モードで開く
    const browser = await chromium.launch({
        channel: 'chrome',
        headless: false,
    });

    // auth.json があればログイン状態を復元
    const contextOptions = {
        viewport: null,
    };

    if (fs.existsSync('auth.json')) {
        contextOptions.storageState = 'auth.json';
        console.log('auth.json を読み込みました。ログイン状態で記録します。\n');
    }

    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();

    // 開始ページを開く（任意）
    await page.goto('about:blank');

    console.log('【Playwright Inspectorの使い方】');
    console.log('- "Record" ボタン: 記録の開始/停止');
    console.log('- "Explore" ボタン: 要素の選択');
    console.log('- 右側のコードエリア: 生成されたコードをコピー\n');

    // コンソールにコード生成の説明を表示
    await page.pause(); // Playwright Inspectorを開く

    await browser.close();

    console.log('\n=== 記録を終了しました ===');
    console.log('\n【次のステップ】');
    console.log('1. Inspectorからコードをコピー');
    console.log('2. scenarios/YOUR_SCENARIO.js を作成（sample_scenario.jsを参考に）');
    console.log('3. コピーしたコードを貼り付け');
    console.log('4. get_har.js でシナリオを読み込んで実行');
}

main().catch(err => {
    console.error('エラーが発生しました:', err);
    process.exit(1);
});