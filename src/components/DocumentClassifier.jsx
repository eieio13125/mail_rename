import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Check, Edit2 } from 'lucide-react';

export default function DocumentClassifier({
    pages,
    onClassificationComplete,
    companyList
}) {
    const [currentPageIndex, setCurrentPageIndex] = useState(0);
    const [classifications, setClassifications] = useState([]);
    const [editingField, setEditingField] = useState(null);

    // 初期化: 各ページに提案された分類を設定
    useEffect(() => {
        if (pages.length > 0 && classifications.length === 0) {
            const initialClassifications = pages.map((page, index) => ({
                // デフォルトは「同一書類」、最初のページは「封筒切替」
                mode: index === 0 ? 'envelope' : 'same',
                isExcluded: page.suggestedClassification?.isExcluded || false,
                confirmed: false,
                // 抽出情報（編集可能）
                date: '',
                companyName: page.extractedInfo?.companyName || '',
                documentType: page.extractedInfo?.documentType || '',
                personName: page.extractedInfo?.personName || '',
            }));
            setClassifications(initialClassifications);
        }
    }, [pages]);

    const currentPage = pages[currentPageIndex];
    const currentClassification = classifications[currentPageIndex] || {};

    // 分類を更新
    const updateClassification = (field, value) => {
        const newClassifications = [...classifications];
        newClassifications[currentPageIndex] = {
            ...newClassifications[currentPageIndex],
            [field]: value,
        };
        setClassifications(newClassifications);
    };

    // 抽出情報を更新
    const updateExtractedInfo = (field, value) => {
        updateClassification(field, value);
    };

    // 次のページへ
    const goToNextPage = useCallback(() => {
        if (currentPageIndex < pages.length - 1) {
            const newClassifications = [...classifications];
            newClassifications[currentPageIndex].confirmed = true;
            setClassifications(newClassifications);
            setCurrentPageIndex(currentPageIndex + 1);
        }
    }, [currentPageIndex, pages.length, classifications]);

    // 前のページへ
    const goToPreviousPage = useCallback(() => {
        if (currentPageIndex > 0) {
            setCurrentPageIndex(currentPageIndex - 1);
        }
    }, [currentPageIndex]);

    // キーボードショートカット
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (editingField) return; // 編集中はショートカット無効

            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                goToNextPage();
            }

            if (e.key === 'Enter' && e.shiftKey) {
                e.preventDefault();
                goToPreviousPage();
            }

            if (e.key === ' ' && e.target.tagName !== 'INPUT') {
                e.preventDefault();
                updateClassification('isExcluded', !currentClassification.isExcluded);
            }

            // 1-3: 分類モード切り替え
            if (e.key === '1') updateClassification('mode', 'envelope');
            if (e.key === '2') updateClassification('mode', 'document');
            if (e.key === '3') updateClassification('mode', 'same');
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentPageIndex, currentClassification, goToNextPage, goToPreviousPage, editingField]);

    // 確定して次へ
    const handleComplete = () => {
        const newClassifications = [...classifications];
        newClassifications[currentPageIndex].confirmed = true;

        const classifiedPages = pages.map((page, index) => ({
            ...page,
            classification: newClassifications[index],
        }));

        onClassificationComplete(classifiedPages);
    };

    // 直近の有効な値を検索（継承用）
    const getInheritedValue = (field, currentIndex) => {
        // 現在のページが有効な定義を持つモードなら、その値を使用
        if (field === 'date' || field === 'companyName') {
            if (classifications[currentIndex]?.mode === 'envelope') {
                return classifications[currentIndex][field];
            }
        } else {
            // documentType, personName
            const mode = classifications[currentIndex]?.mode;
            if (mode === 'envelope' || mode === 'document') {
                return classifications[currentIndex][field];
            }
        }

        // 遡って検索
        for (let i = currentIndex - 1; i >= 0; i--) {
            const mode = classifications[i]?.mode;
            if (field === 'date' || field === 'companyName') {
                if (mode === 'envelope') return classifications[i][field];
            } else {
                if (mode === 'envelope' || mode === 'document') return classifications[i][field];
            }
        }
        return '';
    };

    // 日付フォーマッター (YYYY-MM-DD -> YYMMDD)
    const formatDateToYYMMDD = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;

        const yy = String(date.getFullYear()).slice(2);
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return `${yy}${mm}${dd}`;
    };

    // YYMMDD -> YYYY-MM-DD (入力フォーム用)
    const parseYYMMDDToDate = (yymmdd) => {
        if (!yymmdd || yymmdd.length !== 6) return '';
        const yy = yymmdd.slice(0, 2);
        const mm = yymmdd.slice(2, 4);
        const dd = yymmdd.slice(4, 6);
        return `20${yy}-${mm}-${dd}`;
    };

    if (!currentPage) {
        return <div className="text-white text-center p-8">読み込み中...</div>;
    }

    const progress = ((currentPageIndex + 1) / pages.length) * 100;

    // 入力可否判定
    const isDateCompanyEditable = currentClassification.mode === 'envelope';
    const isDocPersonEditable = currentClassification.mode === 'envelope' || currentClassification.mode === 'document';

    // 表示用の値（編集不可の場合は継承値を表示）
    const displayValues = {
        date: isDateCompanyEditable ? currentClassification.date : getInheritedValue('date', currentPageIndex),
        companyName: isDateCompanyEditable ? currentClassification.companyName : getInheritedValue('companyName', currentPageIndex),
        documentType: isDocPersonEditable ? currentClassification.documentType : getInheritedValue('documentType', currentPageIndex),
        personName: isDocPersonEditable ? currentClassification.personName : getInheritedValue('personName', currentPageIndex),
    };

    return (
        <div className="fixed inset-0 bg-gradient-to-br from-slate-900 to-slate-800 overflow-hidden">
            <div className="h-full flex flex-col">
                {/* ヘッダー */}
                <div className="glass-card m-4 p-4 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-white">書類分類</h2>
                        <div className="flex items-center gap-4">
                            <div className="text-white/80 text-sm">
                                {currentPageIndex + 1} / {pages.length} ページ
                            </div>
                            <div className="w-48 bg-white/10 rounded-full h-2">
                                <div
                                    className="h-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all duration-300 rounded-full"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* メインコンテンツ: 横並び */}
                <div className="flex-1 flex gap-4 px-4 pb-4 min-h-0">
                    {/* 左側: プレビュー（60%） */}
                    <div className="flex-[3] glass-card p-6 flex flex-col min-h-0">
                        <h3 className="text-lg font-semibold text-white mb-4">ページ {currentPage.pageNumber}</h3>

                        <div className="flex-1 bg-white/5 rounded-lg p-4 border border-white/20 overflow-auto">
                            <img
                                src={currentPage.thumbnail}
                                alt={`ページ ${currentPage.pageNumber}`}
                                className="w-full h-auto rounded shadow-lg"
                            />
                        </div>

                        {/* 抽出情報（編集可能） */}
                        <div className="mt-4 space-y-2 text-sm flex-shrink-0">
                            <h4 className="text-white/80 font-medium">抽出情報（候補）:</h4>
                            <p className="text-xs text-white/50 mb-2">※ダブルクリックで編集できます</p>

                            <div className="bg-white/5 rounded p-3 space-y-2">
                                {/* 日付 */}
                                <div className="flex items-center gap-2">
                                    <span className="text-white/50 w-24">日付 (YYMMDD):</span>
                                    {editingField === 'date' && isDateCompanyEditable ? (
                                        <div className="flex-1 flex gap-2">
                                            <input
                                                type="date"
                                                defaultValue={parseYYMMDDToDate(currentClassification.date)}
                                                onChange={(e) => updateExtractedInfo('date', formatDateToYYMMDD(e.target.value))}
                                                onBlur={() => setEditingField(null)}
                                                onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                                                className="flex-1 px-2 py-1 bg-white/10 border border-white/30 rounded text-white text-sm"
                                                autoFocus
                                            />
                                        </div>
                                    ) : (
                                        <div
                                            className={`flex-1 flex items-center justify-between group cursor-pointer p-1 rounded hover:bg-white/5 ${!isDateCompanyEditable ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            onDoubleClick={() => isDateCompanyEditable && setEditingField('date')}
                                        >
                                            <span className="text-white/70 font-mono">{displayValues.date || '[日付]'}</span>
                                            {isDateCompanyEditable && (
                                                <Edit2
                                                    className="w-3 h-3 text-primary-400 opacity-0 group-hover:opacity-100"
                                                    onClick={() => setEditingField('date')}
                                                />
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* 会社名 */}
                                <div className="flex items-center gap-2">
                                    <span className="text-white/50 w-24">会社名:</span>
                                    {editingField === 'companyName' && isDateCompanyEditable ? (
                                        <input
                                            type="text"
                                            value={currentClassification.companyName || ''}
                                            onChange={(e) => updateExtractedInfo('companyName', e.target.value)}
                                            onBlur={() => setEditingField(null)}
                                            onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                                            className="flex-1 px-2 py-1 bg-white/10 border border-white/30 rounded text-white text-sm"
                                            autoFocus
                                        />
                                    ) : (
                                        <div
                                            className={`flex-1 flex items-center justify-between group cursor-pointer p-1 rounded hover:bg-white/5 ${!isDateCompanyEditable ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            onDoubleClick={() => isDateCompanyEditable && setEditingField('companyName')}
                                        >
                                            <span className="text-white/70">{displayValues.companyName || '[会社名]'}</span>
                                            {isDateCompanyEditable && (
                                                <Edit2
                                                    className="w-3 h-3 text-primary-400 opacity-0 group-hover:opacity-100"
                                                    onClick={() => setEditingField('companyName')}
                                                />
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* 書類名 */}
                                <div className="flex items-center gap-2">
                                    <span className="text-white/50 w-24">書類名:</span>
                                    {editingField === 'documentType' && isDocPersonEditable ? (
                                        <input
                                            type="text"
                                            value={currentClassification.documentType || ''}
                                            onChange={(e) => updateExtractedInfo('documentType', e.target.value)}
                                            onBlur={() => setEditingField(null)}
                                            onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                                            className="flex-1 px-2 py-1 bg-white/10 border border-white/30 rounded text-white text-sm"
                                            autoFocus
                                        />
                                    ) : (
                                        <div
                                            className={`flex-1 flex items-center justify-between group cursor-pointer p-1 rounded hover:bg-white/5 ${!isDocPersonEditable ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            onDoubleClick={() => isDocPersonEditable && setEditingField('documentType')}
                                        >
                                            <span className="text-white/70">{displayValues.documentType || '[書類名]'}</span>
                                            {isDocPersonEditable && (
                                                <Edit2
                                                    className="w-3 h-3 text-primary-400 opacity-0 group-hover:opacity-100"
                                                    onClick={() => setEditingField('documentType')}
                                                />
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* 被保険者名 */}
                                <div className="flex items-center gap-2">
                                    <span className="text-white/50 w-24">被保険者名:</span>
                                    {editingField === 'personName' && isDocPersonEditable ? (
                                        <input
                                            type="text"
                                            value={currentClassification.personName || ''}
                                            onChange={(e) => updateExtractedInfo('personName', e.target.value)}
                                            onBlur={() => setEditingField(null)}
                                            onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                                            className="flex-1 px-2 py-1 bg-white/10 border border-white/30 rounded text-white text-sm"
                                            autoFocus
                                        />
                                    ) : (
                                        <div
                                            className={`flex-1 flex items-center justify-between group cursor-pointer p-1 rounded hover:bg-white/5 ${!isDocPersonEditable ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            onDoubleClick={() => isDocPersonEditable && setEditingField('personName')}
                                        >
                                            <span className="text-white/70">{displayValues.personName || '（なし）'}</span>
                                            {isDocPersonEditable && (
                                                <Edit2
                                                    className="w-3 h-3 text-primary-400 opacity-0 group-hover:opacity-100"
                                                    onClick={() => setEditingField('personName')}
                                                />
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 右側: 分類設定（40%） */}
                    <div className="flex-[2] glass-card p-6 flex flex-col min-h-0">
                        <h3 className="text-lg font-semibold text-white mb-4">分類設定</h3>

                        <div className="flex-1 space-y-6 overflow-auto">
                            {/* 分類モード選択 */}
                            <div className="space-y-3">
                                <label className="block text-white/80 text-sm font-medium">
                                    分類モード
                                </label>

                                <button
                                    onClick={() => updateClassification('mode', 'envelope')}
                                    className={`w-full px-4 py-3 rounded-lg font-semibold transition-all text-left ${currentClassification.mode === 'envelope'
                                            ? 'bg-primary-500 text-white'
                                            : 'bg-white/10 text-white/70 hover:bg-white/20'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span>① 封筒切替</span>
                                        <kbd className="px-2 py-1 bg-black/20 rounded text-xs">1</kbd>
                                    </div>
                                    <p className="text-xs mt-1 opacity-70">
                                        参照範囲の区切り（日付・会社名を共有）
                                    </p>
                                </button>

                                <button
                                    onClick={() => updateClassification('mode', 'document')}
                                    className={`w-full px-4 py-3 rounded-lg font-semibold transition-all text-left ${currentClassification.mode === 'document'
                                            ? 'bg-accent-500 text-white'
                                            : 'bg-white/10 text-white/70 hover:bg-white/20'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span>② 書類切替</span>
                                        <kbd className="px-2 py-1 bg-black/20 rounded text-xs">2</kbd>
                                    </div>
                                    <p className="text-xs mt-1 opacity-70">
                                        分割タイミング（全項目を共有）
                                    </p>
                                </button>

                                <button
                                    onClick={() => updateClassification('mode', 'same')}
                                    className={`w-full px-4 py-3 rounded-lg font-semibold transition-all text-left ${currentClassification.mode === 'same'
                                            ? 'bg-green-500 text-white'
                                            : 'bg-white/10 text-white/70 hover:bg-white/20'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span>③ 同一書類</span>
                                        <kbd className="px-2 py-1 bg-black/20 rounded text-xs">3</kbd>
                                    </div>
                                    <p className="text-xs mt-1 opacity-70">
                                        同じPDFに結合
                                    </p>
                                </button>
                            </div>

                            {/* 不要データフラグ */}
                            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                                <input
                                    type="checkbox"
                                    id="isExcluded"
                                    checked={currentClassification.isExcluded || false}
                                    onChange={(e) => updateClassification('isExcluded', e.target.checked)}
                                    className="w-5 h-5 rounded border-white/30 bg-white/10 text-primary-500 focus:ring-2 focus:ring-primary-500"
                                />
                                <label htmlFor="isExcluded" className="text-white/80 cursor-pointer flex-1">
                                    不要データ（リネーム情報のみ使用）
                                </label>
                            </div>

                            {currentClassification.isExcluded && (
                                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-amber-400 text-sm">
                                    このページは「除外データ.pdf」に移動します（情報は有効）
                                </div>
                            )}

                            {/* キーボードショートカットヘルプ */}
                            <div className="bg-white/5 rounded-lg p-4 text-xs text-white/60 space-y-1">
                                <p className="font-medium text-white/80 mb-2">ショートカット:</p>
                                <p><kbd className="px-2 py-1 bg-white/10 rounded">1-3</kbd> 分類モード</p>
                                <p><kbd className="px-2 py-1 bg-white/10 rounded">Enter</kbd> 次へ</p>
                                <p><kbd className="px-2 py-1 bg-white/10 rounded">Shift+Enter</kbd> 前へ</p>
                                <p><kbd className="px-2 py-1 bg-white/10 rounded">Space</kbd> 不要フラグ</p>
                            </div>
                        </div>

                        {/* ナビゲーションボタン */}
                        <div className="mt-4 flex items-center justify-between gap-4 flex-shrink-0">
                            <button
                                onClick={goToPreviousPage}
                                disabled={currentPageIndex === 0}
                                className="btn-secondary flex items-center gap-2 flex-1"
                            >
                                <ChevronLeft className="w-5 h-5" />
                                前へ
                            </button>

                            {currentPageIndex < pages.length - 1 ? (
                                <button
                                    onClick={goToNextPage}
                                    className="btn-primary flex items-center gap-2 flex-1"
                                >
                                    次へ
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            ) : (
                                <button
                                    onClick={handleComplete}
                                    className="btn-primary flex items-center gap-2 flex-1 bg-gradient-to-r from-green-500 to-green-600"
                                >
                                    <Check className="w-5 h-5" />
                                    PDF生成
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
