import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ChevronLeft, ChevronRight, Check, Edit2, Plus, AlertTriangle, ZoomIn, ZoomOut } from 'lucide-react';
import Fuse from 'fuse.js';
import defaultDocumentNames from '../data/documentNames.json';

const STORAGE_KEY_DOCS = 'mail_rename_custom_docs';

export default function DocumentClassifier({
    pages,
    onClassificationComplete,
    companyList,
    uploadedDocumentNames = []
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
                date: page.extractedInfo?.date || '',
                companyName: page.extractedInfo?.companyName || '',
                documentType: page.extractedInfo?.documentType || '',
                personName: page.extractedInfo?.personName || '',
                // リネーム全体の一括指定テキスト
                manualFileName: '',
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

    // 書類名候補の管理
    const [documentCandidates, setDocumentCandidates] = useState([]);
    const [showDocSuggestions, setShowDocSuggestions] = useState(false);
    const [showCompanySuggestions, setShowCompanySuggestions] = useState(false); // 会社名サジェスト表示フラグ

    // UI拡張
    const [zoomLevel, setZoomLevel] = useState(1);

    // サジェスト表示用 (Portal不使用でfixed配置)
    const companyNameInputRef = useRef(null);
    const [suggestionPos, setSuggestionPos] = useState({ top: 0, left: 0, width: 0 });

    // サジェスト表示位置更新
    useEffect(() => {
        if (showCompanySuggestions && companyNameInputRef.current) {
            const rect = companyNameInputRef.current.getBoundingClientRect();
            // fixed配置なのでviewport相対座標そのままを使用
            setSuggestionPos({
                top: rect.bottom,
                left: rect.left,
                width: rect.width
            });
        }
    }, [showCompanySuggestions, currentPageIndex, zoomLevel]);



    // 初期化時に書類名候補を構築（アップロードされた書類名も含む）
    useEffect(() => {
        const storedDocs = localStorage.getItem(STORAGE_KEY_DOCS);
        const customDocs = storedDocs ? JSON.parse(storedDocs) : [];
        // 重複排除して結合（デフォルト + カスタム + アップロード）
        const merged = Array.from(new Set([...defaultDocumentNames, ...customDocs, ...uploadedDocumentNames]));
        setDocumentCandidates(merged);
    }, [uploadedDocumentNames]);

    // Fuseインスタンスの作成（書類名）
    const docFuse = useMemo(() => {
        return new Fuse(documentCandidates, {
            threshold: 0.4, // 曖昧さの許容度
        });
    }, [documentCandidates]);

    // Fuseインスタンスの作成（会社名）
    const companyFuse = useMemo(() => {
        // 会社リストがある場合のみ作成
        if (!companyList || companyList.length === 0) return null;
        return new Fuse(companyList, {
            threshold: 0.4,
        });
    }, [companyList]);

    // 候補に追加（書類名）
    const addDocumentCandidate = (name) => {
        if (!name) return;

        // 接尾辞を除去して保存 (グローバルに除去)
        const cleanName = name.replace(/\(控\)/g, '').replace(/\(返戻\)/g, '');

        const newCandidates = [...documentCandidates, cleanName];
        setDocumentCandidates(newCandidates); // 状態更新

        // LocalStorage更新
        const storedDocs = localStorage.getItem(STORAGE_KEY_DOCS);
        const customDocs = storedDocs ? JSON.parse(storedDocs) : [];
        if (!customDocs.includes(cleanName)) {
            customDocs.push(cleanName);
            localStorage.setItem(STORAGE_KEY_DOCS, JSON.stringify(customDocs));
        }

        // 入力値を更新
        setShowDocSuggestions(false);
    };

    // 予測候補の取得 helper
    const getSuggestions = (fuseInstance, input, allItems) => {
        // 入力が空の場合は全件（最大100件）を表示
        if (!input) {
            return allItems ? allItems.slice(0, 100) : [];
        }
        if (fuseInstance) {
            return fuseInstance.search(input).map(res => res.item).slice(0, 5); // 上位5件
        }
        // FuseがないがallItemsがある場合（念のため）
        return allItems ? allItems.slice(0, 5) : [];
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

    // 拡大縮小機能
    const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.25, 3));
    const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.25, 0.5));

    // 直近の有効な値を検索（継承用）
    const getInheritedValue = (field, currentIndex) => {
        // 現在のページのモードを確認
        const currentMode = classifications[currentIndex]?.mode;

        // field毎の継承ルール
        if (field === 'date') {
            // dateは envelope と document モードでは継承しない（自前の値）
            if (currentMode === 'envelope' || currentMode === 'document') {
                return classifications[currentIndex][field];
            }
        } else if (field === 'companyName') {
            // companyNameは envelope モードでは継承しない
            if (currentMode === 'envelope') {
                return classifications[currentIndex][field];
            }
        } else {
            // documentType, personName
            // envelope, document モードでは継承しない
            if (currentMode === 'envelope' || currentMode === 'document') {
                return classifications[currentIndex][field];
            }
        }

        // 遡って検索
        for (let i = currentIndex - 1; i >= 0; i--) {
            const mode = classifications[i]?.mode;

            if (field === 'date') {
                // 日付は envelope または document モードのページから値を取る
                if (mode === 'envelope' || mode === 'document') return classifications[i][field];
            } else if (field === 'companyName') {
                // 会社名は envelope モードのページまで遡る（documentモードは会社名を共有＝継承する側）
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
        return <div className="text-slate-600 text-center p-8">読み込み中...</div>;
    }

    const progress = ((currentPageIndex + 1) / pages.length) * 100;

    // 入力可否判定
    const isDateEditable = currentClassification.mode === 'envelope' || currentClassification.mode === 'document';
    const isCompanyEditable = currentClassification.mode === 'envelope';
    const isDocPersonEditable = currentClassification.mode === 'envelope' || currentClassification.mode === 'document';

    // 表示用の値（編集不可の場合は継承値を表示）
    const displayValues = {
        date: isDateEditable ? currentClassification.date : getInheritedValue('date', currentPageIndex),
        companyName: isCompanyEditable ? currentClassification.companyName : getInheritedValue('companyName', currentPageIndex),
        documentType: isDocPersonEditable ? currentClassification.documentType : getInheritedValue('documentType', currentPageIndex),
        personName: isDocPersonEditable ? currentClassification.personName : getInheritedValue('personName', currentPageIndex),
    };

    return (
        <div className="fixed inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 overflow-hidden">
            <div className="h-full flex flex-col">
                {/* ヘッダー */}
                <div className="glass-card m-4 p-4 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-slate-800">書類分類</h2>
                        <div className="flex items-center gap-4">
                            <div className="text-slate-600 text-sm">
                                {currentPageIndex + 1} / {pages.length} ページ
                            </div>
                            <div className="w-48 bg-slate-200 rounded-full h-2">
                                <div
                                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300 rounded-full"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* メインコンテンツ: 横並び */}
                <div className="flex-1 flex gap-4 px-4 pb-4 min-h-0">
                    {/* 左側: プレビュー（60%） */}
                    <div className="flex-[3] glass-card p-6 flex flex-col min-h-0 min-w-0">
                        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex-shrink-0">ページ {currentPage.pageNumber}</h3>

                        <div className="flex-1 bg-slate-100 rounded-lg p-0 border border-slate-200 overflow-hidden relative group min-h-0">
                            <div className="absolute top-4 right-6 z-10 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={handleZoomIn}
                                    className="p-2 bg-white rounded shadow text-slate-600 hover:text-blue-600 border border-slate-200"
                                    title="拡大"
                                >
                                    <ZoomIn className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={handleZoomOut}
                                    className="p-2 bg-white rounded shadow text-slate-600 hover:text-blue-600 border border-slate-200"
                                    title="縮小"
                                >
                                    <ZoomOut className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="w-full h-full flex relative overflow-auto p-4 custom-scrollbar">
                                <div
                                    style={{
                                        width: currentPage.viewport ? currentPage.viewport.width * zoomLevel : 'auto',
                                        height: currentPage.viewport ? currentPage.viewport.height * zoomLevel : 'auto',
                                        margin: 'auto',
                                        position: 'relative',
                                        flexShrink: 0
                                    }}
                                >
                                    <div style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left', position: 'absolute', top: 0, left: 0 }}>
                                        <img
                                            src={currentPage.thumbnail}
                                            alt={`ページ ${currentPage.pageNumber}`}
                                            className="max-w-none rounded shadow-lg"
                                        />
                                        {/* テキストレイヤー */}
                                        {currentPage.items && currentPage.viewport && currentPage.items.map((item, idx) => {
                                            // 簡易的な座標計算 (PDF座標系 -> HTML座標系)
                                            // item.transform: [scaleX, skewY, skewX, scaleY, x, y]
                                            // viewport.height から y を引いて上からの位置を計算
                                            const x = item.transform[4];
                                            const y = currentPage.viewport.height - item.transform[5] - item.height;
                                            // スケーリングは親divで行うため、ここでは元の座標を使用

                                            return (
                                                <span
                                                    key={idx}
                                                    style={{
                                                        position: 'absolute',
                                                        left: `${x}px`,
                                                        top: `${y}px`,
                                                        fontSize: `${item.height}px`,
                                                        fontFamily: item.fontName,
                                                        color: 'transparent',
                                                        whiteSpace: 'pre',
                                                        cursor: 'text',
                                                        userSelect: 'text',
                                                        lineHeight: 1,
                                                        pointerEvents: 'auto'
                                                    }}
                                                >
                                                    {item.str}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                        </div>

                        {/* 抽出情報（編集可能） */}
                        <div className="mt-4 space-y-4 flex-shrink-0">

                            {/* リネーム直接指定 */}
                            <div className="bg-indigo-50 border border-indigo-200 rounded p-3">
                                <label className="block text-xs text-indigo-700 mb-1 font-medium">
                                    ファイル名を直接指定 (最優先):
                                </label>
                                <input
                                    type="text"
                                    value={currentClassification.manualFileName || ''}
                                    onChange={(e) => updateClassification('manualFileName', e.target.value)}
                                    placeholder="例: yymmdd_顧客名_書類名_氏名様"
                                    disabled={!isDocPersonEditable} // 同一書類モードの場合は編集不可
                                    className={`w-full px-3 py-2 bg-white border border-indigo-200 rounded text-slate-900 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder-slate-400 ${!isDocPersonEditable ? 'opacity-50 cursor-not-allowed bg-slate-50' : ''}`}
                                />
                                {currentClassification.manualFileName && (
                                    <p className="text-[10px] text-indigo-600 mt-1 flex items-center gap-1">
                                        <Check className="w-3 h-3" />
                                        この名前で出力されます（他の抽出情報は無視されます）
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2 text-sm">
                                <h4 className="text-slate-700 font-medium">抽出情報（候補）:</h4>
                                <p className="text-xs text-slate-500 mb-2">※ダブルクリックで編集できます</p>

                                <div className="bg-white/50 border border-white/40 rounded p-3 space-y-2">
                                    {/* 日付 */}
                                    <div className="flex items-center gap-2">
                                        <span className="text-slate-500 w-24">日付 (YYMMDD):</span>
                                        {editingField === 'date' && isDateEditable ? (
                                            <div className="w-32 flex gap-2">
                                                <input
                                                    type="date"
                                                    defaultValue={parseYYMMDDToDate(currentClassification.date)}
                                                    onChange={(e) => updateExtractedInfo('date', formatDateToYYMMDD(e.target.value))}
                                                    onBlur={() => setEditingField(null)}
                                                    onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                                                    className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-slate-900 text-sm focus:ring-2 focus:ring-blue-500"
                                                    autoFocus
                                                />
                                            </div>
                                        ) : (
                                            <div
                                                className={`w-32 flex items-center justify-between group cursor-pointer p-1 rounded hover:bg-slate-50 ${!isDateEditable ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                onDoubleClick={() => isDateEditable && setEditingField('date')}
                                            >
                                                <span className="text-slate-700 font-mono">{displayValues.date || '[日付]'}</span>
                                                {isDateEditable && (
                                                    <Edit2
                                                        className="w-3 h-3 text-blue-500 opacity-0 group-hover:opacity-100"
                                                        onClick={() => setEditingField('date')}
                                                    />
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* 会社名 */}
                                    <div className="flex items-center gap-2 relative z-20">
                                        <span className="text-slate-500 w-24">会社名:</span>
                                        {editingField === 'companyName' && isCompanyEditable ? (
                                            <div className="flex-1 relative">
                                                <input
                                                    ref={companyNameInputRef}
                                                    type="text"
                                                    value={currentClassification.companyName || ''}
                                                    onChange={(e) => {
                                                        updateExtractedInfo('companyName', e.target.value);
                                                        setShowCompanySuggestions(true);
                                                    }}
                                                    onBlur={() => setTimeout(() => setShowCompanySuggestions(false), 200)}
                                                    onFocus={() => setShowCompanySuggestions(true)}
                                                    onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                                                    className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-slate-900 text-sm focus:ring-2 focus:ring-blue-500"
                                                    autoFocus
                                                />
                                            </div>
                                        ) : (
                                            <div
                                                className={`flex-1 flex items-center justify-between group cursor-pointer p-1 rounded hover:bg-slate-50 ${!isCompanyEditable ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                onDoubleClick={() => isCompanyEditable && setEditingField('companyName')}
                                            >
                                                <span className="text-slate-700">{displayValues.companyName || '[会社名]'}</span>
                                                {isCompanyEditable && (
                                                    <Edit2
                                                        className="w-3 h-3 text-blue-500 opacity-0 group-hover:opacity-100"
                                                        onClick={() => setEditingField('companyName')}
                                                    />
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* 書類名 */}
                                    <div className="flex items-center gap-2 relative z-10">
                                        <span className="text-slate-500 w-24">書類名:</span>
                                        {editingField === 'documentType' && isDocPersonEditable ? (
                                            <div className="flex-1 flex gap-2 items-center">
                                                <div className="relative" style={{ width: '45%' }}>
                                                    <input
                                                        type="text"
                                                        value={currentClassification.documentType || ''}
                                                        onChange={(e) => {
                                                            updateExtractedInfo('documentType', e.target.value);
                                                            setShowDocSuggestions(true);
                                                        }}
                                                        onBlur={() => setTimeout(() => setShowDocSuggestions(false), 200)}
                                                        onFocus={() => setShowDocSuggestions(true)}
                                                        onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                                                        className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-slate-900 text-sm focus:ring-2 focus:ring-blue-500"
                                                        autoFocus
                                                    />
                                                    {/* 書類名予測サジェスト */}
                                                    {showDocSuggestions && (
                                                        <div className="absolute left-0 top-full mt-1 w-full bg-white border border-slate-200 rounded shadow-xl max-h-60 overflow-y-auto z-50">
                                                            {getSuggestions(docFuse, currentClassification.documentType).map((suggestion, idx) => (
                                                                <div
                                                                    key={idx}
                                                                    className="px-3 py-2 text-slate-700 text-sm hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0"
                                                                    onMouseDown={() => {
                                                                        updateExtractedInfo('documentType', suggestion);
                                                                        setShowDocSuggestions(false);
                                                                    }}
                                                                >
                                                                    {suggestion}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* 控/返戻ボタン - 常時表示、個別ON/OFF */}
                                                <div className="flex gap-1 items-center">
                                                    <button
                                                        onClick={() => {
                                                            let current = currentClassification.documentType || '';
                                                            if (current.includes('(控)')) {
                                                                updateExtractedInfo('documentType', current.replace('(控)', ''));
                                                            } else {
                                                                updateExtractedInfo('documentType', current + '(控)');
                                                            }
                                                        }}
                                                        disabled={!currentClassification.documentType}
                                                        className={`px-2 py-1 text-xs rounded border transition-colors ${(currentClassification.documentType || '').includes('(控)')
                                                            ? 'bg-blue-500 text-white border-blue-500'
                                                            : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                                                            } ${!currentClassification.documentType ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    >
                                                        控
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            let current = currentClassification.documentType || '';
                                                            if (current.includes('(返戻)')) {
                                                                updateExtractedInfo('documentType', current.replace('(返戻)', ''));
                                                            } else {
                                                                updateExtractedInfo('documentType', current + '(返戻)');
                                                            }
                                                        }}
                                                        disabled={!currentClassification.documentType}
                                                        className={`px-2 py-1 text-xs rounded border transition-colors ${(currentClassification.documentType || '').includes('(返戻)')
                                                            ? 'bg-red-500 text-white border-red-500'
                                                            : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                                                            } ${!currentClassification.documentType ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    >
                                                        返戻
                                                    </button>
                                                </div>

                                                {/* 候補追加ボタン - cleanNameが候補リストにない場合のみ表示 */}
                                                {(() => {
                                                    const rawName = currentClassification.documentType || '';
                                                    const cleanName = rawName.replace(/\(控\)/g, '').replace(/\(返戻\)/g, '').trim();
                                                    // cleanNameが空でなく、かつ候補リストに存在しない場合のみ表示
                                                    return (cleanName && !documentCandidates.includes(cleanName)) ? (
                                                        <button
                                                            onClick={() => addDocumentCandidate(rawName)}
                                                            className="p-1.5 bg-green-500/10 text-green-600 rounded hover:bg-green-500/20 transition-colors tooltip-trigger relative group"
                                                            title="候補に追加"
                                                        >
                                                            <Plus className="w-4 h-4" />
                                                            <div className="absolute bottom-full right-0 mb-2 w-48 bg-slate-800 rounded p-2 text-[10px] text-white opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                                                                リストに追加 ("{cleanName}")
                                                            </div>
                                                        </button>
                                                    ) : null;
                                                })()}
                                            </div>
                                        ) : (
                                            <div className="flex-1 flex items-center gap-2">
                                                <div
                                                    className={`flex-1 flex items-center justify-between group cursor-pointer p-1 rounded hover:bg-slate-50 ${!isDocPersonEditable ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    onDoubleClick={() => isDocPersonEditable && setEditingField('documentType')}
                                                    style={{ maxWidth: '45%' }}
                                                >
                                                    <span className="text-slate-700 truncate">{displayValues.documentType || '[書類名]'}</span>
                                                    {isDocPersonEditable && (
                                                        <Edit2
                                                            className="w-3 h-3 text-blue-500 opacity-0 group-hover:opacity-100 flex-shrink-0 ml-1"
                                                            onClick={() => setEditingField('documentType')}
                                                        />
                                                    )}
                                                </div>

                                                {/* 控/返戻ボタン - 非編集モードでも常時表示 */}
                                                {isDocPersonEditable && (
                                                    <div className="flex gap-1 items-center">
                                                        <button
                                                            onClick={() => {
                                                                let current = displayValues.documentType || '';
                                                                if (current.includes('(控)')) {
                                                                    updateExtractedInfo('documentType', current.replace('(控)', ''));
                                                                } else {
                                                                    updateExtractedInfo('documentType', current + '(控)');
                                                                }
                                                            }}
                                                            disabled={!displayValues.documentType}
                                                            className={`px-2 py-1 text-xs rounded border transition-colors ${(displayValues.documentType || '').includes('(控)')
                                                                ? 'bg-blue-500 text-white border-blue-500'
                                                                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                                                                } ${!displayValues.documentType ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        >
                                                            控
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                let current = displayValues.documentType || '';
                                                                if (current.includes('(返戻)')) {
                                                                    updateExtractedInfo('documentType', current.replace('(返戻)', ''));
                                                                } else {
                                                                    updateExtractedInfo('documentType', current + '(返戻)');
                                                                }
                                                            }}
                                                            disabled={!displayValues.documentType}
                                                            className={`px-2 py-1 text-xs rounded border transition-colors ${(displayValues.documentType || '').includes('(返戻)')
                                                                ? 'bg-red-500 text-white border-red-500'
                                                                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                                                                } ${!displayValues.documentType ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        >
                                                            返戻
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* 被保険者名 */}
                                    <div className="flex items-center gap-2">
                                        <span className="text-slate-500 w-24">被保険者名:</span>
                                        {editingField === 'personName' && isDocPersonEditable ? (
                                            <input
                                                type="text"
                                                value={currentClassification.personName || ''}
                                                onChange={(e) => updateExtractedInfo('personName', e.target.value)}
                                                onBlur={() => setEditingField(null)}
                                                onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                                                className="flex-1 px-2 py-1 bg-white border border-slate-300 rounded text-slate-900 text-sm focus:ring-2 focus:ring-blue-500"
                                                autoFocus
                                            />
                                        ) : (
                                            <div
                                                className={`flex-1 flex items-center justify-between group cursor-pointer p-1 rounded hover:bg-slate-50 ${!isDocPersonEditable ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                onDoubleClick={() => isDocPersonEditable && setEditingField('personName')}
                                            >
                                                <span className="text-slate-700">{displayValues.personName || '（なし）'}</span>
                                                {isDocPersonEditable && (
                                                    <Edit2
                                                        className="w-3 h-3 text-blue-500 opacity-0 group-hover:opacity-100"
                                                        onClick={() => setEditingField('personName')}
                                                    />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 右側: 分類設定（40%） */}
                    <div className="flex-[2] glass-card p-6 flex flex-col min-h-0 min-w-0">
                        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex-shrink-0">分類設定</h3>

                        <div className="flex-1 space-y-6 overflow-auto">
                            {/* 分類モード選択 */}
                            <div className="space-y-3">
                                <label className="block text-slate-600 text-sm font-medium">
                                    分類モード
                                </label>

                                <button
                                    onClick={() => updateClassification('mode', 'envelope')}
                                    className={`w-full px-4 py-3 rounded-lg font-semibold transition-all text-left ${currentClassification.mode === 'envelope'
                                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span>① 顧問先切替</span>
                                        <kbd className={`px-2 py-1 rounded text-xs ${currentClassification.mode === 'envelope' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>1</kbd>
                                    </div>
                                    <p className={`text-xs mt-1 ${currentClassification.mode === 'envelope' ? 'text-blue-600/70' : 'text-slate-400'}`}>
                                        前の書類と別封筒
                                    </p>
                                </button>

                                <button
                                    onClick={() => updateClassification('mode', 'document')}
                                    className={`w-full px-4 py-3 rounded-lg font-semibold transition-all text-left ${currentClassification.mode === 'document'
                                        ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span>② 内容切替</span>
                                        <kbd className={`px-2 py-1 rounded text-xs ${currentClassification.mode === 'document' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'}`}>2</kbd>
                                    </div>
                                    <p className={`text-xs mt-1 ${currentClassification.mode === 'document' ? 'text-purple-600/70' : 'text-slate-400'}`}>
                                        前の書類と別のPDFに分割（会社名を共有）
                                    </p>
                                </button>

                                <button
                                    onClick={() => updateClassification('mode', 'same')}
                                    className={`w-full px-4 py-3 rounded-lg font-semibold transition-all text-left ${currentClassification.mode === 'same'
                                        ? 'bg-green-50 text-green-700 border border-green-200'
                                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span>③ 同一書類</span>
                                        <kbd className={`px-2 py-1 rounded text-xs ${currentClassification.mode === 'same' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>3</kbd>
                                    </div>
                                    <p className={`text-xs mt-1 ${currentClassification.mode === 'same' ? 'text-green-600/70' : 'text-slate-400'}`}>
                                        前の書類と同じPDFに結合（全項目を共有）
                                    </p>
                                </button>
                            </div>

                            {/* 不要データフラグ */}
                            <div className="flex items-center gap-3 p-3 bg-white/50 border border-white/40 rounded-lg">
                                <input
                                    type="checkbox"
                                    id="isExcluded"
                                    checked={currentClassification.isExcluded || false}
                                    onChange={(e) => updateClassification('isExcluded', e.target.checked)}
                                    className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                                />
                                <label htmlFor="isExcluded" className="text-slate-700 cursor-pointer flex-1">
                                    不要データ（リネーム情報のみ使用）
                                </label>
                            </div>

                            {currentClassification.isExcluded && (
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-600 text-sm">
                                    このページは「除外データ.pdf」に移動します（情報は有効）
                                </div>
                            )}

                            {/* キーボードショートカットヘルプ */}
                            <div className="bg-slate-100 rounded-lg p-4 text-xs text-slate-500 space-y-1 border border-slate-200">
                                <p className="font-medium text-slate-700 mb-2">ショートカット:</p>
                                <p><kbd className="px-2 py-1 bg-white border border-slate-200 rounded">1-3</kbd> 分類モード</p>
                                <p><kbd className="px-2 py-1 bg-white border border-slate-200 rounded">Enter</kbd> 次へ</p>
                                <p><kbd className="px-2 py-1 bg-white border border-slate-200 rounded">Shift+Enter</kbd> 前へ</p>
                                <p><kbd className="px-2 py-1 bg-white border border-slate-200 rounded">Space</kbd> 不要フラグ</p>
                            </div>
                        </div>

                        {/* ナビゲーションボタン */}
                        <div className="mt-4 flex items-center justify-between gap-4 flex-shrink-0">
                            <button
                                onClick={goToPreviousPage}
                                disabled={currentPageIndex === 0}
                                className="btn-secondary flex items-center gap-2 flex-1 justify-center"
                            >
                                <ChevronLeft className="w-5 h-5" />
                                前へ
                            </button>

                            {currentPageIndex < pages.length - 1 ? (
                                <button
                                    onClick={goToNextPage}
                                    className="btn-primary flex items-center gap-2 flex-1 justify-center"
                                >
                                    次へ
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            ) : (
                                <button
                                    onClick={handleComplete}
                                    className="btn-primary flex items-center gap-2 flex-1 bg-gradient-to-r from-green-500 to-green-600 justify-center"
                                >
                                    <Check className="w-5 h-5" />
                                    PDF生成
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            {/* 会社名サジェストレイヤー (Fixed Position) */}
            {showCompanySuggestions && (
                <div
                    className="fixed bg-white border border-slate-200 rounded shadow-xl max-h-60 overflow-y-auto z-[9999]"
                    style={{
                        top: `${suggestionPos.top}px`,
                        left: `${suggestionPos.left}px`,
                        width: `${suggestionPos.width}px`,
                    }}
                >
                    {companyList && companyList.length > 0 ? (
                        getSuggestions(companyFuse, currentClassification.companyName, companyList).map((suggestion, idx) => (
                            <div
                                key={idx}
                                className="px-3 py-2 text-slate-700 text-sm hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0"
                                onMouseDown={() => {
                                    updateExtractedInfo('companyName', suggestion);
                                    setShowCompanySuggestions(false);
                                }}
                            >
                                {suggestion}
                            </div>
                        ))
                    ) : (
                        <div className="px-3 py-2 text-slate-400 text-xs text-center">
                            会社名リストがありません
                        </div>
                    )}
                </div>
            )}
        </div >
    );
}
