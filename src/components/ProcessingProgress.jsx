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
            <div className="glass-card p-8 space-y-6">
                <div className="text-center">
                    {stage === 'complete' ? (
                        <FileCheck className="w-16 h-16 mx-auto text-green-400 mb-4" />
                    ) : (
                        <Loader2 className="w-16 h-16 mx-auto text-primary-400 animate-spin mb-4" />
                    )}

                    <h2 className="text-2xl font-bold text-white mb-2">
                        {stages[stage] || '処理中...'}
                    </h2>

                    {totalPages > 0 && (
                        <p className="text-white/70">
                            {currentPage} / {totalPages} ページ
                        </p>
                    )}
                </div>

                {/* プログレスバー */}
                <div className="space-y-2">
                    <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all duration-300 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <p className="text-center text-white/60 text-sm">
                        {progress.toFixed(0)}%
                    </p>
                </div>

                {stage !== 'complete' && (
                    <div className="text-center text-white/50 text-sm">
                        <p>しばらくお待ちください...</p>
                    </div>
                )}
            </div>
        </div>
    );
}
