const {chromium} = require('playwright');
const fs = require('fs');
const path = require('path');

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
const TOTAL_ITERATIONS = tasksConfig.totalIterations || 1; // 総実行回数
const NETWORK_PRESET = networkConfig.network;

/**
 * ===========================================================================
 * 【シナリオ定義】 ページごとの操作を記述します
 * ===========================================================================
 */
async function runScenario(page, label, scenarioFile = null, isFirstTask = false) {
    console.log(`    [操作] シナリオ: ${label} を実行中...`);

    // 初期待機: ページ読み込み後の基本待機
    try {
        console.log('    [待機] SPA のデータ通信が完了するのを待機します...');
        await page.waitForLoadState('domcontentloaded');

        // 初回 Task は固定待機を追加（Browser 起動直後の不安定さを吸収）
        if (isFirstTask) {
            console.log('    [待機]初回タスクのため追加で 5 秒待機します...')
            await page.waitForTimeout(5000);
        }

        await page.waitForLoadState('networkidle', {timeout: 15000});
        console.log('     [待機] 待機条件を満たしました。')
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
            default:
                // 定義がない場合は共通待機のみで終了
                break;
        }
    }

    // 【共通の完了待機処理】
    console.log('    [完了待機] 最終ページのDOM読み込み完了を確認中...');
    try {

        await page.waitForLoadState('domcontentloaded', {timeout: 10000}); // DOMの読み込み完了を待つ
        await page.waitForFunction(() => document.readyState === 'complete', {timeout: 10000}); // 追加: readyState が 'complete' になるまで待つ
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
    console.log('=== HAR取得 自動化スクリプト開始 (Browsr継続版) ===');

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

    const folderName = `get_hars_${folderTImestamp}`;
    const outputDir = path.join(__dirname, 'measures', folderName);  // Project Root directory を取得して path を結合

    // Harファイルの格納先フォルダの作成
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, {recursive: true});
        console.log(`保存先フォルダを作成しました: ${outputDir}`)
    }

    console.log(`タスク数: ${TASKS.length} 件`);
    console.log(`総イテレーション数: ${TOTAL_ITERATIONS} 回`);
    console.log('注意: 実行前に開いているChromeをすべて閉じてください。\n');

    let browser = null;
    let page = null;
    let client = null;

    try {
        // Browser を１回だけ起動
        console.log('[ブラウザ]起動中...');
        browser = await chromium.launch({
            channel: 'chrome',
            headless: false,
        });

        // 【追加】初回 Dummy-task 実行（結果は保存しない）
        console.log('[ブラウザ] 初回安定化のためダミーアクセスを実行中...')
        try {
            const dummyContext = await browser.newContext({
                storageState: 'auth.json',
                viewport: null
            });
            const dummyPage = await dummyContext.newPage();

            // 最初の Task と同じ URL に Access して安定させる
            const firstTaskUrl = TASKS[0].url || 'about:blank';
            await dummyPage.goto(firstTaskUrl, {waitUntil: 'domcontentloaded'});

            await dummyPage.waitForTimeout(5000);  // SPA が落ち着くまで少し待つ
            await dummyContext.close();
            await new Promise((resolve) => setTimeout(resolve, 2000));

            console.log('[ブラウザ] ダミーアクセス完了。本番タスクを開始します。\n')
        } catch (err) {
            console.log(`[ブラウザ] ダミーアクセス中にエラー: ${err.message}`);
            console.log('[ブラウザ] エラーを無視して続行します。');
        }

        // 全 Iteration を loop
        for (let iteration = 0; iteration < TOTAL_ITERATIONS; iteration++) {
            console.log(`\n========== イテレーション ${iteration + 1} / ${TOTAL_ITERATIONS} ==========`);

            // 各 Task(Scenario) を loop
            for (let taskIndex = 0; taskIndex < TASKS.length; taskIndex++) {
                const task = TASKS[taskIndex];
                const harFilePath = path.join(outputDir, `temp_${task.label}_iter${iteration}_task${taskIndex}.har`);

                console.log(`\n--- タスク ${taskIndex + 1} / ${TASKS.length}: ${task.label} ---`);

                let context = null;

                try {
                    // Scenario ごとに新しい Context を作成（HAR記録 Reset）
                    console.log('    [コンテキスト] 新規作成（HAR 記録 リセット）...');
                    context = await browser.newContext({
                        recordHar: {path: harFilePath},
                        storageState: 'auth.json',
                        viewport: null
                    });

                    page = await context.newPage();

                    // CDP-Session 作成
                    client = await context.newCDPSession(page);
                    await client.send('Network.setCacheDisabled', {cacheDisabled: DISABLE_CACHE});
                    await client.send('Network.emulateNetworkConditions', NETWORK_PRESET);

                    // Access & Scenario 実行
                    console.log(`    [アクセス] ${task.url}`);
                    await page.goto(task.url);
                    const isFirstTask = (iteration === 0 && taskIndex === 0);
                    await runScenario(page, task.label, task.scenario, isFirstTask);

                    // Page-title を取得
                    let pageTitle = await page.title();
                    let safeTitle = pageTitle.replace(/[^a-zA-Z0-9\-_]/g, '').trim() || 'NoTitle';  // スペースも除去

                    // Context を閉じて HAR を保存
                    await context.close();
                    context = null;

                    // File を Rename
                    const now2 = new Date();
                    const filetimestamp = now2.getFullYear().toString() +
                        (now2.getMonth() + 1).toString().padStart(2, '0') +
                        now2.getDate().toString().padStart(2, '0') +
                        now2.getHours().toString().padStart(2, '0') +
                        now2.getMinutes().toString().padStart(2, '0') +
                        now2.getSeconds().toString().padStart(2, '0');

                    const baseName = `${task.label}_${safeTitle}_iter${iteration + 1}_${filetimestamp}`;
                    const safeBaseName = baseName.replace(/[\\/:*?"<>|]/g, '_');

                    let finalFilename = `${safeBaseName}.har`;
                    let finalPath = path.join(outputDir, finalFilename);

                    if (fs.existsSync(finalPath)) {
                        finalFilename = `${safeBaseName}_${taskIndex}.har`;
                        finalPath = path.join(outputDir, finalFilename);
                    }

                    fs.renameSync(harFilePath, finalPath);
                    console.log(`    -> 保存完了: ${path.basename(finalPath)}`);

                } catch (err) {
                    console.error(`    -> エラー: ${err.message}`);
                    await context?.close().catch(() => {
                    });
                }
            }
        }
    } catch
        (err) {
        console.error(`致命的エラー: ${err.message}`);
    } finally {
        // 最後に Browser を閉じる
        if (browser) {
            console.log(`\n[ブラウザ] 終了中...`);
            await browser.close();
        }
    }

    console.log(`\n=== すべてのタスクが完了しました（保存先: ${outputDir}） ===`);
}

main();