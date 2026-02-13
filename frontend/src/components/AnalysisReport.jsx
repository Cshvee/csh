import React from 'react';
import { FileText, RefreshCw, Download, Share2 } from 'lucide-react';

const AnalysisReport = ({ report, loading, onRefresh, actionLabel = "重新生成", disabled = false }) => {
  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-white flex items-center gap-2">
            <FileText className="text-blue-400" size={20} />
            培养方案改进分析
          </h3>
          <p className="text-sm text-gray-400 mt-1">Training Plan Improvement Analysis</p>
        </div>
        <button 
          onClick={onRefresh}
          disabled={loading || disabled}
          className="px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-300 text-sm border border-blue-500/30 hover:bg-blue-500/30 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          {loading ? "生成中..." : actionLabel}
        </button>
      </div>

      {/* Report Content Area */}
      <div className="flex-1 bg-slate-800/50 rounded-xl border border-white/10 overflow-hidden flex flex-col relative group">
        
        {/* Document Toolbar */}
        <div className="h-10 border-b border-white/5 bg-black/20 flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
            </div>
            <div className="flex items-center gap-3">
                <button className="text-gray-500 hover:text-gray-300 transition-colors">
                    <Download size={14} />
                </button>
                <button className="text-gray-500 hover:text-gray-300 transition-colors">
                    <Share2 size={14} />
                </button>
            </div>
        </div>

        {/* Scrollable Text Content */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin custom-report-content">
          {report ? (
            <div className="prose prose-invert max-w-none">
              <div className="mb-6 pb-4 border-b border-white/10">
                <h1 className="text-2xl font-bold text-white mb-2">{report.title || "专业培养方案改进分析报告"}</h1>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>生成时间: {new Date().toLocaleDateString()}</span>
                    <span>来源: EduMind AI 智能分析引擎</span>
                </div>
              </div>
              
              {/* Render report sections */}
              {report.sections ? (
                report.sections.map((section, idx) => (
                    <div key={idx} className="mb-6">
                        <h3 className="text-lg font-semibold text-blue-300 mb-3 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                            {section.title}
                        </h3>
                        <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                            {section.content}
                        </div>
                    </div>
                ))
              ) : (
                <div className="text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {report.content || report}
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-4">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                    <FileText size={32} className="text-gray-600" />
                </div>
                <p>请选择左侧专业以生成分析报告</p>
            </div>
          )}
        </div>

        {/* Loading Overlay */}
        {loading && (
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <span className="text-blue-400 text-sm animate-pulse">AI 正在深度分析图谱数据...</span>
            </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisReport;
