import React, { useState } from 'react';
import { Download, FileText, Edit2, Check, X } from 'lucide-react';
import JSZip from 'jszip';
import { generateFileName } from '../utils/pdfProcessor';

export default function ResultPreview({ generatedPDFs, onDownload }) {
    const [editingIndex, setEditingIndex] = useState(null);
    const [editedNames, setEditedNames] = useState({});

    // ZIP一括ダウンロード
    const handleDownloadAll = async () => {
        const zip = new JSZip();

        generatedPDFs.forEach((pdf) => {
            const fileName = editedNames[pdf.id] || pdf.fileName;
            zip.file(fileName, pdf.data);
        });

        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `郵便物_${new Date().toISOString().slice(0, 10)}.zip`;
        a.click();
        URL.revokeObjectURL(url);

        if (onDownload) {
            onDownload();
        }
    };

    // 個別ダウンロード
    const handleDownloadSingle = (pdf) => {
        const fileName = editedNames[pdf.id] || pdf.fileName;
        const blob = new Blob([pdf.data], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
    };

    // ファイル名編集
    const handleEditName = (id, newName) => {
        setEditedNames({ ...editedNames, [id]: newName });
        setEditingIndex(null);
    };

    const validPDFs = generatedPDFs.filter(pdf => !pdf.isExcluded);
    const excludedPDF = generatedPDFs.find(pdf => pdf.isExcluded);

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6 animate-fade-in">
            {/* ヘッダー */}
            <div className="glass-card p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-2">生成結果</h2>
                        <p className="text-white/70">
                            {validPDFs.length} 件のPDFを生成しました
                        </p>
                    </div>
                    <button
                        onClick={handleDownloadAll}
                        className="btn-primary flex items-center gap-2 text-lg px-8 py-4"
                    >
                        <Download className="w-6 h-6" />
                        ZIP一括ダウンロード
                    </button>
                </div>
            </div>

            {/* 有効なPDFリスト */}
            <div className="glass-card p-6 space-y-4">
                <h3 className="text-lg font-semibold text-white mb-4">生成されたPDF</h3>

                <div className="space-y-3">
                    {validPDFs.map((pdf, index) => (
                        <div
                            key={pdf.id}
                            className="bg-white/5 rounded-lg p-4 border border-white/20 hover:bg-white/10 transition-all"
                        >
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <FileText className="w-5 h-5 text-primary-400 flex-shrink-0" />

                                    {editingIndex === index ? (
                                        <div className="flex items-center gap-2 flex-1">
                                            <input
                                                type="text"
                                                defaultValue={editedNames[pdf.id] || pdf.fileName}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        handleEditName(pdf.id, e.target.value);
                                                    } else if (e.key === 'Escape') {
                                                        setEditingIndex(null);
                                                    }
                                                }}
                                                className="input-field text-sm py-2"
                                                autoFocus
                                            />
                                            <button
                                                onClick={() => setEditingIndex(null)}
                                                className="text-white/50 hover:text-white"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <p className="text-white truncate">
                                                {editedNames[pdf.id] || pdf.fileName}
                                            </p>
                                            <button
                                                onClick={() => setEditingIndex(index)}
                                                className="text-white/50 hover:text-white flex-shrink-0"
                                                title="ファイル名を編集"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-3 flex-shrink-0">
                                    <span className="text-white/60 text-sm">
                                        {pdf.pageCount} ページ
                                    </span>
                                    <button
                                        onClick={() => handleDownloadSingle(pdf)}
                                        className="btn-secondary text-sm px-4 py-2"
                                    >
                                        <Download className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 除外データ */}
            {excludedPDF && (
                <div className="glass-card p-6 space-y-4 border-amber-500/30">
                    <h3 className="text-lg font-semibold text-amber-400 mb-4">除外データ</h3>

                    <div className="bg-amber-500/10 rounded-lg p-4 border border-amber-500/30">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <FileText className="w-5 h-5 text-amber-400" />
                                <div>
                                    <p className="text-white">{excludedPDF.fileName}</p>
                                    <p className="text-white/60 text-sm">
                                        {excludedPDF.pageCount} ページ（封筒・送付状）
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => handleDownloadSingle(excludedPDF)}
                                className="btn-secondary text-sm px-4 py-2"
                            >
                                <Download className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* サマリー */}
            <div className="glass-card p-6">
                <h3 className="text-lg font-semibold text-white mb-4">処理サマリー</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-white/5 rounded-lg p-4">
                        <p className="text-3xl font-bold text-primary-400">{validPDFs.length}</p>
                        <p className="text-white/70 text-sm mt-1">有効な書類</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4">
                        <p className="text-3xl font-bold text-amber-400">
                            {excludedPDF?.pageCount || 0}
                        </p>
                        <p className="text-white/70 text-sm mt-1">除外ページ</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4">
                        <p className="text-3xl font-bold text-accent-400">
                            {validPDFs.reduce((sum, pdf) => sum + pdf.pageCount, 0)}
                        </p>
                        <p className="text-white/70 text-sm mt-1">総ページ数</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
