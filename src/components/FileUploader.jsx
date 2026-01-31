import React, { useState, useCallback } from 'react';
import { Upload, FileText, Table, CheckCircle, AlertCircle, List } from 'lucide-react';
import { parseExcelFile } from '../utils/excelParser';

export default function FileUploader({ onFilesUploaded }) {
    const [pdfFile, setPdfFile] = useState(null);
    const [excelFile, setExcelFile] = useState(null);
    const [excelData, setExcelData] = useState(null);
    const [selectedColumn, setSelectedColumn] = useState('会社名');
    const [dragActive, setDragActive] = useState(false);
    const [error, setError] = useState(null);
    const [documentNamesFile, setDocumentNamesFile] = useState(null);
    const [documentNamesData, setDocumentNamesData] = useState(null);

    // PDFファイルのドロップハンドラ
    const handlePdfDrop = useCallback((e) => {
        e.preventDefault();
        setDragActive(false);

        const file = e.dataTransfer.files[0];
        if (file && file.type === 'application/pdf') {
            setPdfFile(file);
            setError(null);
        } else {
            setError('PDFファイルを選択してください');
        }
    }, []);

    // Excelファイルの処理
    const handleExcelChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const data = await parseExcelFile(file);
            setExcelFile(file);
            setExcelData(data);

            // デフォルトで「会社名」カラムを選択（存在する場合）
            if (data.columns.includes('会社名')) {
                setSelectedColumn('会社名');
            } else if (data.columns.length > 0) {
                setSelectedColumn(data.columns[0]);
            }

            setError(null);
        } catch (err) {
            setError('Excelファイルの読み込みに失敗しました: ' + err.message);
        }
    };

    // 書類名JSONファイルの処理
    const handleDocumentNamesChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            if (!Array.isArray(data)) {
                throw new Error('JSONファイルは配列形式である必要があります');
            }

            setDocumentNamesFile(file);
            setDocumentNamesData(data);
            setError(null);
        } catch (err) {
            setError('書類名JSONファイルの読み込みに失敗しました: ' + err.message);
        }
    };

    // アップロード実行
    const handleUpload = () => {
        if (!pdfFile) {
            setError('PDFファイルを選択してください');
            return;
        }

        if (!excelFile || !excelData) {
            // Excelがなくても進めるようにする（警告のみ、エラーにはしない）
            console.warn('Excelファイルが選択されていません。会社名リストは空になります。');
        }

        if (excelData && !selectedColumn) {
            setError('会社名のカラムを選択してください');
            return;
        }

        onFilesUploaded({
            pdfFile,
            excelData: excelData || { columns: [], data: [] }, // データがない場合は空オブジェクトを渡す
            companyColumnName: selectedColumn,
            documentNamesData: documentNamesData || [], // 書類名JSONデータ
        });
    };

    return (
        <div className="max-w-4xl mx-auto p-8 space-y-6 animate-fade-in">
            {/* ヘッダー */}
            <div className="text-center mb-8">
                <h1 className="text-4xl font-bold text-slate-800 mb-3">
                    郵便物自動仕分け・リネームシステム
                </h1>
                <p className="text-slate-500 text-lg">
                    スキャンPDFと顧客リストをアップロードしてください
                </p>
            </div>

            {/* PDFアップロード */}
            <div className="glass-card p-6 space-y-4">
                <div className="flex items-center gap-3 mb-4">
                    <FileText className="w-6 h-6 text-blue-600" />
                    <h2 className="text-xl font-semibold text-slate-800">スキャンPDF</h2>
                </div>

                <div
                    className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 ${dragActive
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
                        }`}
                    onDragOver={(e) => {
                        e.preventDefault();
                        setDragActive(true);
                    }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={handlePdfDrop}
                >
                    <Upload className="w-16 h-16 mx-auto mb-4 text-slate-400" />

                    {pdfFile ? (
                        <div className="space-y-2">
                            <CheckCircle className="w-8 h-8 mx-auto text-green-500" />
                            <p className="text-slate-800 font-semibold">{pdfFile.name}</p>
                            <p className="text-slate-500 text-sm">
                                {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                            <button
                                onClick={() => setPdfFile(null)}
                                className="text-blue-600 hover:text-blue-700 text-sm underline"
                            >
                                変更
                            </button>
                        </div>
                    ) : (
                        <div>
                            <p className="text-slate-700 mb-2">
                                PDFファイルをドラッグ&ドロップ
                            </p>
                            <p className="text-slate-400 text-sm mb-4">または</p>
                            <label className="btn-secondary cursor-pointer inline-block">
                                ファイルを選択
                                <input
                                    type="file"
                                    accept="application/pdf"
                                    onChange={(e) => {
                                        const file = e.target.files[0];
                                        if (file) setPdfFile(file);
                                    }}
                                    className="hidden"
                                />
                            </label>
                        </div>
                    )}
                </div>
            </div>

            {/* Excelアップロード */}
            <div className="glass-card p-6 space-y-4">
                <div className="flex items-center gap-3 mb-4">
                    <Table className="w-6 h-6 text-purple-600" />
                    <h2 className="text-xl font-semibold text-slate-800">顧客リスト（Excel）</h2>
                </div>

                <div className="space-y-4">
                    <label className="btn-secondary cursor-pointer inline-block">
                        <Table className="w-5 h-5 inline mr-2" />
                        Excelファイルを選択
                        <input
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={handleExcelChange}
                            className="hidden"
                        />
                    </label>

                    {excelFile && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-slate-700">
                                <CheckCircle className="w-5 h-5 text-green-500" />
                                <span>{excelFile.name}</span>
                            </div>

                            {excelData && (
                                <div className="space-y-2">
                                    <label className="block text-slate-600 text-sm font-medium">
                                        会社名のカラムを選択:
                                    </label>
                                    <select
                                        value={selectedColumn}
                                        onChange={(e) => setSelectedColumn(e.target.value)}
                                        className="input-field"
                                    >
                                        {excelData.columns.map((col, index) => (
                                            <option key={index} value={col}>
                                                {col}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-slate-500 text-sm">
                                        {excelData.data.length} 件のデータを読み込みました
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* 書類名JSONアップロード */}
            <div className="glass-card p-6 space-y-4">
                <div className="flex items-center gap-3 mb-4">
                    <List className="w-6 h-6 text-green-600" />
                    <h2 className="text-xl font-semibold text-slate-800">書類名リスト（JSON）</h2>
                    <span className="text-xs text-slate-500">オプション</span>
                </div>

                <div className="space-y-4">
                    <p className="text-slate-500 text-sm">
                        過去にエクスポートした書類名リスト（JSON）をアップロードすると、リネーム候補として使用できます。
                    </p>
                    <label className="btn-secondary cursor-pointer inline-block">
                        <List className="w-5 h-5 inline mr-2" />
                        JSONファイルを選択
                        <input
                            type="file"
                            accept=".json"
                            onChange={handleDocumentNamesChange}
                            className="hidden"
                        />
                    </label>

                    {documentNamesFile && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-slate-700">
                                <CheckCircle className="w-5 h-5 text-green-500" />
                                <span>{documentNamesFile.name}</span>
                            </div>
                            <p className="text-slate-500 text-sm">
                                {documentNamesData?.length || 0} 件の書類名を読み込みました
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* エラー表示 */}
            {error && (
                <div className="glass-card p-4 border-red-200 bg-red-50">
                    <div className="flex items-center gap-2 text-red-600">
                        <AlertCircle className="w-5 h-5" />
                        <p>{error}</p>
                    </div>
                </div>
            )}

            {/* アップロードボタン */}
            <div className="text-center pt-4">
                <button
                    onClick={handleUpload}
                    disabled={!pdfFile}
                    className={`btn-primary text-lg px-12 py-4 ${!pdfFile ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    処理を開始
                </button>
            </div>
        </div>
    );
}
