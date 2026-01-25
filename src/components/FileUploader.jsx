import React, { useState, useCallback } from 'react';
import { Upload, FileText, Table, CheckCircle, AlertCircle } from 'lucide-react';
import { parseExcelFile } from '../utils/excelParser';

export default function FileUploader({ onFilesUploaded }) {
    const [pdfFile, setPdfFile] = useState(null);
    const [excelFile, setExcelFile] = useState(null);
    const [excelData, setExcelData] = useState(null);
    const [selectedColumn, setSelectedColumn] = useState('会社名');
    const [dragActive, setDragActive] = useState(false);
    const [error, setError] = useState(null);

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

    // アップロード実行
    const handleUpload = () => {
        if (!pdfFile) {
            setError('PDFファイルを選択してください');
            return;
        }

        if (!excelFile || !excelData) {
            setError('Excelファイルを選択してください');
            return;
        }

        if (!selectedColumn) {
            setError('会社名のカラムを選択してください');
            return;
        }

        onFilesUploaded({
            pdfFile,
            excelData,
            companyColumnName: selectedColumn,
        });
    };

    return (
        <div className="max-w-4xl mx-auto p-8 space-y-6 animate-fade-in">
            {/* ヘッダー */}
            <div className="text-center mb-8">
                <h1 className="text-4xl font-bold text-gradient mb-3">
                    郵便物自動仕分け・リネームシステム
                </h1>
                <p className="text-white/70 text-lg">
                    スキャンPDFと顧客リストをアップロードしてください
                </p>
            </div>

            {/* PDFアップロード */}
            <div className="glass-card p-6 space-y-4">
                <div className="flex items-center gap-3 mb-4">
                    <FileText className="w-6 h-6 text-primary-400" />
                    <h2 className="text-xl font-semibold text-white">スキャンPDF</h2>
                </div>

                <div
                    className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 ${dragActive
                        ? 'border-primary-400 bg-primary-400/10'
                        : 'border-white/30 hover:border-white/50'
                        }`}
                    onDragOver={(e) => {
                        e.preventDefault();
                        setDragActive(true);
                    }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={handlePdfDrop}
                >
                    <Upload className="w-16 h-16 mx-auto mb-4 text-white/50" />

                    {pdfFile ? (
                        <div className="space-y-2">
                            <CheckCircle className="w-8 h-8 mx-auto text-green-400" />
                            <p className="text-white font-semibold">{pdfFile.name}</p>
                            <p className="text-white/60 text-sm">
                                {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                            <button
                                onClick={() => setPdfFile(null)}
                                className="text-primary-400 hover:text-primary-300 text-sm underline"
                            >
                                変更
                            </button>
                        </div>
                    ) : (
                        <div>
                            <p className="text-white mb-2">
                                PDFファイルをドラッグ&ドロップ
                            </p>
                            <p className="text-white/50 text-sm mb-4">または</p>
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
                    <Table className="w-6 h-6 text-accent-400" />
                    <h2 className="text-xl font-semibold text-white">顧客リスト（Excel）</h2>
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
                            <div className="flex items-center gap-2 text-white">
                                <CheckCircle className="w-5 h-5 text-green-400" />
                                <span>{excelFile.name}</span>
                            </div>

                            {excelData && (
                                <div className="space-y-2">
                                    <label className="block text-white/80 text-sm font-medium">
                                        会社名のカラムを選択:
                                    </label>
                                    <select
                                        value={selectedColumn}
                                        onChange={(e) => setSelectedColumn(e.target.value)}
                                        className="input-field"
                                        style={{ color: 'white' }}
                                    >
                                        {excelData.columns.map((col, index) => (
                                            <option
                                                key={index}
                                                value={col}
                                                style={{
                                                    backgroundColor: '#1e293b',
                                                    color: 'white'
                                                }}
                                            >
                                                {col}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-white/60 text-sm">
                                        {excelData.data.length} 件のデータを読み込みました
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* エラー表示 */}
            {error && (
                <div className="glass-card p-4 border-red-500/50 bg-red-500/10">
                    <div className="flex items-center gap-2 text-red-400">
                        <AlertCircle className="w-5 h-5" />
                        <p>{error}</p>
                    </div>
                </div>
            )}

            {/* アップロードボタン */}
            <div className="text-center pt-4">
                <button
                    onClick={handleUpload}
                    disabled={!pdfFile || !excelFile}
                    className="btn-primary text-lg px-12 py-4"
                >
                    処理を開始
                </button>
            </div>
        </div>
    );
}
