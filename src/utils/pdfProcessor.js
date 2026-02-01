/**
 * ファイルを処理してテキストを抽出
 */
import * as pdfjsLib from 'pdfjs-dist';

// Vite推奨: ワーカーをURLとしてインポート
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

/**
 * テキストから会社名を抽出
 * @param {string} text - 抽出元テキスト
 * @param {Array<string>} companyList - 会社名のリスト
 * @returns {string|null} 抽出された会社名
 */
export function extractCompanyName(text, companyList = []) {
    // 会社名リストとのマッチング
    for (const company of companyList) {
        if (text.includes(company)) {
            return company;
        }
    }

    // パターンマッチング（株式会社、有限会社など）
    const patterns = [
        /([^\s　]*(?:株式会社|有限会社|合同会社)[^\s　]*)/,
        /((?:株式会社|有限会社|合同会社)[^\s　]*)/
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            return match[0];
        }
    }

    return null;
}

/**
 * テキストから被保険者名を抽出
 * @param {string} text - 抽出元テキスト
 * @returns {string|null} 抽出された被保険者名
 */
export function extractPersonName(text) {
    // 氏名に関連するキーワードの後に続く名前を抽出
    const namePatterns = [
        /氏[\s　]*名[\s　]*[：:]*[\s　]*([^\s　\n]{2,5}[\s　]+[^\s　\n]{2,5})/,
        /被保険者[\s　]*[：:]*[\s　]*([^\s　\n]{2,5}[\s　]+[^\s　\n]{2,5})/,
        /名[\s　]*前[\s　]*[：:]*[\s　]*([^\s　\n]{2,5}[\s　]+[^\s　\n]{2,5})/,
    ];

    for (const pattern of namePatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
            return match[1].trim();
        }
    }

    return null;
}

/**
 * テキストから書類名を抽出（1行目の有効なテキストを取得）
 * @param {string} text - 抽出元テキスト
 * @returns {string} 抽出された書類名
 */
export function extractDocumentType(text) {
    if (!text) return '';

    // テキストを行に分割
    const lines = text.split(/\r\n|\n|\r/);

    // 最初の数行から、タイトルらしい行を探す
    for (const line of lines) {
        let trimmed = line.trim();
        // 空白を除いて2文字以上
        if (trimmed.length >= 2) {
            // 記号だらけ、数字だけの行はスキップ
            if (/^[\d\-\/\:\.\s@]+$/.test(trimmed)) continue;

            // 長すぎる場合はトリミング（30文字制限）
            if (trimmed.length > 30) {
                trimmed = trimmed.substring(0, 30);
            }
            return trimmed;
        }
    }

    return '';
}

/**
 * 封筒または送付状かどうかを判定
 * @param {string} text - 抽出元テキスト
 * @returns {boolean} 封筒または送付状の場合true
 */
export function isEnvelopeOrCoverLetter(text) {
    const keywords = ['送付状', '送り状', '封筒', '拝啓', '敬具', '記'];
    return keywords.some(keyword => text.includes(keyword));
}

/**
 * PDFを分割して新しいPDFを生成
 * @param {ArrayBuffer} pdfData - 元のPDFデータ
 * @param {Array<number>} pageNumbers - 抽出するページ番号（1始まり）
 * @returns {Promise<Uint8Array>} 生成されたPDFデータ
 */
import { PDFDocument } from 'pdf-lib';

export async function splitPDF(pdfData, pageNumbers) {
    const pdfDoc = await PDFDocument.load(pdfData);
    const newPdf = await PDFDocument.create();

    // ページ番号は1始まりなので、0始まりのインデックスに変換
    const indices = pageNumbers.map(n => n - 1);

    // 必要なページをコピー
    const copiedPages = await newPdf.copyPages(pdfDoc, indices);

    for (const page of copiedPages) {
        newPdf.addPage(page);
    }

    return await newPdf.save();
}

/**
 * OSで禁止されている文字をサニタイズ
 * @param {string} name - サニタイズ対象の文字列
 * @returns {string} サニタイズ後の文字列
 */
export function sanitizeFileName(name) {
    if (!name) return '';
    // Windowsの禁止文字: \ / : * ? " < > | および制御文字を取り除く
    return name.replace(/[\\/:*?"<>|]/g, '_').replace(/[\x00-\x1f\x7f]/g, '');
}

export function generateFileName(info) {
    // YYYYMMDD形式に変換
    const date = info.date || new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const company = sanitizeFileName(info.companyName || '会社名未設定');
    const type = sanitizeFileName(info.documentType || '書類');
    const person = info.personName ? `_${sanitizeFileName(info.personName)}` : '';

    return `${date}_${company}_${type}${person}.pdf`;
}

export async function processPDF(file, onProgress) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    const totalPages = pdf.numPages;
    const processedPages = [];

    for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i);

        // テキスト抽出
        const textContent = await page.getTextContent();
        const text = textContent.items.map(item => item.str).join('\n');

        // サムネイル生成
        const viewport = page.getViewport({ scale: 1.0 }); // プレビュー用スケール
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;

        const thumbnail = canvas.toDataURL();

        processedPages.push({
            pageNumber: i,
            text: text,
            items: textContent.items, // テキスト位置情報
            viewport: { width: viewport.width, height: viewport.height }, // ページサイズ情報
            thumbnail: thumbnail
        });

        if (onProgress) {
            onProgress(i, totalPages);
        }
    }

    return processedPages;
}
