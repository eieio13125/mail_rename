import React, { useState, useEffect } from 'react';
import { ArrowLeft, Trash2, Edit2, Download, Check, X, AlertTriangle, FileText, PlusCircle, History } from 'lucide-react';

const STORAGE_KEY_DOCS = 'mail_rename_custom_docs';

export default function AddedDocumentList({
    onBack,
    uploadedDocumentNames = [],
    sessionAddedDocumentNames = []
}) {
    const [documents, setDocuments] = useState([]);
    const [editingDoc, setEditingDoc] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [message, setMessage] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 50;

    // データの読み込みと統合
    useEffect(() => {
        const storedDocs = localStorage.getItem(STORAGE_KEY_DOCS);
        const customDocs = storedDocs ? JSON.parse(storedDocs) : [];

        // すべての書類名を一意に統合
        const allNames = Array.from(new Set([
            ...sessionAddedDocumentNames,
            ...uploadedDocumentNames,
            ...customDocs
        ]));

        // オブジェクト配列に変換して属性を付与
        const docObjects = allNames.map(name => {
            const isThisSession = sessionAddedDocumentNames.includes(name);
            const isUploaded = uploadedDocumentNames.includes(name);
            const isCustom = customDocs.includes(name);

            let type = 'other';
            if (isThisSession) type = 'session';
            else if (isUploaded) type = 'uploaded';
            else if (isCustom) type = 'custom'; // 以前のセッションでの追加分

            return {
                name,
                type,
                isThisSession,
                isUploaded,
                isCustom
            };
        });

        // ソート順: 
        // 1. 今回追加(session) 
        // 2. 以前の追加(custom) 
        // 3. アップロード(uploaded)
        // 4. 名前順
        docObjects.sort((a, b) => {
            const typeWeight = { 'session': 0, 'custom': 1, 'uploaded': 2, 'other': 3 };
            if (typeWeight[a.type] !== typeWeight[b.type]) {
                return typeWeight[a.type] - typeWeight[b.type];
            }
            return a.name.localeCompare(b.name);
        });

        setDocuments(docObjects);
    }, [uploadedDocumentNames, sessionAddedDocumentNames]);

    // 削除
    const handleDelete = (docName) => {
        if (!window.confirm(`「${docName}」を削除してもよろしいですか？`)) return;

        // 状態を更新
        const updatedDocs = documents.filter(d => d.name !== docName);
        setDocuments(updatedDocs);

        // localStorage を更新
        const storedDocs = localStorage.getItem(STORAGE_KEY_DOCS);
        let customDocs = storedDocs ? JSON.parse(storedDocs) : [];
        const updatedCustom = customDocs.filter(d => d !== docName);
        localStorage.setItem(STORAGE_KEY_DOCS, JSON.stringify(updatedCustom));

        setMessage({ type: 'success', text: '削除しました' });
        setTimeout(() => setMessage(null), 3000);
    };

    // 編集保存
    const saveEditing = (oldName) => {
        const trimmed = editValue.trim();
        if (!trimmed || trimmed === oldName) {
            setEditingDoc(null);
            return;
        }

        if (documents.some(d => d.name === trimmed)) {
            setMessage({ type: 'error', text: 'この書類名は既に存在します' });
            return;
        }

        // 状態を更新
        const updatedDocs = documents.map(d => {
            if (d.name === oldName) {
                return { ...d, name: trimmed, type: 'session' }; // 編集したら「今回追加」扱いにする
            }
            return d;
        });
        setDocuments(updatedDocs);

        // localStorage を更新
        const storedDocs = localStorage.getItem(STORAGE_KEY_DOCS);
        let customDocs = storedDocs ? JSON.parse(storedDocs) : [];
        const updatedCustom = customDocs.filter(d => d !== oldName);
        updatedCustom.push(trimmed);
        localStorage.setItem(STORAGE_KEY_DOCS, JSON.stringify(updatedCustom));

        setEditingDoc(null);
        setMessage({ type: 'success', text: '変更しました' });
        setTimeout(() => setMessage(null), 3000);
    };

    // JSONエクスポート
    const handleExport = () => {
        if (documents.length === 0) return;

        const exportData = documents.map(d => d.name).sort();
        const jsonStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `書類名マスター_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setMessage({ type: 'success', text: '最新の書類名リストをJSON出力しました' });
        setTimeout(() => setMessage(null), 3000);
    };

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
                        <h2 className="text-2xl font-bold text-slate-800">書類名の一覧・エクスポート</h2>
                    </div>
                    <button
                        onClick={handleExport}
                        disabled={documents.length === 0}
                        className="flex items-center gap-2 text-lg px-6 py-3 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Download className="w-6 h-6" />
                        JSONエクスポート
                    </button>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 mb-8 flex gap-4">
                    <FileText className="w-6 h-6 text-blue-500 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                        <p className="text-blue-800 font-semibold text-sm">マスターリストの統合管理</p>
                        <p className="text-blue-700/80 text-xs leading-relaxed">
                            アップロードされたJSONと、作業中に追加した書類をすべて表示しています。<br />
                            「今回追加」分は上位に表示されます。修正や削除を行い「JSONエクスポート」することで、次回のアップロードに使える最新リストを保存できます。
                        </p>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden min-h-[400px] shadow-sm">
                    {documents.length > 0 ? (
                        <div className="divide-y divide-slate-100">
                            {paginatedDocs.map((doc, index) => (
                                <div
                                    key={index}
                                    className={`p-4 flex items-center justify-between transition-all group ${doc.type === 'session' ? 'bg-blue-50/50 hover:bg-blue-50' :
                                        doc.type === 'custom' ? 'bg-slate-50/30 hover:bg-slate-50' :
                                            'hover:bg-slate-50'
                                        }`}
                                >
                                    {editingDoc === doc.name ? (
                                        <div className="flex-1 flex items-center gap-2 mr-4">
                                            <input
                                                type="text"
                                                value={editValue}
                                                onChange={(e) => setEditValue(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') saveEditing(doc.name);
                                                    if (e.key === 'Escape') setEditingDoc(null);
                                                }}
                                                className="flex-1 px-4 py-2 bg-white border border-blue-500 rounded-lg text-slate-800 focus:ring-4 focus:ring-blue-100 outline-none shadow-sm"
                                                autoFocus
                                            />
                                            <button onClick={() => saveEditing(doc.name)} className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors shadow-sm">
                                                <Check className="w-5 h-5" />
                                            </button>
                                            <button onClick={() => setEditingDoc(null)} className="p-2 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition-colors">
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-4">
                                                <span className="text-slate-800 font-semibold">{doc.name}</span>
                                                {doc.type === 'session' && (
                                                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 text-blue-700 text-[10px] font-bold uppercase rounded-full border border-blue-200">
                                                        <PlusCircle className="w-3.5 h-3.5" />
                                                        今回追加
                                                    </span>
                                                )}
                                                {doc.type === 'custom' && (
                                                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold uppercase rounded-full border border-amber-200">
                                                        <History className="w-3.5 h-3.5" />
                                                        保存済み
                                                    </span>
                                                )}
                                                {doc.type === 'uploaded' && (
                                                    <span className="px-2.5 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold uppercase rounded-full border border-slate-200">
                                                        既存
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                                <button
                                                    onClick={() => { setEditingDoc(doc.name); setEditValue(doc.name); }}
                                                    className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all shadow-sm hover:shadow"
                                                    title="編集"
                                                >
                                                    <Edit2 className="w-4.5 h-4.5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(doc.name)}
                                                    className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg transition-all shadow-sm hover:shadow"
                                                    title="削除"
                                                >
                                                    <Trash2 className="w-4.5 h-4.5" />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-20 text-center">
                            <AlertTriangle className="w-16 h-16 mx-auto text-slate-200 mb-6" />
                            <p className="text-slate-400 text-lg">書類名リストが空です</p>
                        </div>
                    )}
                </div>

                {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-3 pt-8">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-white hover:shadow-sm disabled:opacity-40 disabled:hover:shadow-none transition-all"
                        >
                            前へ
                        </button>
                        <span className="text-slate-400 text-sm font-bold bg-slate-50 px-4 py-2 rounded-lg border border-slate-100">
                            {currentPage} / {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-white hover:shadow-sm disabled:opacity-40 disabled:hover:shadow-none transition-all"
                        >
                            次へ
                        </button>
                    </div>
                )}

                <div className="text-center text-slate-300 text-[10px] mt-8 tracking-widest uppercase font-black">
                    Integrated document management system • Total {documents.length} entries
                </div>

                {message && (
                    <div className="fixed top-10 left-1/2 transform -translate-x-1/2 px-8 py-4 rounded-2xl shadow-2xl animate-fade-in z-[100] flex items-center gap-4 bg-white border-2 border-slate-200 ring-4 ring-black/5">
                        {message.type === 'error' ? (
                            <div className="p-1.5 bg-red-100 text-red-600 rounded-full"><AlertTriangle className="w-5 h-5" /></div>
                        ) : (
                            <div className="p-1.5 bg-green-100 text-green-600 rounded-full"><Check className="w-5 h-5" /></div>
                        )}
                        <span className="text-lg font-bold tracking-tight text-slate-800">{message.text}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
