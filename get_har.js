const {chromium} = require('playwright');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * ===========================================================================
 * 【設定の読み込み】 設定ファイルから読み込みます
 * ===========================================================================
 */

    // tasks.config.js の存在チェック
const tasksConfigPath = path.join(__dirname, 'config', 'tasks.config.js');
if (!fs.existsSync(tasksConfigPath)) {
    console.error('エラー: config/tasks.config.js が見つかりません。');
    console.log('\n【セットアップ方法】');
    console.log('config/tasks.config.js を作成してタスクを設定してください。');
    console.log('ファイル内にサンプルコードがコメントで記載されています。\n');
    process.exit(1);
}

// 設定ファイルを読み込み
const tasksConfig = require('./config/tasks.config.js');
const networkConfig = require('./config/network.config.js');

// 設定を取得
const DISABLE_CACHE = networkConfig.disableCache;
const TASKS = tasksConfig.tasks;
const NETWORK_PRESET = networkConfig.network;

/**
 * ===========================================================================
 * 【シナリオ定義】 ページごとの操作を記述します
 * ===========================================================================
 */
async function runScenario(page, label, scenarioFile = null) {
    console.log(`    [操作] シナリオ: ${label} を実行中...`);

    // 初期待機: ページ読み込み後の基本待機
    try {
        await page.waitForLoadState('domcontentloaded');

        console.log('    [待機] データ読み込みのため 15秒待機します...');
        await page.waitForTimeout(15000);

    } catch (e) {
        console.log('    [注意] 待機中にタイムアウトしましたが、処理を続行します。');
    }

    // 外部シナリオファイルが指定されている場合は読み込んで実行
    if (scenarioFile) {
        const scenarioPath = path.join(__dirname, 'scenarios', scenarioFile);
        if (fs.existsSync(scenarioPath)) {
            console.log(`    [シナリオ] ${scenarioFile} を実行します...`);
            try {
                const scenarioFunc = require(scenarioPath);
                await scenarioFunc(page);
                console.log(`    [シナリオ] ${scenarioFile} の実行が完了しました`);
                // return を削除して、共通の完了待機処理に進む
            } catch (err) {
                console.error(`    [エラー] シナリオファイルの実行に失敗: ${err.message}`);
                throw err;
            }
        } else {
            console.error(`    [エラー] シナリオファイルが見つかりません: ${scenarioPath}`);
            throw new Error(`シナリオファイルが見つかりません: ${scenarioFile}`);
        }
    } else {
        // ラベルごとの個別操作（後方互換性のため残す）
        switch (label) {
            case 'Test':
                // 例: 特定要素の確認など
                break;

            // case 'SearchFlow':
            //   // 例: スクロール操作
            //   // await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            //   break;

            // case 'FormSubmit':
            //   // 例: ボタンクリック
            //   // await page.getByText('次へ').click();
            //   // await page.waitForLoadState('networkidle');
            //   break;

            default:
                // 定義がない場合は共通待機のみで終了
                break;
        }
    }

    // ===================================================================
    // 【共通の完了待機処理】
    // すべてのシナリオ（単体・複数ページ共通）で実行される
    // 最後に表示されたページのDOMがすべて読み込み完了するまで待機
    // ===================================================================
    console.log('    [完了待機] 最終ページのDOM読み込み完了を確認中...');
    try {
        // DOMの読み込み完了を待つ
        await page.waitForLoadState('domcontentloaded', {timeout: 10000});

        // 追加: readyState が 'complete' になるまで待つ
        await page.waitForFunction(() => document.readyState === 'complete', {timeout: 10000});

        console.log('    [完了待機] DOM読み込み完了を確認しました');
    } catch (e) {
        console.log('    [完了待機] タイムアウトしましたが、処理を完了します。');
    }
}

/**
 * ===========================================================================
 * システム設定 (変更不要)
 * ===========================================================================
 */
async function main() {
    console.log('=== HAR取得 自動化スクリプト開始 (auth.json利用版) ===');

    // auth.json の存在チェック
    if (!fs.existsSync('auth.json')) {
        console.error('エラー: auth.json が見つかりません。先に node login.js を実行してください。');
        process.exit(1);
    }

    // 1. 保存先のフォルダの作成
    const now = new Date();
    const folderTImestamp = now.getFullYear().toString() +
        (now.getMonth() + 1).toString().padStart(2, '0') +
        now.getDate().toString().padStart(2, '0') +
        now.getHours().toString().padStart(2, '0') +
        now.getMinutes().toString().padStart(2, '0') +
        now.getSeconds().toString().padStart(2, '0');

    const folderName = `GetHars_${folderTImestamp}`;
    const outputDir = path.join(os.homedir(), 'Desktop', folderName);  // デスクトップのパスを取得して結合

    // Harファイルの格納先フォルダの作成
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, {recursive: true});
        console.log(`保存先フォルダを作成しました: ${outputDir}`)
    }

    console.log(`タスク数: ${TASKS.length} 件`);
    console.log('注意: 実行前に開いているChromeをすべて閉じてください。\n');

    for (const task of TASKS) {
        console.log(`\n■ タスク開始: [${task.label}] (${task.url})`);

        for (let i = 0; i < task.count; i++) {
            console.log(`  --- 実行 ${i + 1} / ${task.count} ---`);

            const tempFilename = path.join(outputDir, `temp_${task.label}_${i}.har`);
            let browser = null;
            let context = null;

            try {
                // 1. ブラウザ起動
                browser = await chromium.launch({
                    channel: 'chrome',
                    headless: false,
                });

                // 2. コンテキスト作成時に auth.json を読み込む
                context = await browser.newContext({
                    recordHar: {path: tempFilename},
                    storageState: 'auth.json', // ログイン状態を復元
                    viewport: null
                });

                const page = await context.newPage();

                // 3. CDPセッション作成
                const client = await context.newCDPSession(page);
                await client.send('Network.setCacheDisabled', {cacheDisabled: DISABLE_CACHE});  // キャッシュの設定
                await client.send('Network.emulateNetworkConditions', NETWORK_PRESET);  // ネットワーク帯域制限を設定

                // 4. アクセス & シナリオ
                await page.goto(task.url);
                await runScenario(page, task.label, task.scenario);

                // 5. 保存処理
                let pageTitle = await page.title();
                let safeTitle = pageTitle.replace(/[^a-zA-Z0-9 \-_]/g, '').trim() || 'NoTitle';

                await context.close();
                await browser.close();
                context = null;
                browser = null;

                // リネーム
                const now2 = new Date();
                const filetimestamp = now2.getFullYear().toString() +
                    (now2.getMonth() + 1).toString().padStart(2, '0') +
                    now2.getDate().toString().padStart(2, '0') +
                    now2.getHours().toString().padStart(2, '0') +
                    now2.getMinutes().toString().padStart(2, '0') +
                    now2.getSeconds().toString().padStart(2, '0');


                const baseName = `${task.label}_${safeTitle}_${filetimestamp}`;
                const safeBaseName = baseName.replace(/[\\/:*?"<>|]/g, '_');

                let finalFilename = `${safeBaseName}.har`;
                let finalPath = path.join(outputDir, finalFilename);

                if (fs.existsSync(finalPath)) {
                    finalFilename = `${safeBaseName}_${i}.har`;
                    finalPath = path.join(outputDir, finalFilename);
                }

                fs.renameSync(tempFilename, finalPath);
                console.log(`    -> 保存完了: ${path.basename(finalPath)}`);

            } catch (err) {
                console.error(`    -> エラー: ${err.message}`);
                if (context) await context.close();
                if (browser) await browser.close();
            }
        }
    }
    console.log(`\n=== すべてのタスクが完了しました（保存先: ${outputDir}） ===`);
}

main();