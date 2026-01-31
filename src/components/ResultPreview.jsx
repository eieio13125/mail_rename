import React, { useState } from 'react';
import { Download, FileText, Edit2, Check, X, ArrowLeft, List } from 'lucide-react';
import JSZip from 'jszip';
import { generateFileName } from '../utils/pdfProcessor';

export default function ResultPreview({ generatedPDFs, onBackToTop, onShowAddedDocs }) {
    const [editingIndex, setEditingIndex] = useState(null);
    const [editedNames, setEditedNames] = useState({});

    // ZIP一括ダウンロード
    const handleDownloadAll = async () => {
        try {
            const zip = new JSZip();

            generatedPDFs.forEach((pdf) => {
                const fileName = editedNames[pdf.id] || pdf.fileName;
                // pdf.dataがUint8Arrayであることを確認
                const data = pdf.data instanceof Uint8Array ? pdf.data : new Uint8Array(pdf.data);
                zip.file(fileName, data, { binary: true });
            });

            const blob = await zip.generateAsync({
                type: 'blob',
                compression: 'DEFLATE',
                compressionOptions: { level: 6 }
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `郵便物_${new Date().toISOString().slice(0, 10)}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('ZIP生成エラー:', error);
            alert('ZIPファイルの生成に失敗しました: ' + error.message);
        }
    };

    // 個別ダウンロード
    const handleDownloadSingle = (pdf) => {
        try {
            const fileName = editedNames[pdf.id] || pdf.fileName;
            // pdf.dataがUint8Arrayであることを確認
            const data = pdf.data instanceof Uint8Array ? pdf.data : new Uint8Array(pdf.data);
            const blob = new Blob([data], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('PDFダウンロードエラー:', error);
            alert('PDFのダウンロードに失敗しました: ' + error.message);
        }
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
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">生成結果</h2>
                        <p className="text-slate-600">
                            {validPDFs.length} 件のPDFを生成しました
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onBackToTop}
                            className="btn-secondary flex items-center gap-2 px-5 py-3"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            トップへ戻る
                        </button>
                        <button
                            onClick={onShowAddedDocs}
                            className="btn-secondary flex items-center gap-2 px-5 py-3"
                        >
                            <List className="w-5 h-5" />
                            追加した書類名一覧
                        </button>
                        <button
                            onClick={handleDownloadAll}
                            className="flex items-center gap-2 text-lg px-6 py-3 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg font-semibold transition-colors border border-blue-200"
                        >
                            <Download className="w-6 h-6" />
                            ZIP一括ダウンロード
                        </button>
                    </div>
                </div>
            </div>


            {/* 有効なPDFリスト */}
            <div className="glass-card p-6 space-y-4">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">生成されたPDF</h3>

                <div className="space-y-3">
                    {validPDFs.map((pdf, index) => (
                        <div
                            key={pdf.id}
                            className="bg-white rounded-lg p-4 border border-slate-200 hover:bg-slate-50 transition-all shadow-sm"
                        >
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <FileText className="w-5 h-5 text-blue-500 flex-shrink-0" />

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
                                                className="text-slate-400 hover:text-slate-600"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <p className="text-slate-800 truncate font-medium">
                                                {editedNames[pdf.id] || pdf.fileName}
                                            </p>
                                            <button
                                                onClick={() => setEditingIndex(index)}
                                                className="text-slate-400 hover:text-blue-500 flex-shrink-0 transition-colors"
                                                title="ファイル名を編集"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-3 flex-shrink-0">
                                    <span className="text-slate-500 text-sm">
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
                <div className="glass-card p-6 space-y-4 border-amber-200 bg-amber-50/50">
                    <h3 className="text-lg font-semibold text-amber-600 mb-4">除外データ</h3>

                    <div className="bg-white rounded-lg p-4 border border-amber-200 shadow-sm">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <FileText className="w-5 h-5 text-amber-500" />
                                <div>
                                    <p className="text-slate-800 font-medium">{excludedPDF.fileName}</p>
                                    <p className="text-slate-500 text-sm">
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
                <h3 className="text-lg font-semibold text-slate-800 mb-4">処理サマリー</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
                        <p className="text-3xl font-bold text-blue-600">{validPDFs.length}</p>
                        <p className="text-slate-500 text-sm mt-1">有効な書類</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
                        <p className="text-3xl font-bold text-amber-500">
                            {excludedPDF?.pageCount || 0}
                        </p>
                        <p className="text-slate-500 text-sm mt-1">除外ページ</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
                        <p className="text-3xl font-bold text-purple-600">
                            {validPDFs.reduce((sum, pdf) => sum + pdf.pageCount, 0)}
                        </p>
                        <p className="text-slate-500 text-sm mt-1">総ページ数</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
