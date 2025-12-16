// login.js
const {chromium} = require('playwright');
const fs = require('fs');

async function main() {
    // 環境変数から URL を取得(Default値も設定可能)
    const loginUrl = process.env.LOGIN_URL || 'https://sample.app';

    // 1. Profile なしの Clean な Browse を起動
    const browser = await chromium.launch({
        channel: 'chrome',
        headless: false,
    });

    // 2. Context を作成
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('--- ログイン情報 ---');
    console.log(`対象URL: ${loginUrl}`);
    console.log('1. 開いたブラウザで対象サイトにログインしてください。');
    console.log('2. ログインが完了し、TOP ページ等が表示されたら、');
    console.log('   このターミナルに戻ってきて Enter キーを押してください。')
    console.log('-------------------');

    // 対象 Site へ Access
    await page.goto(loginUrl);

    // 3. User の Enter キー入力を待つ
    await new Promise(resolve => {
        process.stdin.once('data', resolve);
    });

    // 4. Login 状態（Cookie等）を File に保存
    await context.storageState({path: 'auth.json'});
    console.log('ログイン情報を auth.json に保存しました！');

    await browser.close();
    process.exit(0);
}

main();