import React, { useState } from 'react';
import { FileText } from 'lucide-react';
import FileUploader from './components/FileUploader';
import ProcessingProgress from './components/ProcessingProgress';
import DocumentClassifier from './components/DocumentClassifier';
import ResultPreview from './components/ResultPreview';
import AddedDocumentList from './components/AddedDocumentList';
import { processPDF, splitPDF, generateFileName } from './utils/pdfProcessor';
import { extractCompanyList } from './utils/excelParser';
import { suggestClassification, extractAndInheritInfo, groupPagesByClassification, generateFileNameFromGroup } from './utils/documentClassifier';
import { cleanupAfterDownload } from './utils/securityManager';

function App() {
  const [stage, setStage] = useState('upload'); // upload, processing, classifying, generating, result, addedDocs
  const [processingStage, setProcessingStage] = useState('loading');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [pages, setPages] = useState([]);
  const [companyList, setCompanyList] = useState([]);
  const [generatedPDFs, setGeneratedPDFs] = useState([]);
  const [pdfData, setPdfData] = useState(null);
  const [uploadedDocumentNames, setUploadedDocumentNames] = useState([]);
  const [sessionAddedDocumentNames, setSessionAddedDocumentNames] = useState([]);

  // ファイルアップロード処理
  const handleFilesUploaded = async ({ pdfFile, excelData, companyColumnName, documentNamesData }) => {
    setStage('processing');
    setProcessingStage('loading');

    // アップロードされた書類名があれば設定
    if (documentNamesData && documentNamesData.length > 0) {
      setUploadedDocumentNames(documentNamesData);
    }

    try {
      // 顧客リストを抽出
      // 修正: Excelデータがない場合に備えて空配列をデフォルトにする（extractCompanyListを呼ばない）
      let companies = [];
      if (excelData && (excelData.columns?.length > 0 || excelData.data?.length > 0)) {
        // excelDataが { columns: [], data: [] } の形式であることを期待しているが、
        // FileUploader側で空の場合のハンドリングをしているかどうか確認が必要。
        // FileUploaderからのデータ構造に合わせて修正。
        // FileUploaderでは excelData: excelData || { columns: [], data: [] } としているので、
        // columnsやdataが空かどうかをチェックするのが安全。
        if (excelData.columns && excelData.columns.length > 0) {
          companies = extractCompanyList(excelData, companyColumnName);
        }
      }
      setCompanyList(companies);

      // PDFを処理
      setProcessingStage('extracting');
      const arrayBuffer = await pdfFile.arrayBuffer();
      setPdfData(arrayBuffer);

      const extractedPages = await processPDF(pdfFile, (current, total) => {
        setCurrentPage(current);
        setTotalPages(total);
      });

      // 分類を提案
      setProcessingStage('suggesting');
      let previousClassification = null;
      const pagesWithSuggestions = extractedPages.map((page) => {
        const suggestion = suggestClassification(page, previousClassification, companies);

        // 封筒の場合、大分類をリセット
        if (suggestion.documentType === '封筒') {
          previousClassification = suggestion;
        } else if (previousClassification) {
          // 前回の大分類を引き継ぐ
          previousClassification = {
            ...previousClassification,
            minorCategory: suggestion.minorCategory,
          };
        } else {
          previousClassification = suggestion;
        }

        return {
          ...page,
          suggestedClassification: suggestion,
        };
      });

      // 情報を抽出（分類提案後）
      const pagesWithInfo = pagesWithSuggestions.map((page, index) => {
        const extractedInfo = extractAndInheritInfo(
          pagesWithSuggestions.map(p => ({
            ...p,
            classification: p.suggestedClassification
          })),
          index,
          companies
        );

        return {
          ...page,
          extractedInfo: extractedInfo,
        };
      });

      setPages(pagesWithInfo);
      setProcessingStage('complete');

      // 対話型分類へ移行
      setTimeout(() => {
        setStage('classifying');
      }, 500);

    } catch (error) {
      console.error('処理エラー:', error);
      alert('処理中にエラーが発生しました: ' + error.message);
      setStage('upload');
    }
  };

  // 分類完了後、PDF生成
  const handleClassificationComplete = async (classifiedPages) => {
    setStage('generating');
    setProcessingStage('generating');

    try {
      // 情報を抽出・引用
      const pagesWithInfo = classifiedPages.map((page, index) => {
        const extractedInfo = extractAndInheritInfo(classifiedPages, index, companyList);
        return {
          ...page,
          extractedInfo,
        };
      });

      // 新しい分類ロジックでグループ化
      const groups = groupPagesByClassification(pagesWithInfo);

      // 各グループからPDFを生成
      const pdfs = [];
      const excludedPageNumbers = [];
      const fileNameCounts = new Map(); // 重複カウント用
      let pdfId = 0;

      for (const group of groups) {
        try {
          // 除外データの場合、後でまとめて処理するためにページ番号を保存
          if (group.isExcludedData) {
            group.pages.forEach(p => excludedPageNumbers.push(p.pageNumber));
            continue;
          }

          const pageNumbers = group.pages.map(p => p.pageNumber);
          const pdfBytes = await splitPDF(pdfData, pageNumbers);

          // ベースのファイル名を生成
          let fileName = generateFileNameFromGroup(group);
          const baseName = fileName.endsWith('.pdf') ? fileName.slice(0, -4) : fileName;

          // 重複チェックと連番付与
          if (fileNameCounts.has(baseName)) {
            const count = fileNameCounts.get(baseName) + 1;
            fileNameCounts.set(baseName, count);
            fileName = `${baseName}_${count}.pdf`;
          } else {
            fileNameCounts.set(baseName, 1);
          }

          pdfs.push({
            id: pdfId++,
            fileName: fileName,
            data: pdfBytes,
            pageCount: group.pages.length,
            isExcluded: false,
          });
        } catch (groupError) {
          console.error(`グループ生成エラー (${group.documentType}):`, groupError);
          // 失敗したグループがあっても続行
        }
      }

      // 除外データがある場合、まとめて1つのPDFにする
      if (excludedPageNumbers.length > 0) {
        // ページ順にソート（念のため）
        excludedPageNumbers.sort((a, b) => a - b);
        const excludedPdfBytes = await splitPDF(pdfData, excludedPageNumbers);

        pdfs.push({
          id: pdfId++,
          fileName: '除外データ.pdf',
          data: excludedPdfBytes,
          pageCount: excludedPageNumbers.length,
          isExcluded: true,
        });
      }

      setGeneratedPDFs(pdfs);
      setProcessingStage('complete');

      // 結果表示へ移行
      setTimeout(() => {
        setStage('result');
      }, 500);

    } catch (error) {
      console.error('PDF生成エラー:', error);
      alert('PDF生成中にエラーが発生しました: ' + error.message);
      setStage('classifying');
    }
  };

  // トップへ戻る
  const handleBackToTop = () => {
    try {
      cleanupAfterDownload({
        pages,
        generatedPDFs,
        pdfData,
      });
    } catch (error) {
      console.error(' Cleanup error:', error);
    }

    // 状態をリセット
    setStage('upload');
    setPages([]);
    setGeneratedPDFs([]);
    setPdfData(null);
    setCompanyList([]);
    setUploadedDocumentNames([]);
    setSessionAddedDocumentNames([]);
  };

  // 追加した書類名一覧を表示
  const handleShowAddedDocs = () => {
    setStage('addedDocs');
  };

  return (
    <div className="min-h-screen">      {/* メインコンテンツ */}
      {stage === 'upload' && (
        <FileUploader
          onFilesUploaded={handleFilesUploaded}
        />
      )}

      {stage === 'processing' && (
        <ProcessingProgress
          currentPage={currentPage}
          totalPages={totalPages}
          stage={processingStage}
        />
      )}

      {stage === 'classifying' && (
        <DocumentClassifier
          pages={pages}
          companyList={companyList}
          uploadedDocumentNames={uploadedDocumentNames}
          onClassificationComplete={handleClassificationComplete}
          onAddDocumentName={(name) => {
            if (!sessionAddedDocumentNames.includes(name)) {
              setSessionAddedDocumentNames([...sessionAddedDocumentNames, name]);
            }
          }}
        />
      )}

      {stage === 'generating' && (
        <ProcessingProgress
          currentPage={0}
          totalPages={0}
          stage={processingStage}
        />
      )}

      {stage === 'result' && (
        <ResultPreview
          generatedPDFs={generatedPDFs}
          onBackToTop={handleBackToTop}
          onShowAddedDocs={handleShowAddedDocs}
        />
      )}

      {stage === 'addedDocs' && (
        <AddedDocumentList
          onBack={() => setStage('result')}
          uploadedDocumentNames={uploadedDocumentNames}
          sessionAddedDocumentNames={sessionAddedDocumentNames}
        />
      )}
    </div>
  );
}

export default App;

