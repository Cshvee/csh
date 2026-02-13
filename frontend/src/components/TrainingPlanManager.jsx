import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, FileText, Download, Trash2, X, 
  ChevronDown, ChevronRight, Search, File, 
  Clock, CheckCircle, AlertCircle, Eye,
  FolderOpen, GraduationCap, School, BookOpen,
  Play
} from 'lucide-react';

// 培养方案管理组件
const TrainingPlanManager = ({ 
  isOpen, 
  onClose, 
  schoolOptions = [],
  selectedSchool,
  selectedCollege,
  selectedMajor,
  onSelectPlan,
  defaultTab = 'list' // 'list' | 'upload'
}) => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState(defaultTab); // 'list' | 'upload'
  
  // Toast 通知状态
  const [toast, setToast] = useState({ show: false, type: 'success', message: '', description: '' });
  
  // 筛选状态
  const [filterSchool, setFilterSchool] = useState(selectedSchool || '');
  const [filterCollege, setFilterCollege] = useState(selectedCollege || '');
  const [filterMajor, setFilterMajor] = useState(selectedMajor || '');
  
  // 上传表单状态
  const [uploadForm, setUploadForm] = useState({
    school: selectedSchool || '',
    college: selectedCollege || '',
    major: selectedMajor || '',
    description: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  // 学院和专业选项
  const [collegeOptions, setCollegeOptions] = useState([]);
  const [majorOptions, setMajorOptions] = useState([]);
  const [filterCollegeOptions, setFilterCollegeOptions] = useState([]);
  const [filterMajorOptions, setFilterMajorOptions] = useState([]);

  // 获取培养方案列表
  const fetchPlans = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = '/api/v1/training-plans/list?page=1&page_size=100';
      if (filterSchool) url += `&school=${encodeURIComponent(filterSchool)}`;
      if (filterCollege) url += `&college=${encodeURIComponent(filterCollege)}`;
      if (filterMajor) url += `&major=${encodeURIComponent(filterMajor)}`;
      
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setPlans(data.items || []);
      } else {
        setError('获取列表失败');
      }
    } catch (e) {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  };

  // 加载学院列表（上传用）
  const fetchColleges = async (school) => {
    if (!school) {
      setCollegeOptions([]);
      return;
    }
    try {
      const res = await fetch(`/api/v1/schools/${encodeURIComponent(school)}/colleges`);
      if (res.ok) {
        const data = await res.json();
        setCollegeOptions(data);
      }
    } catch (e) {
      console.error('Failed to fetch colleges', e);
    }
  };

  // 加载专业列表（上传用）
  const fetchMajors = async (school, college) => {
    if (!school || !college) {
      setMajorOptions([]);
      return;
    }
    try {
      const res = await fetch(`/api/v1/schools/${encodeURIComponent(school)}/colleges/${encodeURIComponent(college)}/majors`);
      if (res.ok) {
        const data = await res.json();
        setMajorOptions(data);
      }
    } catch (e) {
      console.error('Failed to fetch majors', e);
    }
  };

  // 加载学院列表（筛选用）
  const fetchFilterColleges = async (school) => {
    if (!school) {
      setFilterCollegeOptions([]);
      return;
    }
    try {
      const res = await fetch(`/api/v1/schools/${encodeURIComponent(school)}/colleges`);
      if (res.ok) {
        const data = await res.json();
        setFilterCollegeOptions(data);
      }
    } catch (e) {
      console.error('Failed to fetch colleges', e);
    }
  };

  // 加载专业列表（筛选用）
  const fetchFilterMajors = async (school, college) => {
    if (!school || !college) {
      setFilterMajorOptions([]);
      return;
    }
    try {
      const res = await fetch(`/api/v1/schools/${encodeURIComponent(school)}/colleges/${encodeURIComponent(college)}/majors`);
      if (res.ok) {
        const data = await res.json();
        setFilterMajorOptions(data);
      }
    } catch (e) {
      console.error('Failed to fetch majors', e);
    }
  };

  // 初始化上传表单和默认标签页
  useEffect(() => {
    setUploadForm({
      school: selectedSchool || '',
      college: selectedCollege || '',
      major: selectedMajor || '',
      description: ''
    });
    setFilterSchool(selectedSchool || '');
    setFilterCollege(selectedCollege || '');
    setFilterMajor(selectedMajor || '');
    setViewMode(defaultTab);
  }, [selectedSchool, selectedCollege, selectedMajor, isOpen, defaultTab]);

  useEffect(() => {
    if (isOpen) {
      fetchPlans();
    }
  }, [isOpen, filterSchool, filterCollege, filterMajor]);

  // 上传表单级联
  useEffect(() => {
    if (uploadForm.school) {
      fetchColleges(uploadForm.school);
    } else {
      setCollegeOptions([]);
    }
  }, [uploadForm.school]);

  useEffect(() => {
    if (uploadForm.school && uploadForm.college) {
      fetchMajors(uploadForm.school, uploadForm.college);
    } else {
      setMajorOptions([]);
    }
  }, [uploadForm.school, uploadForm.college]);

  // 筛选级联
  useEffect(() => {
    if (filterSchool) {
      fetchFilterColleges(filterSchool);
    } else {
      setFilterCollegeOptions([]);
      setFilterMajorOptions([]);
    }
  }, [filterSchool]);

  useEffect(() => {
    if (filterSchool && filterCollege) {
      fetchFilterMajors(filterSchool, filterCollege);
    } else {
      setFilterMajorOptions([]);
    }
  }, [filterSchool, filterCollege]);

  // 处理文件选择
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowedTypes = ['.pdf', '.docx', '.doc', '.txt'];
      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      if (!allowedTypes.includes(ext)) {
        alert('不支持的文件类型，请上传 PDF、DOCX 或 TXT 文件');
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        alert('文件大小超过 50MB 限制');
        return;
      }
      setSelectedFile(file);
    }
  };

  // 上传培养方案
  const handleUpload = async () => {
    if (!uploadForm.school || !uploadForm.college || !uploadForm.major) {
      alert('请选择学校、学院和专业');
      return;
    }
    if (!selectedFile) {
      alert('请选择要上传的文件');
      return;
    }

    setUploadLoading(true);
    try {
      const formData = new FormData();
      formData.append('school', uploadForm.school);
      formData.append('college', uploadForm.college);
      formData.append('major', uploadForm.major);
      formData.append('description', uploadForm.description);
      formData.append('file', selectedFile);

      const res = await fetch('/api/v1/training-plans/upload', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        // 优雅的成功提示
        setToast({
          show: true,
          type: 'success',
          message: '上传成功',
          description: `「${data.original_filename}」已保存到 ${data.school} - ${data.major}`
        });
        setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
        setSelectedFile(null);
        setUploadForm({
          school: selectedSchool || '',
          college: selectedCollege || '',
          major: selectedMajor || '',
          description: ''
        });
        setViewMode('list');
        fetchPlans();
        
        // 如果提供了 onSelectPlan 回调，自动选中上传的方案
        if (onSelectPlan) {
          onSelectPlan(data);
        }
      } else {
        const err = await res.json();
        alert(`上传失败: ${err.detail || '未知错误'}`);
      }
    } catch (e) {
      alert('上传失败，请检查网络连接');
    } finally {
      setUploadLoading(false);
    }
  };

  // 删除培养方案
  const handleDelete = async (id) => {
    if (!confirm('确定要删除这个培养方案吗？')) return;
    
    try {
      const res = await fetch(`/api/v1/training-plans/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setToast({
          show: true,
          type: 'success',
          message: '删除成功',
          description: '培养方案已删除'
        });
        setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
        fetchPlans();
      } else {
        setToast({
          show: true,
          type: 'error',
          message: '删除失败',
          description: '请稍后重试'
        });
        setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
      }
    } catch (e) {
      setToast({
        show: true,
        type: 'error',
        message: '删除失败',
        description: '网络错误，请检查连接'
      });
      setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
    }
  };

  // 下载培养方案
  const handleDownload = (id, filename) => {
    window.open(`/api/v1/training-plans/${id}/download`, '_blank');
  };

  // 查看培养方案并使用
  const handleViewAndUse = async (plan) => {
    try {
      // 获取完整的方案详情（包含 extracted_content）
      const res = await fetch(`/api/v1/training-plans/${plan.id}`);
      if (res.ok) {
        const fullPlan = await res.json();
        if (onSelectPlan) {
          onSelectPlan(fullPlan);
        }
        onClose();
      } else {
        setToast({
          show: true,
          type: 'error',
          message: '获取方案详情失败',
          description: '请稍后重试'
        });
        setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
      }
    } catch (e) {
      setToast({
        show: true,
        type: 'error',
        message: '网络错误',
        description: '请检查网络连接'
      });
      setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  };

  // 格式化时间
  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const date = new Date(timeStr);
    return date.toLocaleString('zh-CN');
  };

  if (!isOpen) return null;

  return (
    <>
    {/* Toast Notification */}
    <div className={`fixed top-6 right-6 z-[60] transition-all duration-500 ${
      toast.show ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'
    }`}>
      <div className={`flex items-start gap-3 p-4 rounded-xl border shadow-2xl backdrop-blur-xl min-w-[320px] max-w-[400px] ${
        toast.type === 'success' 
          ? 'bg-emerald-950/90 border-emerald-500/30 shadow-emerald-500/20' 
          : 'bg-red-950/90 border-red-500/30 shadow-red-500/20'
      }`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
          toast.type === 'success' ? 'bg-emerald-500/20' : 'bg-red-500/20'
        }`}>
          {toast.type === 'success' ? (
            <CheckCircle size={20} className="text-emerald-400" />
          ) : (
            <AlertCircle size={20} className="text-red-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={`font-semibold text-sm ${
            toast.type === 'success' ? 'text-emerald-100' : 'text-red-100'
          }`}>
            {toast.message}
          </h4>
          {toast.description && (
            <p className={`text-xs mt-1 line-clamp-2 ${
              toast.type === 'success' ? 'text-emerald-300/70' : 'text-red-300/70'
            }`}>
              {toast.description}
            </p>
          )}
        </div>
        <button 
          onClick={() => setToast(prev => ({ ...prev, show: false }))}
          className={`p-1 rounded-lg transition-colors ${
            toast.type === 'success' 
              ? 'hover:bg-emerald-500/20 text-emerald-400' 
              : 'hover:bg-red-500/20 text-red-400'
          }`}
        >
          <X size={16} />
        </button>
        
        {/* 进度条 */}
        <div className={`absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl overflow-hidden ${
          toast.type === 'success' ? 'bg-emerald-500/20' : 'bg-red-500/20'
        }`}>
          <div className={`h-full ${
            toast.type === 'success' ? 'bg-emerald-400' : 'bg-red-400'
          } transition-all duration-[3000ms] ease-linear ${
            toast.show ? 'w-0' : 'w-full'
          }`} style={{ width: toast.show ? '0%' : '100%' }} />
        </div>
      </div>
    </div>

    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-5xl h-[85vh] bg-slate-900 rounded-2xl border border-white/10 flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <FolderOpen size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">培养方案管理</h2>
              <p className="text-xs text-gray-400">上传、查看和管理各专业的培养方案</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* 切换视图按钮 */}
            <div className="flex bg-slate-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-md text-sm transition-all ${
                  viewMode === 'list' 
                    ? 'bg-blue-500 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                方案列表
              </button>
              <button
                onClick={() => setViewMode('upload')}
                className={`px-3 py-1.5 rounded-md text-sm transition-all ${
                  viewMode === 'upload' 
                    ? 'bg-blue-500 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                上传新方案
              </button>
            </div>
            
            <button 
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {viewMode === 'list' ? (
            <div className="h-full flex flex-col">
              {/* Filter Bar */}
              <div className="px-6 py-4 border-b border-white/10 bg-slate-800/30">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-400">筛选:</span>
                  <select
                    value={filterSchool}
                    onChange={(e) => {
                      setFilterSchool(e.target.value);
                      setFilterCollege('');
                      setFilterMajor('');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 border border-white/10 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">所有学校</option>
                    {(schoolOptions || []).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  
                  <select
                    value={filterCollege}
                    onChange={(e) => {
                      setFilterCollege(e.target.value);
                      setFilterMajor('');
                    }}
                    disabled={!filterSchool}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 border border-white/10 text-sm text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                  >
                    <option value="">所有学院</option>
                    {filterCollegeOptions.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  
                  <select
                    value={filterMajor}
                    onChange={(e) => setFilterMajor(e.target.value)}
                    disabled={!filterCollege}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 border border-white/10 text-sm text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                  >
                    <option value="">所有专业</option>
                    {filterMajorOptions.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  
                  <button
                    onClick={fetchPlans}
                    className="px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 text-sm transition-colors"
                  >
                    刷新
                  </button>
                </div>
              </div>

              {/* Plans List */}
              <div className="flex-1 overflow-y-auto p-6">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                    <span className="ml-3 text-gray-400">加载中...</span>
                  </div>
                ) : error ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <AlertCircle size={48} className="mb-4 text-red-400" />
                    <p>{error}</p>
                    <button 
                      onClick={fetchPlans}
                      className="mt-4 px-4 py-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                    >
                      重试
                    </button>
                  </div>
                ) : !plans || plans.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <FileText size={64} className="mb-4 opacity-30" />
                    <p className="text-lg">暂无培养方案</p>
                    <p className="text-sm mt-2">点击"上传新方案"按钮添加</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {plans.map(plan => (
                      <div 
                        key={plan.id}
                        className="group p-4 rounded-xl bg-slate-800/50 border border-white/5 hover:border-blue-500/30 hover:bg-slate-800 transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <FileText size={20} className="text-blue-400" />
                              <h3 className="font-medium text-white truncate" title={plan.original_filename || ''}>
                                {plan.original_filename || '未命名文件'}
                              </h3>
                              <span className="px-2 py-0.5 rounded text-xs bg-white/10 text-gray-400 uppercase">
                                {plan.file_type || 'unknown'}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm text-gray-400 mb-2">
                              <span className="flex items-center gap-1">
                                <School size={14} />
                                {plan.school || '-'}
                              </span>
                              <span className="flex items-center gap-1">
                                <BookOpen size={14} />
                                {plan.college || '-'}
                              </span>
                              <span className="flex items-center gap-1">
                                <GraduationCap size={14} />
                                {plan.major || '-'}
                              </span>
                            </div>
                            
                            {plan.description && (
                              <p className="text-sm text-gray-500 mb-2">{plan.description}</p>
                            )}
                            
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Clock size={12} />
                                {formatTime(plan.created_at)}
                              </span>
                              <span>{formatFileSize(plan.file_size)}</span>
                              {plan.content_length > 0 && (
                                <span className="text-green-400 flex items-center gap-1">
                                  <CheckCircle size={12} />
                                  已提取 {plan.content_length} 字符
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 ml-4">
                            <button
                              onClick={() => handleViewAndUse(plan)}
                              className="px-3 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors flex items-center gap-1.5"
                              title="使用该方案进行分析"
                            >
                              <Play size={16} />
                              <span className="text-xs font-medium">使用</span>
                            </button>
                            <button
                              onClick={() => handleDownload(plan.id, plan.original_filename)}
                              className="p-2 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
                              title="下载"
                            >
                              <Download size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(plan.id)}
                              className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                              title="删除"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Upload View */
            <div className="h-full overflow-y-auto p-6">
              <div className="max-w-2xl mx-auto">
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-white mb-2">上传新培养方案</h3>
                  <p className="text-sm text-gray-400">支持 PDF、DOCX、DOC、TXT 格式，最大 50MB</p>
                </div>

                <div className="space-y-4">
                  {/* School Selection */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">学校 *</label>
                    <select
                      value={uploadForm.school}
                      onChange={(e) => setUploadForm({...uploadForm, school: e.target.value, college: '', major: ''})}
                      className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="">请选择学校</option>
                      {schoolOptions.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  {/* College Selection */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">学院 *</label>
                    <select
                      value={uploadForm.college}
                      onChange={(e) => setUploadForm({...uploadForm, college: e.target.value, major: ''})}
                      disabled={!uploadForm.school}
                      className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                    >
                      <option value="">请选择学院</option>
                      {collegeOptions.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* Major Selection */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">专业 *</label>
                    <select
                      value={uploadForm.major}
                      onChange={(e) => setUploadForm({...uploadForm, major: e.target.value})}
                      disabled={!uploadForm.college}
                      className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                    >
                      <option value="">请选择专业</option>
                      {majorOptions.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">描述/备注</label>
                    <textarea
                      value={uploadForm.description}
                      onChange={(e) => setUploadForm({...uploadForm, description: e.target.value})}
                      placeholder="可选：添加方案描述或备注信息"
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
                    />
                  </div>

                  {/* File Upload */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">文件 *</label>
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className={`relative p-6 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
                        selectedFile 
                          ? 'border-blue-500 bg-blue-500/10' 
                          : 'border-white/20 hover:border-white/40 bg-slate-800/50'
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.docx,.doc,.txt"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      
                      {selectedFile ? (
                        <div className="flex items-center gap-3">
                          <File size={32} className="text-blue-400" />
                          <div className="flex-1">
                            <p className="text-white font-medium">{selectedFile.name}</p>
                            <p className="text-sm text-gray-400">{formatFileSize(selectedFile.size)}</p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFile(null);
                            }}
                            className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      ) : (
                        <div className="text-center">
                          <Upload size={40} className="mx-auto mb-3 text-gray-400" />
                          <p className="text-white mb-1">点击选择文件或拖拽到此处</p>
                          <p className="text-sm text-gray-500">支持 PDF、DOCX、TXT 格式</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    onClick={handleUpload}
                    disabled={uploadLoading || !uploadForm.school || !uploadForm.college || !uploadForm.major || !selectedFile}
                    className={`w-full py-3 rounded-xl font-medium transition-all ${
                      uploadLoading || !uploadForm.school || !uploadForm.college || !uploadForm.major || !selectedFile
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-400 hover:to-purple-500'
                    }`}
                  >
                    {uploadLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        上传中...
                      </span>
                    ) : (
                      '确认上传'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
};

export default TrainingPlanManager;
