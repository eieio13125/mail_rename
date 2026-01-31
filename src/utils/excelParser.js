import * as XLSX from 'xlsx';

/**
 * Excelファイルを読み込み、カラム情報を取得
 * @param {File} file - Excelファイル
 * @returns {Promise<Object>} { columns: カラム名配列, data: データ配列 }
 */
export async function parseExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                // 最初のシートを取得
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                // JSONに変換
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                if (jsonData.length === 0) {
                    reject(new Error('Excelファイルが空です'));
                    return;
                }

                // 最初の行をカラム名として取得
                const columns = jsonData[0];
                const rows = jsonData.slice(1);

                resolve({
                    columns: columns,
                    data: rows,
                    rawData: jsonData,
                });
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = () => {
            reject(new Error('Excelファイルの読み込みに失敗しました'));
        };

        reader.readAsArrayBuffer(file);
    });
}

/**
 * 指定されたカラムから会社名リストを抽出
 * @param {Object} excelData - parseExcelFileの戻り値
 * @param {string} columnName - 会社名のカラム名
 * @returns {Array<string>} 会社名の配列
 */
export function extractCompanyList(excelData, columnName) {
    const { columns, data } = excelData;
    const columnIndex = columns.indexOf(columnName);

    if (columnIndex === -1) {
        throw new Error(`カラム "${columnName}" が見つかりません`);
    }

    const companyList = data
        .map(row => row[columnIndex])
        .filter(name => name && typeof name === 'string' && name.trim() !== '')
        .map(name => name.trim());

    return [...new Set(companyList)]; // 重複を除去
}

