/**
 * シナリオサンプル
 *
 * このファイルをコピーして新しいシナリオを作成してください。
 * Playwright Inspectorで生成されたコードを貼り付けます。
 */

module.exports = async function (page) {
    // ここに Playwright Inspector で生成されたコードを貼り付けてください

    // 例: ボタンをクリック
    // await page.getByRole('button', { name: '検索' }).click();

    // 例: テキストを入力
    // await page.getByLabel('キーワード').fill('Playwright');

    // 例: ページ遷移を待つ（基本的な待機）
    // await page.waitForLoadState('domcontentloaded');

    // 例: スクロール
    // await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // 重要: 最後のページ遷移後は domcontentloaded まで待機すればOK
    // DOM完全読み込み待機（document.readyState === 'complete'）は
    // get_har.js が自動で実施します
};