import React from 'react';
import { Loader2, FileCheck } from 'lucide-react';

export default function ProcessingProgress({ currentPage, totalPages, stage }) {
    const progress = totalPages > 0 ? (currentPage / totalPages) * 100 : 0;

    const stages = {
        loading: 'PDF読み込み中...',
        extracting: 'テキスト抽出中...',
        analyzing: '書類分析中...',
        suggesting: '分類を提案中...',
        complete: '処理完了！',
    };

    return (
        <div className="max-w-2xl mx-auto p-8 animate-fade-in">
            <div className="glass-card p-8 space-y-6 text-center">
                <div>
                    {stage === 'complete' ? (
                        <FileCheck className="w-16 h-16 mx-auto text-green-500 mb-4" />
                    ) : (
                        <Loader2 className="w-16 h-16 mx-auto text-blue-500 animate-spin mb-4" />
                    )}

                    <h2 className="text-2xl font-bold text-slate-800 mb-2">
                        {stages[stage] || '処理中...'}
                    </h2>

                    {totalPages > 0 && (
                        <p className="text-slate-600">
                            {currentPage} / {totalPages} ページ
                        </p>
                    )}
                </div>

                {/* プログレスバー */}
                <div className="space-y-2">
                    <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <p className="text-center text-slate-500 text-sm">
                        {progress.toFixed(0)}%
                    </p>
                </div>

                {stage !== 'complete' && (
                    <div className="text-center text-slate-400 text-sm">
                        <p>しばらくお待ちください...</p>
                    </div>
                )}
            </div>
        </div>
    );
}
