import React, { useState, useEffect } from 'react';
import { ArrowLeft, Trash2, Edit2, Download, Check, X, AlertTriangle } from 'lucide-react';

const STORAGE_KEY_DOCS = 'mail_rename_custom_docs';

export default function AddedDocumentList({ onBack }) {
    const [documents, setDocuments] = useState([]);
    const [editingDoc, setEditingDoc] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [message, setMessage] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 50;

    // LocalStorageから追加した書類名を読み込み
    useEffect(() => {
        loadDocuments();
    }, []);

    const loadDocuments = () => {
        const storedDocs = localStorage.getItem(STORAGE_KEY_DOCS);
        const customDocs = storedDocs ? JSON.parse(storedDocs) : [];
        setDocuments(customDocs.sort());
    };

    // 削除
    const handleDelete = (docToDelete) => {
        if (!window.confirm(`「${docToDelete}」を削除してもよろしいですか？`)) return;

        const updated = documents.filter(d => d !== docToDelete);
        localStorage.setItem(STORAGE_KEY_DOCS, JSON.stringify(updated));
        setDocuments(updated);
        setMessage({ type: 'success', text: '削除しました' });
        setTimeout(() => setMessage(null), 3000);
    };

    // 編集開始
    const startEditing = (doc) => {
        setEditingDoc(doc);
        setEditValue(doc);
    };

    // 編集キャンセル
    const cancelEditing = () => {
        setEditingDoc(null);
        setEditValue('');
    };

    // 編集保存
    const saveEditing = (oldName) => {
        const trimmed = editValue.trim();
        if (!trimmed || trimmed === oldName) {
            cancelEditing();
            return;
        }

        if (documents.includes(trimmed)) {
            setMessage({ type: 'error', text: 'この書類名は既に存在します' });
            return;
        }

        const updated = documents.filter(d => d !== oldName);
        updated.push(trimmed);
        updated.sort();
        localStorage.setItem(STORAGE_KEY_DOCS, JSON.stringify(updated));
        setDocuments(updated);
        setEditingDoc(null);
        setMessage({ type: 'success', text: '変更しました' });
        setTimeout(() => setMessage(null), 3000);
    };

    // JSONエクスポート
    const handleExport = () => {
        if (documents.length === 0) {
            setMessage({ type: 'error', text: 'エクスポートする書類名がありません' });
            setTimeout(() => setMessage(null), 3000);
            return;
        }

        const jsonStr = JSON.stringify(documents, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `追加書類名_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setMessage({ type: 'success', text: 'JSONファイルをエクスポートしました' });
        setTimeout(() => setMessage(null), 3000);
    };

    // ページネーション
    const totalPages = Math.ceil(documents.length / itemsPerPage);
    const paginatedDocs = documents.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <div className="max-w-4xl mx-auto p-8 animate-fade-in">
            <div className="glass-card p-8">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onBack}
                            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-800"
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                        <h2 className="text-2xl font-bold text-slate-800">追加した書類名一覧</h2>
                    </div>
                    <button
                        onClick={handleExport}
                        disabled={documents.length === 0}
                        className="btn-primary flex items-center gap-2 px-4 py-2"
                    >
                        <Download className="w-4 h-4" />
                        JSONエクスポート
                    </button>
                </div>

                {/* 説明 */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <p className="text-blue-700 text-sm">
                        分類作業中に追加した書類名の一覧です。JSONエクスポートしてバックアップしたり、
                        次回の処理時にインポートして使用できます。
                    </p>
                </div>

                {/* 書類名一覧 */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden min-h-[300px]">
                    {documents.length > 0 ? (
                        <div className="divide-y divide-slate-100">
                            {paginatedDocs.map((doc, index) => (
                                <div key={index} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                                    {editingDoc === doc ? (
                                        <div className="flex-1 flex items-center gap-2 mr-4">
                                            <input
                                                type="text"
                                                value={editValue}
                                                onChange={(e) => setEditValue(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') saveEditing(doc);
                                                    if (e.key === 'Escape') cancelEditing();
                                                }}
                                                className="flex-1 px-3 py-1 bg-white border border-blue-300 rounded text-slate-800 focus:ring-2 focus:ring-blue-200"
                                                autoFocus
                                            />
                                            <button
                                                onClick={() => saveEditing(doc)}
                                                className="p-1.5 bg-blue-500 text-white rounded hover:bg-blue-600"
                                                title="保存"
                                            >
                                                <Check className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={cancelEditing}
                                                className="p-1.5 bg-slate-200 text-slate-600 rounded hover:bg-slate-300"
                                                title="キャンセル"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="text-slate-800 font-medium">{doc}</span>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => startEditing(doc)}
                                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                                                    title="編集"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(doc)}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                                                    title="削除"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-12 text-center">
                            <AlertTriangle className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                            <p className="text-slate-500">追加した書類名がありません</p>
                            <p className="text-slate-400 text-sm mt-2">
                                分類作業で新しい書類名を追加すると、ここに表示されます
                            </p>
                        </div>
                    )}
                </div>

                {/* ページネーション */}
                {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2 pt-4">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                        >
                            前へ
                        </button>
                        <span className="text-slate-600 text-sm">
                            {currentPage} / {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                        >
                            次へ
                        </button>
                    </div>
                )}

                {/* 件数表示 */}
                <div className="text-center text-slate-500 text-sm mt-4">
                    全 {documents.length} 件
                </div>

                {message && (
                    <div className={`fixed bottom-8 right-8 px-6 py-3 rounded-lg shadow-xl text-white animate-fade-in ${message.type === 'error' ? 'bg-red-500' : 'bg-green-500'
                        }`}>
                        {message.text}
                    </div>
                )}
            </div>
        </div>
    );
}
