import React, { useState, useEffect } from 'react';
import { ArrowLeft, Trash2, Plus, Search, Save, AlertTriangle } from 'lucide-react';
import defaultDocumentNames from '../data/documentNames.json';

const STORAGE_KEY_DOCS = 'mail_rename_custom_docs';

export default function DocumentManager({ onBack }) {
    const [documents, setDocuments] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [newDocument, setNewDocument] = useState('');
    const [message, setMessage] = useState(null);
    const [editingDoc, setEditingDoc] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 50;

    // 初期データの読み込みと結合
    useEffect(() => {
        loadDocuments();
    }, []);

    const loadDocuments = () => {
        const storedDocs = localStorage.getItem(STORAGE_KEY_DOCS);
        const customDocs = storedDocs ? JSON.parse(storedDocs) : [];
        // 重複排除してソート
        const merged = Array.from(new Set([...defaultDocumentNames, ...customDocs])).sort();
        setDocuments(merged);
    };

    const handleAdd = () => {
        const trimmed = newDocument.trim();
        if (!trimmed) return;

        if (documents.includes(trimmed)) {
            setMessage({ type: 'error', text: 'この書類名は既に存在します' });
            return;
        }

        // LocalStorageに追加
        const storedDocs = localStorage.getItem(STORAGE_KEY_DOCS);
        const customDocs = storedDocs ? JSON.parse(storedDocs) : [];
        const updatedCustomDocs = [...customDocs, trimmed];
        localStorage.setItem(STORAGE_KEY_DOCS, JSON.stringify(updatedCustomDocs));

        loadDocuments();
        setNewDocument('');
        setMessage({ type: 'success', text: '追加しました' });
        setTimeout(() => setMessage(null), 3000);
    };

    const handleDelete = (docToDelete) => {
        if (!window.confirm(`「${docToDelete}」を削除してもよろしいですか？`)) return;

        const storedDocs = localStorage.getItem(STORAGE_KEY_DOCS);
        let customDocs = storedDocs ? JSON.parse(storedDocs) : [];

        if (customDocs.includes(docToDelete)) {
            const updated = customDocs.filter(d => d !== docToDelete);
            localStorage.setItem(STORAGE_KEY_DOCS, JSON.stringify(updated));
            loadDocuments();
            setMessage({ type: 'success', text: '削除しました' });
        } else {
            setMessage({ type: 'error', text: '初期データは削除できません' });
        }
        setTimeout(() => setMessage(null), 3000);
    };

    const startEditing = (doc) => {
        setEditingDoc(doc);
        setEditValue(doc);
    };

    const cancelEditing = () => {
        setEditingDoc(null);
        setEditValue('');
    };

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

        const storedDocs = localStorage.getItem(STORAGE_KEY_DOCS);
        let customDocs = storedDocs ? JSON.parse(storedDocs) : [];

        if (customDocs.includes(oldName)) {
            // 旧名を削除して新名を追加
            const updated = customDocs.filter(d => d !== oldName);
            updated.push(trimmed);
            localStorage.setItem(STORAGE_KEY_DOCS, JSON.stringify(updated));
            loadDocuments();
            setMessage({ type: 'success', text: '変更しました' });
        } else {
            setMessage({ type: 'error', text: '初期データは編集できません' });
        }
        setEditingDoc(null);
        setTimeout(() => setMessage(null), 3000);
    };

    const filteredDocs = documents.filter(doc =>
        doc.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // ページネーション計算
    const totalPages = Math.ceil(filteredDocs.length / itemsPerPage);
    const paginatedDocs = filteredDocs.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // 検索時にページリセット
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

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
                        <h2 className="text-2xl font-bold text-slate-800">書類名管理</h2>
                    </div>
                </div>

                {/* 追加フォーム */}
                <div className="bg-slate-50 rounded-xl p-6 mb-8 border border-slate-200">
                    <h3 className="text-lg font-medium text-slate-800 mb-4 flex items-center gap-2">
                        <Plus className="w-5 h-5 text-blue-600" />
                        新規追加
                    </h3>
                    <div className="flex gap-4">
                        <input
                            type="text"
                            value={newDocument}
                            onChange={(e) => setNewDocument(e.target.value)}
                            placeholder="新しい書類名を入力..."
                            className="flex-1 px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder-slate-400"
                            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                        />
                        <button
                            onClick={handleAdd}
                            disabled={!newDocument.trim()}
                            className="btn-primary px-6"
                        >
                            追加
                        </button>
                    </div>
                    <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                        個人情報を含む名称は登録しないでください
                    </p>
                </div>

                {/* 検索と一覧 */}
                <div className="space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="書類名を検索..."
                            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                        />
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden min-h-[400px]">
                        {paginatedDocs.length > 0 ? (
                            <div className="divide-y divide-slate-100">
                                {paginatedDocs.map((doc, index) => {
                                    const isCustom = !defaultDocumentNames.includes(doc);
                                    return (
                                        <div key={index} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group h-16">
                                            {editingDoc === doc ? (
                                                <div className="flex-1 flex items-center gap-2 mr-4">
                                                    <input
                                                        type="text"
                                                        value={editValue}
                                                        onChange={(e) => setEditValue(e.target.value)}
                                                        className="flex-1 px-3 py-1 bg-white border border-blue-300 rounded text-slate-800 focus:ring-2 focus:ring-blue-200"
                                                        autoFocus
                                                    />
                                                    <button onClick={() => saveEditing(doc)} className="text-xs bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600">保存</button>
                                                    <button onClick={cancelEditing} className="text-xs bg-slate-200 text-slate-600 px-3 py-1 rounded hover:bg-slate-300">キャンセル</button>
                                                </div>
                                            ) : (
                                                <span className="text-slate-800 font-medium">{doc}</span>
                                            )}

                                            <div className="flex items-center gap-3">
                                                {isCustom ? (
                                                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded border border-blue-200">カスタム</span>
                                                ) : (
                                                    <span className="text-xs px-2 py-1 bg-slate-100 text-slate-500 rounded border border-slate-200">初期データ</span>
                                                )}

                                                {isCustom && !editingDoc && (
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => startEditing(doc)}
                                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                                                            title="編集"
                                                        >
                                                            <Save className="w-4 h-4" /> {/* Edit icon replacement */}
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(doc)}
                                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                                                            title="削除"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="p-8 text-center text-slate-400">
                                書類名が見つかりません
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
