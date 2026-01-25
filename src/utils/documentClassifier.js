import { extractCompanyName, extractPersonName, extractDocumentType, isEnvelopeOrCoverLetter } from './pdfProcessor';

/**
 * ページの内容から分類を提案
 */
export function suggestClassification(page, previousClassification, companyList) {
    const text = page.text;

    // OCR結果から情報を抽出
    const companyName = extractCompanyName(text, companyList);
    const personName = extractPersonName(text);
    const documentType = extractDocumentType(text);

    // 不要データフラグ: 初期値は常にfalse（ユーザー判断に委ねる）
    const isExcluded = false;

    // 書類名をそのまま小分類として提案
    const minorCategory = documentType || '書類';

    return {
        minorCategory,
        isExcluded,
        documentType, // 元の検出結果も保持
    };
}

/**
 * ページ群から情報を抽出・継承（初期値生成用）
 */
export function extractAndInheritInfo(pages, currentIndex, companyList) {
    const page = pages[currentIndex];

    // デフォルトで当日の日付を設定 (YYMMDD形式)
    const now = new Date();
    const yy = String(now.getFullYear()).slice(2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const today = `${yy}${mm}${dd}`;

    const text = page.text;

    // 現在のページから抽出
    let companyName = extractCompanyName(text, companyList);
    const personName = extractPersonName(text);
    const documentType = extractDocumentType(text);
    const inherited = { company: false, person: false };

    // 封筒・送付状の場合
    // 自動判定はするが、抽出情報はセットしておく（後続のリネーム用）
    if (isEnvelopeOrCoverLetter(text)) {
        return {
            date: today,
            companyName: companyName || '',
            personName: '',
            documentType: documentType || '封筒',
            inherited: { company: false, person: false }
        };
    }

    // 見つからない場合、直近の有効なページから引き継ぐ
    // 新しい仕様では「封筒切替」まで遡る
    if (!companyName) {
        for (let i = currentIndex - 1; i >= 0; i--) {
            // 封筒切替のページが見つかったら、そこから取得して終了
            if (pages[i].classification?.mode === 'envelope') {
                if (pages[i].extractedInfo?.companyName) {
                    companyName = pages[i].extractedInfo.companyName;
                    inherited.company = true;
                }
                break;
            }
            // それ以外のページでも会社名があれば取得
            if (pages[i].extractedInfo?.companyName) {
                companyName = pages[i].extractedInfo.companyName;
                inherited.company = true;
                break;
            }
        }
    }

    return {
        date: today,
        companyName: companyName || '',
        personName: personName || '',
        documentType: documentType,
        inherited
    };
}

/**
 * 新しい分類ロジックに基づいてページをグループ化
 * @param {Array<Object>} pages - 分類済みページ
 * @returns {Array<Object>} グループ化された書類情報
 */
export function groupPagesByClassification(pages) {
    const groups = [];
    let currentGroup = null;
    let currentEnvelope = null; // 封筒切替の範囲

    for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const classification = page.classification;

        // 封筒切替の場合、新しい封筒範囲を開始（除外データであっても情報は更新）
        if (classification.mode === 'envelope') {
            currentEnvelope = {
                date: classification.date || '[日付]',
                companyName: classification.companyName || '[会社名]',
            };

            // 前のグループを保存
            if (currentGroup) {
                // 有効なページ
                const effectivePages = currentGroup.pages.filter(p => !p.classification.isExcluded);
                if (effectivePages.length > 0) {
                    groups.push({ ...currentGroup, pages: effectivePages, isExcludedData: false });
                }

                // 除外されたページ
                const excludedPages = currentGroup.pages.filter(p => p.classification.isExcluded);
                if (excludedPages.length > 0) {
                    groups.push({ ...currentGroup, pages: excludedPages, isExcludedData: true });
                }
            }

            currentGroup = {
                envelopeInfo: currentEnvelope,
                documentType: classification.documentType || '[書類名]',
                personName: classification.personName || '',
                pages: [page],
            };
        }
        // 書類切替の場合
        else if (classification.mode === 'document') {
            if (currentGroup) {
                const effectivePages = currentGroup.pages.filter(p => !p.classification.isExcluded);
                if (effectivePages.length > 0) {
                    groups.push({ ...currentGroup, pages: effectivePages, isExcludedData: false });
                }
                const excludedPages = currentGroup.pages.filter(p => p.classification.isExcluded);
                if (excludedPages.length > 0) {
                    groups.push({ ...currentGroup, pages: excludedPages, isExcludedData: true });
                }
            }

            currentGroup = {
                envelopeInfo: currentEnvelope || { date: '[日付]', companyName: '[会社名]' },
                documentType: classification.documentType || '[書類名]',
                personName: classification.personName || '',
                pages: [page],
            };
        }
        // 同一書類の場合
        else if (classification.mode === 'same') {
            if (!currentGroup) {
                currentGroup = {
                    envelopeInfo: currentEnvelope || { date: '[日付]', companyName: '[会社名]' },
                    documentType: classification.documentType || '[書類名]',
                    personName: classification.personName || '',
                    pages: [page],
                };
            } else {
                currentGroup.pages.push(page);
            }
        }
    }

    // 最後のグループを追加
    if (currentGroup) {
        const effectivePages = currentGroup.pages.filter(p => !p.classification.isExcluded);
        if (effectivePages.length > 0) {
            groups.push({ ...currentGroup, pages: effectivePages, isExcludedData: false });
        }
        const excludedPages = currentGroup.pages.filter(p => p.classification.isExcluded);
        if (excludedPages.length > 0) {
            groups.push({ ...currentGroup, pages: excludedPages, isExcludedData: true });
        }
    }

    return groups;
}

/**
 * グループ情報からファイル名を生成
 * @param {Object} group - グループ情報
 * @returns {string} 生成されたファイル名
 */
export function generateFileNameFromGroup(group) {
    if (group.isExcludedData) {
        return '除外データ.pdf';
    }

    const { date, companyName } = group.envelopeInfo;
    const { documentType, personName } = group;

    // 被保険者名がない場合
    if (!personName || personName === '（なし）') {
        return `${date}_${companyName}_${documentType}.pdf`;
    }

    // 通常の場合
    return `${date}_${companyName}_${documentType}_${personName}様.pdf`;
}
