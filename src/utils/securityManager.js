/**
 * セキュリティ管理モジュール
 * データの非保存・即時消去を保証
 */

/**
 * メモリ内のデータをクリア
 * @param {Object} data - クリアするデータオブジェクト
 */
export function clearMemory(data) {
    if (!data) return;

    // オブジェクトのすべてのプロパティを削除
    Object.keys(data).forEach(key => {
        if (data[key] instanceof ArrayBuffer || data[key] instanceof Uint8Array) {
            // バイナリデータの場合、ゼロで上書き
            if (data[key] instanceof Uint8Array) {
                data[key].fill(0);
            }
        }
        delete data[key];
    });
}

/**
 * 配列内のすべてのデータをクリア
 * @param {Array} array - クリアする配列
 */
export function clearArray(array) {
    if (!Array.isArray(array)) return;

    array.forEach(item => {
        if (typeof item === 'object') {
            clearMemory(item);
        }
    });

    array.length = 0;
}

/**
 * ストレージにデータが保存されていないことを確認
 * @returns {boolean} ストレージが空の場合true
 */
export function verifyNoStorageUsed() {
    // localStorage、sessionStorageをチェック
    const localStorageEmpty = localStorage.length === 0;
    const sessionStorageEmpty = sessionStorage.length === 0;

    return localStorageEmpty && sessionStorageEmpty;
}

/**
 * すべてのストレージをクリア（念のため）
 */
export function clearAllStorage() {
    localStorage.clear();
    sessionStorage.clear();
}

/**
 * ダウンロード後のクリーンアップ
 * @param {Object} appState - アプリケーションの状態オブジェクト
 */
export function cleanupAfterDownload(appState) {
    // PDFデータをクリア
    if (appState.pages) {
        clearArray(appState.pages);
    }

    // 生成されたPDFをクリア
    if (appState.generatedPDFs) {
        clearArray(appState.generatedPDFs);
    }

    // その他の一時データをクリア
    clearMemory(appState);

    // ストレージもクリア
    clearAllStorage();

    // ガベージコレクションを促す（ブラウザ依存）
    // ガベージコレクションを促す（ブラウザ依存 / テスト環境用）
    if (typeof global !== 'undefined' && typeof global.gc === 'function') {
        try {
            global.gc();
        } catch (e) {
            // 無視
        }
    }
}

/**
 * セキュリティ状態を取得
 * @returns {Object} セキュリティ状態
 */
export function getSecurityStatus() {
    return {
        storageClean: verifyNoStorageUsed(),
        timestamp: new Date().toISOString(),
    };
}
