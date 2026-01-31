import React from 'react';

export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-8 bg-red-50 text-red-900 min-h-screen font-sans">
                    <div className="max-w-4xl mx-auto">
                        <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
                            <span className="text-3xl">⚠️</span> アプリケーションエラー
                        </h1>
                        <p className="mb-6 text-lg">予期せぬエラーが発生し、画面を表示できません。</p>

                        <div className="bg-white p-6 rounded-lg shadow-md border border-red-200 overflow-auto mb-6">
                            <h3 className="text-sm font-bold text-red-700 mb-2">エラー詳細:</h3>
                            <pre className="text-sm font-mono text-red-600 bg-red-50 p-4 rounded mb-4 whitespace-pre-wrap break-words">
                                {this.state.error && this.state.error.toString()}
                            </pre>

                            <h3 className="text-sm font-bold text-slate-700 mb-2">コンポーネントスタック:</h3>
                            <pre className="text-xs font-mono text-gray-500 bg-gray-50 p-4 rounded overflow-x-auto">
                                {this.state.errorInfo && this.state.errorInfo.componentStack}
                            </pre>
                        </div>

                        <button
                            className="px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                            onClick={() => window.location.reload()}
                        >
                            ページを再読み込み
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
