import React, { useState, useEffect, useRef } from 'react';
import {
  School,
  BookOpen,
  GraduationCap,
  ChevronRight,
  ChevronDown,
  Brain,
  Download,
  User,
  Projector,
  Activity,
  AlertTriangle,
  ArrowUp,
  Clock,
  Database,
  Upload,
  Play,
  RefreshCw,
  Maximize2,
  X,
  FolderOpen
} from 'lucide-react';
import ForceGraph2D from 'react-force-graph-2d';
import RadarChart from './components/RadarChart';
import ProcessFlow from './components/ProcessFlow';
import AnalysisReport from './components/AnalysisReport';
import ProcessLog from './components/ProcessLog';
import TrainingPlanManager from './components/TrainingPlanManager';
import logo from '../zhinan_logo_v1.png';

// 节点颜色映射函数
const getNodeColor = (node) => {
  // 根据 type 和 category 确定颜色
  const type = node.type;
  const category = node.category;
  
  // 按 type 优先
  if (type === 'Major') return '#3b82f6';      // 蓝色 - 专业
  if (type === 'Capability') return '#8b5cf6'; // 紫色 - 能力
  if (type === 'Skill') return '#06b6d4';      // 青色 - 技能
  if (type === 'Quality') return '#f59e0b';    // 橙色 - 素质
  if (type === 'Course') return '#10b981';     // 绿色 - 课程
  if (type === 'Job') return '#ef4444';        // 红色 - 岗位
  if (type === 'Company') return '#ec4899';    // 粉色 - 公司
  
  // 按 category 备选
  if (category === 'Core') return '#3b82f6';
  if (category === 'Capability') return '#8b5cf6';
  if (category === 'Skill') return '#06b6d4';
  if (category === 'Quality') return '#f59e0b';
  if (category === 'Support') return '#10b981';
  if (category === 'Target') return '#ef4444';
  
  return '#64748b'; // 默认灰色
};

const isNoiseNodeName = (name) => {
  const text = String(name || '').trim();
  if (!text) return true;

  const placeholders = [
    '补充节点',
    '专业能力补充',
    '关键技能补充',
    '职业素质补充',
    '支撑课程补充',
    '专业核心节点'
  ];
  if (placeholders.some((k) => text.includes(k))) return true;

  if (/第[0-9一二三四五六七八九十]+级/.test(text)) return true;
  if (text.includes('几级')) return true;

  return false;
};

const buildDisplayGraph = (rawData) => {
  const sourceNodes = rawData?.entities || [];
  const sourceLinks = rawData?.relationships || [];

  const rawNodes = sourceNodes.filter((n) => !isNoiseNodeName(n?.name));
  const validNodeIds = new Set(rawNodes.map((n) => n.id));
  const rawLinks = sourceLinks.filter((l) => validNodeIds.has(l.head) && validNodeIds.has(l.tail));

  if (!rawNodes.length) {
    return { nodes: [], links: [] };
  }

  const nodeById = new Map(rawNodes.map((n) => [n.id, { ...n }]));
  const degree = new Map();
  for (const l of rawLinks) {
    const h = l.head;
    const t = l.tail;
    degree.set(h, (degree.get(h) || 0) + 1);
    degree.set(t, (degree.get(t) || 0) + 1);
  }

  // 可视化抽稀策略：
  // - 保留全部核心节点（专业/能力/技能/素质/课程）
  // - 岗位最多 28 个、企业最多 20 个（按连边度数优先）
  const coreTypes = new Set(['Major', 'Capability', 'Skill', 'Quality', 'Course']);
  const jobs = rawNodes
    .filter((n) => n.type === 'Job')
    .sort((a, b) => (degree.get(b.id) || 0) - (degree.get(a.id) || 0))
    .slice(0, 28);
  const companies = rawNodes
    .filter((n) => n.type === 'Company')
    .sort((a, b) => (degree.get(b.id) || 0) - (degree.get(a.id) || 0))
    .slice(0, 20);

  const keptIds = new Set([
    ...rawNodes.filter((n) => coreTypes.has(n.type)).map((n) => n.id),
    ...jobs.map((n) => n.id),
    ...companies.map((n) => n.id),
  ]);

  // 关系抽稀：限制高密度关系，避免“毛线团”
  const relLimit = {
    TARGETS_JOB: 40,
    OFFERED_BY: 30,
    INCLUDES_SKILL: 80,
    SUPPORTS_CAPABILITY: 60,
    REQUIRES_QUALITY: 50,
    CULTIVATES_CAPABILITY: 40,
  };
  const relCount = {};
  const seenRel = new Set();
  const links = [];

  for (const rel of rawLinks) {
    if (!keptIds.has(rel.head) || !keptIds.has(rel.tail)) continue;
    const key = `${rel.head}|${rel.relation}|${rel.tail}`;
    if (seenRel.has(key)) continue;
    seenRel.add(key);

    const limit = relLimit[rel.relation] ?? 100;
    relCount[rel.relation] = relCount[rel.relation] || 0;
    if (relCount[rel.relation] >= limit) continue;
    relCount[rel.relation] += 1;

    links.push({ source: rel.head, target: rel.tail, ...rel });
  }

  const usedIds = new Set();
  for (const l of links) {
    usedIds.add(l.source);
    usedIds.add(l.target);
  }
  const nodes = rawNodes
    .filter((n) => keptIds.has(n.id) && (usedIds.has(n.id) || coreTypes.has(n.type)))
    .map((n) => ({ ...n }));

  return { nodes, links };
};

// Helper for ForceGraph resizing
const GraphContainer = ({ data, ...props }) => {
  const containerRef = useRef();
  const graphRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };

    updateDimensions();
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  const graphData = React.useMemo(() => buildDisplayGraph(data), [data]);

  useEffect(() => {
    if (!graphRef.current) return;
    // 调整受力参数：拉开节点、降低抖动
    graphRef.current.d3Force('charge')?.strength(-180);
    graphRef.current.d3Force('link')?.distance((l) => {
      if (l.relation === 'TARGETS_JOB') return 80;
      if (l.relation === 'OFFERED_BY') return 60;
      if (l.relation === 'INCLUDES_SKILL') return 85;
      if (l.relation === 'REQUIRES_QUALITY') return 90;
      if (l.relation === 'SUPPORTS_CAPABILITY') return 95;
      return 75;
    });
  }, [graphData]);

  return (
    <div ref={containerRef} className="w-full h-full min-h-[300px]">
      {dimensions.width > 0 && (
        <ForceGraph2D
          ref={graphRef}
          width={dimensions.width}
          height={dimensions.height}
          graphData={graphData}
          cooldownTicks={120}
          d3AlphaDecay={0.03}
          d3VelocityDecay={0.35}
          nodeCanvasObject={(node, ctx, globalScale) => {
            const label = node.name || node.id;
            const fontSize = 12/globalScale;
            ctx.font = `${fontSize}px Sans-Serif`;
            
            const color = getNodeColor(node);

            ctx.beginPath();
            ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI, false);
            ctx.fillStyle = color;
            ctx.fill();
            
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            
            ctx.lineWidth = 2/globalScale;
            ctx.strokeStyle = 'rgba(0,0,0,0.8)';
            ctx.strokeText(label, node.x, node.y + 7);
            ctx.fillText(label, node.x, node.y + 7);
          }}
          linkColor={(link) => {
            if (link.relation === 'TARGETS_JOB' || link.relation === 'OFFERED_BY') return 'rgba(239,68,68,0.18)';
            if (link.relation === 'INCLUDES_SKILL') return 'rgba(6,182,212,0.24)';
            if (link.relation === 'REQUIRES_QUALITY') return 'rgba(245,158,11,0.24)';
            if (link.relation === 'SUPPORTS_CAPABILITY') return 'rgba(16,185,129,0.24)';
            if (link.relation === 'CULTIVATES_CAPABILITY') return 'rgba(139,92,246,0.24)';
            return 'rgba(255,255,255,0.16)';
          }}
          linkWidth={(link) => (link.relation === 'CULTIVATES_CAPABILITY' ? 1.6 : 1)}
          linkDirectionalArrowLength={3}
          linkDirectionalArrowRelPos={1}
          backgroundColor="rgba(0,0,0,0)"
          {...props}
        />
      )}
    </div>
  );
};

const LargeGraphModal = ({ data, onClose }) => {
    // Calculate counts by type
    const counts = React.useMemo(() => {
        const typeCounts = {
            Major: 0,
            Capability: 0,
            Skill: 0,
            Quality: 0,
            Course: 0,
            Job: 0,
            Company: 0,
            Other: 0
        };

        if (data && data.entities) {
            data.entities.forEach(node => {
                const type = node.type;
                if (typeCounts.hasOwnProperty(type)) {
                    typeCounts[type]++;
                } else {
                    typeCounts.Other++;
                }
            });
        }
        return typeCounts;
    }, [data]);

    // Handle ESC key
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-6 animate-in fade-in duration-200">
            <div className="w-full h-full bg-slate-900 rounded-2xl border border-white/10 flex flex-col overflow-hidden relative shadow-2xl ring-1 ring-white/10">
                <div className="absolute top-4 right-4 z-10 flex gap-2">
                    <div className="px-4 py-2 bg-black/40 backdrop-blur rounded-lg text-white/70 text-sm border border-white/5 flex items-center">
                        按 ESC 关闭
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/10 hover:border-white/20"
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className="flex-1 bg-gradient-to-br from-slate-900 to-slate-800 relative">
                     {/* Legend for Modal */}
                     <div className="absolute top-4 left-4 z-10 p-4 bg-black/40 backdrop-blur-md rounded-xl border border-white/5 space-y-2">
                        <div className="text-sm font-medium text-white mb-2">图谱图例</div>
                        <div className="flex items-center gap-2 text-xs text-gray-300">
                            <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                            <span>专业 ({counts.Major})</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-300">
                            <span className="w-3 h-3 rounded-full bg-violet-500"></span>
                            <span>能力 ({counts.Capability})</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-300">
                            <span className="w-3 h-3 rounded-full bg-cyan-500"></span>
                            <span>技能 ({counts.Skill})</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-300">
                            <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                            <span>素质 ({counts.Quality})</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-300">
                            <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                            <span>课程 ({counts.Course})</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-300">
                            <span className="w-3 h-3 rounded-full bg-red-500"></span>
                            <span>岗位 ({counts.Job})</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-300">
                            <span className="w-3 h-3 rounded-full bg-pink-500"></span>
                            <span>公司 ({counts.Company})</span>
                        </div>
                    </div>

                    <GraphContainer 
                        data={data}
                        nodeRelSize={8}
                        nodeCanvasObject={(node, ctx, globalScale) => {
                            const label = node.name || node.id;
                            const fontSize = 14/globalScale; // Scale font size
                            ctx.font = `${fontSize}px Sans-Serif`;
                            
                            // Determine color using the shared function
                            const color = getNodeColor(node);

                            // Draw Node
                            ctx.beginPath();
                            ctx.arc(node.x, node.y, 6, 0, 2 * Math.PI, false);
                            ctx.fillStyle = color;
                            ctx.fill();
                            
                            // Glow effect for node
                            ctx.shadowColor = color;
                            ctx.shadowBlur = 10;
                            ctx.stroke();
                            ctx.shadowBlur = 0;

                            // Draw Label
                            if (globalScale > 0.5) { // Optimization: only draw text when zoomed in a bit or always? User asked for always.
                                ctx.textAlign = 'center';
                                ctx.textBaseline = 'top';
                                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                                
                                // Text outline for readability
                                ctx.lineWidth = 2/globalScale;
                                ctx.strokeStyle = 'rgba(0,0,0,0.8)';
                                ctx.strokeText(label, node.x, node.y + 8);
                                
                                ctx.fillText(label, node.x, node.y + 8);
                            }
                        }}
                        linkColor={() => 'rgba(255,255,255,0.15)'}
                    />
                </div>
            </div>
        </div>
    );
};

function App() {
  // --- Original State & Logic ---
  const [loading, setLoading] = useState(false);
  const [thoughts, setThoughts] = useState([]);
  const [showPlanManager, setShowPlanManager] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [planManagerDefaultTab, setPlanManagerDefaultTab] = useState('list'); // 'list' | 'upload'
  const [showSelectionHint, setShowSelectionHint] = useState(false); // 显示选择提示

  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedCollege, setSelectedCollege] = useState('');
  const [selectedMajor, setSelectedMajor] = useState('');
  
  // Expanded state for Sidebar Tree
  const [expandedSchool, setExpandedSchool] = useState('');
  const [expandedCollege, setExpandedCollege] = useState('');

  const [schoolOptions, setSchoolOptions] = useState([]);
  const [collegeOptions, setCollegeOptions] = useState([]);
  const [majorOptions, setMajorOptions] = useState([]);

  const [graphData, setGraphData] = useState(null);
  const [showGraphModal, setShowGraphModal] = useState(false);
  const [analysisReport, setAnalysisReport] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0); // For ProcessFlow
  const [processLogs, setProcessLogs] = useState([]); // For ProcessLog component
  const [hasUploadedPlan, setHasUploadedPlan] = useState(false);
  const [uploadedPlanContext, setUploadedPlanContext] = useState(null); // Store info about uploaded plan
  const [isGraphReady, setIsGraphReady] = useState(false);

  const [stats, setStats] = useState([
    "相关就业岗位 0万个",
    "相关企业家 0家",
    "行业发展报告 0个",
    "政策文件 0个"
  ]);

  // Fetch Schools
  useEffect(() => {
    fetch('/api/v1/schools')
      .then(res => res.json())
      .then(data => setSchoolOptions(data))
      .catch(err => console.error("Failed to fetch schools", err));
  }, []);

  const generateReport = async (major, graphData) => {
    setIsAnalyzing(true);
    setCurrentStep(5); // Advance to Analysis step
    setProcessLogs(prev => [...prev, {
      event_type: 'agent_status',
      step_id: 7,
      agent_id: 'analyze',
      agent_status: 'running',
      status: 'running',
      message: '策略建议智能体正在生成培养方案改进建议...',
      timestamp: new Date().toLocaleTimeString()
    }]);
    try {
        const res = await fetch('/api/v1/agent/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                school: selectedSchool,
                college: selectedCollege,
                major: major,
                graph_data: graphData,
                training_plan_text: uploadedPlanContext ? uploadedPlanContext.content : null
            })
        });
        if (res.ok) {
            const data = await res.json();
            setAnalysisReport(data.report);
            setProcessLogs(prev => [...prev, {
              event_type: 'agent_status',
              step_id: 7,
              agent_id: 'analyze',
              agent_status: 'done',
              status: 'completed',
              message: '策略建议智能体完成：已生成分析报告。',
              timestamp: new Date().toLocaleTimeString()
            }]);
        } else {
            setProcessLogs(prev => [...prev, {
              event_type: 'agent_status',
              step_id: 7,
              agent_id: 'analyze',
              agent_status: 'blocked',
              status: 'failed',
              message: '策略建议智能体失败：报告生成接口返回异常。',
              timestamp: new Date().toLocaleTimeString()
            }]);
        }
    } catch (e) {
        console.error("Analysis failed", e);
        setProcessLogs(prev => [...prev, {
          event_type: 'agent_status',
          step_id: 7,
          agent_id: 'analyze',
          agent_status: 'blocked',
          status: 'failed',
          message: '策略建议智能体失败：网络或服务异常。',
          timestamp: new Date().toLocaleTimeString()
        }]);
    } finally {
        setIsAnalyzing(false);
    }
  };

  const handleDownloadReport = async () => {
    if (!analysisReport) {
      alert("请先生成分析报告后再导出");
      return;
    }

    setIsDownloading(true);
    try {
      const res = await fetch('/api/v1/agent/download-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school: selectedSchool,
          major: selectedMajor,
          report_content: analysisReport
        })
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedSchool}_${selectedMajor}_培养方案改进分析报告.docx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert("下载失败，请稍后重试");
      }
    } catch (e) {
      console.error("Download failed", e);
      alert("下载失败，请稍后重试");
    } finally {
      setIsDownloading(false);
    }
  };

  // Selection Handlers (Modified for Sidebar)
  const handleSchoolClick = (school) => {
    if (expandedSchool === school) {
        // 收起当前学校
        setExpandedSchool('');
        // 如果是当前选中的学校，清空所有选择
        if (selectedSchool === school) {
            setSelectedSchool('');
            setSelectedCollege('');
            setSelectedMajor('');
            setCollegeOptions([]);
            setMajorOptions([]);
        }
    } else {
        // 展开新学校
        setExpandedSchool(school);
        // 如果切换了学校，清空之前的学院和专业选择
        if (selectedSchool !== school) {
            setSelectedSchool(school);
            setSelectedCollege('');
            setSelectedMajor('');
            setCollegeOptions([]); 
            setMajorOptions([]);
            fetch(`/api/v1/schools/${encodeURIComponent(school)}/colleges`)
                .then(res => res.json())
                .then(data => setCollegeOptions(data))
                .catch(err => console.error("Failed to fetch colleges", err));
        }
    }
  };

  const handleCollegeClick = (e, college) => {
    e.stopPropagation();
    if (expandedCollege === college) {
        // 收起当前学院
        setExpandedCollege('');
        // 如果是当前选中的学院，清空学院和专业选择
        if (selectedCollege === college) {
            setSelectedCollege('');
            setSelectedMajor('');
            setMajorOptions([]);
        }
    } else {
        // 展开新学院
        setExpandedCollege(college);
        // 如果切换了学院，清空之前的专业选择
        if (selectedCollege !== college) {
            setSelectedCollege(college);
            setSelectedMajor('');
            setMajorOptions([]);
            fetch(`/api/v1/schools/${encodeURIComponent(selectedSchool)}/colleges/${encodeURIComponent(college)}/majors`)
                .then(res => res.json())
                .then(data => setMajorOptions(data))
                .catch(err => console.error("Failed to fetch majors", err));
        }
    }
  };

  const handleMajorClick = async (e, major) => {
    e.stopPropagation();
    setSelectedMajor(major);
    // Reset states when changing major
    setGraphData(null);
    setAnalysisReport(null);
    setProcessLogs([]);
    setCurrentStep(0);
    setIsGraphReady(false);
  };

  const startGraphGeneration = async () => {
    if (!selectedMajor || !hasUploadedPlan) {
        alert("请先上传培养方案并选择学校/专业");
        return;
    }

    const major = selectedMajor;
    setLoading(true);
    setCurrentStep(1); // Start with step 1 (Data Collection)
    setGraphData(null); // Reset graph
    setAnalysisReport(null); // Reset report
    setProcessLogs([]); // Reset logs
    setIsGraphReady(false);

    try {
      // 1. Fetch Stats
      const statsRes = await fetch(`/api/v1/stats?major=${encodeURIComponent(major)}`);
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats([
          statsData.jobs,
          statsData.companies,
          statsData.reports,
          statsData.policies
        ]);
      }
      
      setCurrentStep(2); // Move to step 2 (Knowledge Extraction)

      // 2. Stream Graph
      const streamUrl = `/api/v1/agent/stream-build-graph?school=${encodeURIComponent(selectedSchool)}&college=${encodeURIComponent(selectedCollege)}&major=${encodeURIComponent(major)}`;
      const response = await fetch(streamUrl);
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            
            // Map backend step_id to frontend steps (1-4)
            // Assuming backend steps:
            // 1-2: Data Collection (already set initially)
            // 3-4: Knowledge Extraction
            // 5-6: Graph Construction
            // 7: Analysis/Final
            
            // Add to log
            if (data.message) {
                 setProcessLogs(prev => [...prev, {
                     ...data,
                     timestamp: new Date().toLocaleTimeString()
                 }]);
            }

            if (data.step_id) {
                 if (data.step_id <= 2) setCurrentStep(1);
                 else if (data.step_id <= 4) setCurrentStep(2);
                 else if (data.step_id <= 6) setCurrentStep(3);
                 else setCurrentStep(4);
            }

            if (data.data && data.step_id === 7) {
                setGraphData(data.data);
                setCurrentStep(4); // Ensure final step is reached
                setIsGraphReady(true);
                // generateReport(major, data.data); // Removed automatic generation
            }
          } catch (e) { console.error(e); }
        }
      }
    } catch (error) {
      console.error("Error:", error);
      setCurrentStep(0); // Reset on error
    } finally {
      setLoading(false);
    }
  };

  // Dimensions
  const dimensions = [
    { icon: <Activity size={14} className="text-blue-400" />, text: "培养目标" },
    { icon: <GraduationCap size={14} className="text-purple-400" />, text: "毕业要求" },
    { icon: <BookOpen size={14} className="text-indigo-400" />, text: "主干学科" },
    { icon: <Database size={14} className="text-cyan-400" />, text: "课程设置" },
    { icon: <Brain size={14} className="text-pink-400" />, text: "课程体系" },
    { icon: <Clock size={14} className="text-orange-400" />, text: "教学计划" },
    { icon: <AlertTriangle size={14} className="text-green-400" />, text: "质量评估" },
  ];

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-slate-900 text-slate-200 font-sans selection:bg-blue-500/30">
      
      {/* --- Sidebar --- */}
      <aside className="w-80 glass-panel flex flex-col border-r border-white/10 z-20">
        {/* Logo */}
        <div className="p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20 overflow-hidden">
                    <img src={logo} alt="Logo" className="w-full h-full object-cover" />
                </div>
                <div>
                    <h1 className="text-lg font-bold text-white tracking-wide">智南大模型</h1>
                    <p className="text-xs text-gray-400">培养方案智能分析系统</p>
                </div>
            </div>
        </div>

        {/* Upload Section */}
        <div className="p-4 border-b border-white/10 bg-white/5">
            {/* 上传培养方案 - 全宽按钮 */}
            <div className="relative">
              <button 
                  onClick={() => {
                    if (!selectedSchool || !selectedCollege || !selectedMajor) {
                      setShowSelectionHint(true);
                      setTimeout(() => setShowSelectionHint(false), 3000);
                      return;
                    }
                    setPlanManagerDefaultTab('upload');
                    setShowPlanManager(true);
                  }}
                  onMouseEnter={() => {
                    if (!selectedSchool || !selectedCollege || !selectedMajor) {
                      setShowSelectionHint(true);
                    }
                  }}
                  onMouseLeave={() => setShowSelectionHint(false)}
                  className={`w-full py-3 px-4 rounded-xl border flex items-center justify-center gap-3 group transition-all duration-300 relative overflow-hidden ${
                    selectedSchool && selectedCollege && selectedMajor
                      ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 hover:from-blue-600/30 hover:to-purple-600/30 border-blue-500/30 cursor-pointer'
                      : 'bg-slate-800/50 border-slate-600/30 cursor-not-allowed opacity-70'
                  }`}
              >
                  <div className={`absolute inset-0 bg-blue-500/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ${
                    selectedSchool && selectedCollege && selectedMajor ? '' : 'hidden'
                  }`}></div>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform relative z-10 ${
                    selectedSchool && selectedCollege && selectedMajor ? 'bg-blue-500/20' : 'bg-slate-600/30'
                  }`}>
                       <Upload size={18} className={`${
                         selectedSchool && selectedCollege && selectedMajor 
                           ? 'text-blue-400 group-hover:text-blue-300' 
                           : 'text-slate-500'
                       }`} />
                  </div>
                  <div className="flex flex-col items-start relative z-10">
                      <span className={`text-sm font-medium ${
                        selectedSchool && selectedCollege && selectedMajor 
                          ? 'text-blue-100 group-hover:text-white' 
                          : 'text-slate-400'
                      }`}>上传培养方案</span>
                      <span className={`text-[10px] ${
                        selectedSchool && selectedCollege && selectedMajor 
                          ? 'text-blue-300/60 group-hover:text-blue-200/80' 
                          : 'text-slate-500'
                      }`}>
                        {selectedSchool && selectedCollege && selectedMajor 
                          ? '第一步：导入本地文件' 
                          : '请先选择学校和专业'}
                      </span>
                  </div>
              </button>
              
              {/* 选择提示 */}
              <div className={`absolute left-0 right-0 top-full mt-2 z-50 transition-all duration-300 ${
                showSelectionHint 
                  ? 'opacity-100 translate-y-0 pointer-events-auto' 
                  : 'opacity-0 -translate-y-2 pointer-events-none'
              }`}>
                <div className="mx-2 p-3 rounded-xl bg-slate-800/95 backdrop-blur-xl border border-amber-500/30 shadow-2xl shadow-amber-500/10">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle size={16} className="text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-amber-100 mb-1">需要选择学校和专业</p>
                      <p className="text-xs text-amber-300/70">
                        {!selectedSchool && '1. 请先选择学校'}
                        {selectedSchool && !selectedCollege && '2. 请选择学院'}
                        {selectedSchool && selectedCollege && !selectedMajor && '3. 请选择专业'}
                      </p>
                      
                      {/* 进度指示器 */}
                      <div className="flex items-center gap-2 mt-2">
                        <div className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                          selectedSchool ? 'bg-emerald-500' : 'bg-slate-600'
                        }`} />
                        <div className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                          selectedCollege ? 'bg-emerald-500' : 'bg-slate-600'
                        }`} />
                        <div className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                          selectedMajor ? 'bg-emerald-500' : 'bg-slate-600'
                        }`} />
                      </div>
                      
                      <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                        <span>学校</span>
                        <span>学院</span>
                        <span>专业</span>
                      </div>
                    </div>
                  </div>
                </div>
                {/* 小三角箭头 */}
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800/95 border-l border-t border-amber-500/30 rotate-45"></div>
              </div>
            </div>
            
            {/* 双按钮并排 - 管理和使用 */}
            <div className="grid grid-cols-2 gap-3 mt-3">
              {/* 管理培养方案 */}
              <button 
                  onClick={() => {
                    setPlanManagerDefaultTab('list');
                    setShowPlanManager(true);
                  }}
                  className="relative py-3 px-2 rounded-xl border bg-gradient-to-b from-purple-500/10 to-pink-500/10 hover:from-purple-500/20 hover:to-pink-500/20 border-purple-500/30 cursor-pointer flex flex-col items-center gap-1.5 group transition-all duration-300 overflow-hidden"
              >
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center group-hover:scale-110 group-hover:bg-purple-500/30 transition-all duration-300">
                       <FolderOpen size={16} className="text-purple-400 group-hover:text-purple-300" />
                  </div>
                  <div className="text-center">
                      <span className="block text-xs font-medium text-gray-200 group-hover:text-white">管理方案</span>
                      <span className="block text-[9px] mt-0.5 text-purple-300/50 group-hover:text-purple-200/60">查看·删除</span>
                  </div>
                  
                  {/* 角落装饰 */}
                  <div className="absolute top-0 right-0 w-6 h-6 bg-gradient-to-bl from-purple-500/20 to-transparent rounded-bl-xl"></div>
              </button>

              {/* 使用培养方案 */}
              <button 
                  onClick={() => {
                    setPlanManagerDefaultTab('list');
                    setShowPlanManager(true);
                  }}
                  className="relative py-3 px-2 rounded-xl border bg-gradient-to-b from-emerald-500/10 to-teal-500/10 hover:from-emerald-500/20 hover:to-teal-500/20 border-emerald-500/30 cursor-pointer flex flex-col items-center gap-1.5 group transition-all duration-300 overflow-hidden"
              >
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-500/30 transition-all duration-300">
                       <Play size={16} className="text-emerald-400 group-hover:text-emerald-300 ml-0.5" />
                  </div>
                  <div className="text-center">
                      <span className="block text-xs font-medium text-gray-200 group-hover:text-white">使用方案</span>
                      <span className="block text-[9px] mt-0.5 text-emerald-300/50 group-hover:text-emerald-200/60">选择并分析</span>
                  </div>
                  
                  {/* 角落装饰 */}
                  <div className="absolute top-0 right-0 w-6 h-6 bg-gradient-to-bl from-emerald-500/20 to-transparent rounded-bl-xl"></div>
              </button>
            </div>
        </div>

        {/* Navigation Tree */}
        <div className="flex-1 overflow-y-auto py-4 scrollbar-thin">
            {/* School Level */}
            <div className="mb-2">
                <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">学校层级</div>
                {schoolOptions.map(school => (
                    <div key={school}>
                        <div 
                            className={`nav-item px-6 py-3 flex items-center justify-between ${selectedSchool === school ? 'active' : ''}`}
                            onClick={() => handleSchoolClick(school)}
                        >
                            <div className="flex items-center gap-3">
                                <School size={16} className={selectedSchool === school ? "text-blue-400" : "text-gray-400"} />
                                <span className={`text-sm ${selectedSchool === school ? "font-medium text-white" : "text-gray-300"}`}>{school}</span>
                            </div>
                            {expandedSchool === school ? <ChevronDown size={14} className="text-gray-500"/> : <ChevronRight size={14} className="text-gray-600"/>}
                        </div>

                        {/* College Level (Nested) */}
                        {expandedSchool === school && (
                            <div className="bg-black/20 pb-2">
                                <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mt-2">学院层级</div>
                                {collegeOptions.length === 0 && <div className="px-6 py-2 text-xs text-gray-500">加载中...</div>}
                                {collegeOptions.map(college => (
                                    <div key={college}>
                                        <div 
                                            className={`nav-item pl-10 pr-6 py-2 flex items-center justify-between ${selectedCollege === college ? 'bg-blue-500/10' : ''}`}
                                            onClick={(e) => handleCollegeClick(e, college)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <BookOpen size={14} className={selectedCollege === college ? "text-purple-400" : "text-gray-500"} />
                                                <span className={`text-sm ${selectedCollege === college ? "text-blue-200" : "text-gray-400"}`}>{college}</span>
                                            </div>
                                            {expandedCollege === college ? <ChevronDown size={12} className="text-gray-600"/> : <ChevronRight size={12} className="text-gray-700"/>}
                                        </div>

                                        {/* Major Level (Nested) */}
                                        {expandedCollege === college && (
                                            <div className="bg-black/20">
                                                {majorOptions.length === 0 && <div className="pl-16 py-2 text-xs text-gray-500">加载中...</div>}
                                                {majorOptions.map(major => (
                                                    <div 
                                                        key={major}
                                                        className={`nav-item pl-16 pr-6 py-2 flex items-center gap-3 ${selectedMajor === major ? 'bg-blue-500/20 border-l-2 border-blue-400' : ''}`}
                                                        onClick={(e) => handleMajorClick(e, major)}
                                                    >
                                                        <span className={`w-1.5 h-1.5 rounded-full ${selectedMajor === major ? 'bg-blue-400' : 'bg-gray-600'}`}></span>
                                                        <span className={`text-sm ${selectedMajor === major ? 'text-blue-300' : 'text-gray-400'}`}>{major}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>

        {/* Bottom Actions & Dimensions */}
        <div className="border-t border-white/10 p-4 bg-black/20">
             {/* Action Button - Moved here */}
             <div className="mb-4">
                <div className="flex gap-3">
                    <button 
                        onClick={startGraphGeneration}
                        disabled={!selectedMajor || !hasUploadedPlan || loading}
                        className={`flex-1 py-2.5 px-2 rounded-xl flex items-center justify-center gap-2 font-bold transition-all shadow-lg ${
                            loading 
                            ? 'bg-blue-600/20 text-blue-400 cursor-wait' 
                            : (!selectedMajor || !hasUploadedPlan)
                                ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/25'
                        }`}
                    >
                        {loading ? (
                            <>
                                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                <span className="text-xs">生成中...</span>
                            </>
                        ) : (
                            <>
                                <Play size={14} fill="currentColor" />
                                <span className="text-xs">开始思考</span>
                            </>
                        )}
                    </button>

                    <button 
                        onClick={() => {
                            if(window.confirm("确定要重置当前分析结果吗？")) {
                                setGraphData(null);
                                setAnalysisReport(null);
                                setProcessLogs([]);
                                setCurrentStep(0);
                                setIsGraphReady(false);
                            }
                        }}
                        disabled={!selectedMajor || !hasUploadedPlan || loading}
                        className={`flex-1 py-2.5 px-2 rounded-xl flex items-center justify-center gap-2 font-bold transition-all shadow-lg border border-white/10 ${
                            (!selectedMajor || !hasUploadedPlan || loading)
                                ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                                : 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white'
                        }`}
                    >
                        <RefreshCw size={14} />
                        <span className="text-xs">重置</span>
                    </button>
                </div>
                 
                 {/* Status Indicator */}
                 <div className="mt-2 flex items-center justify-center gap-2 text-xs text-gray-400">
                    <span className={`w-2 h-2 rounded-full ${loading ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></span>
                    {loading ? '正在构建图谱...' : '系统就绪'}
                 </div>
             </div>

            <div className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">对标维度</div>
            <div className="grid grid-cols-2 gap-2">
                {dimensions.map((d, i) => (
                    <div key={i} className="dimension-tag px-2 py-1.5 rounded-lg flex items-center gap-2 cursor-pointer group bg-white/5 hover:bg-white/10 border border-white/5 transition-colors">
                        {d.icon}
                        <span className="text-[10px] font-medium text-gray-300 group-hover:text-white transition-colors truncate">{d.text}</span>
                    </div>
                ))}
            </div>
        </div>
      </aside>

      {/* --- Main Content --- */}
      <main className="flex-1 flex flex-col overflow-hidden relative z-10">
         {/* Background Decoration */}
         <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none"></div>
         <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none"></div>

        {/* Header */}
        <header className="glass-panel border-b border-white/10 px-8 py-4 flex items-center justify-between z-20">
            <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    {selectedSchool || '请选择学校'} 
                    {selectedCollege && <span className="text-gray-500">/</span>} 
                    {selectedCollege}
                    {selectedMajor && <span className="text-gray-500">/</span>}
                    <span className="text-blue-400">{selectedMajor}</span>
                </h2>
                {selectedMajor && (
                    <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs border border-blue-500/30">2024版培养方案</span>
                )}
            </div>
            <div className="flex items-center gap-4">
                <button 
                    onClick={handleDownloadReport}
                    disabled={isDownloading}
                    className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-gray-300 transition-colors border border-white/10 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Download size={14} className={`mr-2 ${isDownloading ? 'animate-bounce' : ''}`}/> 
                    {isDownloading ? '导出中...' : '导出报告'}
                </button>
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                    <User size={14} className="text-white" />
                </div>
            </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-8 scrollbar-thin">
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 h-full min-h-[800px]">
                
                {/* Left Column (7/12) */}
                <div className="xl:col-span-7 min-w-0 flex flex-col gap-6">
                    {/* Process Flow */}
                    <div className="glass-card rounded-2xl p-6 h-[500px] overflow-hidden">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <Activity className="text-purple-400" size={18} />
                                多智能体协作
                            </h3>
                        </div>
                        <ProcessFlow currentStep={currentStep} logs={processLogs} />
                    </div>

                    {/* Mind Map Agent */}
                    <div className="glass-card rounded-2xl p-6 flex-1 flex flex-col min-h-[400px]">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <Projector className="text-blue-400" size={18}/>
                                知识、素质、能力图谱
                            </h3>
                            <div className="flex items-center gap-2">
                                {loading && (
                                    <button 
                                        disabled
                                        className="py-1.5 px-3 rounded-lg flex items-center justify-center gap-2 font-medium transition-all shadow-lg bg-blue-600/20 text-blue-400 cursor-wait text-xs"
                                    >
                                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>正在生成...</span>
                                    </button>
                                )}
                                {graphData && !loading && (
                                    <>
                                        <button 
                                            onClick={() => setShowGraphModal(true)}
                                            className="py-1.5 px-3 rounded-lg flex items-center justify-center gap-2 font-medium transition-all shadow-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/25 text-xs"
                                        >
                                            <Maximize2 size={12} />
                                            <span>查看详情</span>
                                        </button>
                                        <button 
                                            onClick={startGraphGeneration}
                                            className="py-1.5 px-3 rounded-lg flex items-center justify-center gap-2 font-medium transition-all shadow-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 text-xs"
                                        >
                                            <RefreshCw size={12} />
                                            <span>重新生成</span>
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="flex-1 relative bg-black/20 rounded-xl border border-white/5 overflow-hidden">
                             {/* Force Graph Container */}
                             {graphData ? (
                                 <GraphContainer data={graphData} />
                             ) : (
                                 <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">
                                     等待数据加载...
                                 </div>
                             )}
                        </div>
                        <div className="mt-4 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                            {['知识图谱', '能力图谱', '素质图谱'].map(t => (
                                <button key={t} className="px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 text-xs border border-white/10 whitespace-nowrap transition-colors">
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column (5/12) */}
                <div className="xl:col-span-5 min-w-0 flex flex-col gap-6">
                    {/* Top: Process Log (New) - Fill remaining height */}
                    <div className="glass-card rounded-2xl p-6 flex-1 min-h-[200px]">
                        <ProcessLog logs={processLogs} currentStep={currentStep} />
                    </div>

                    {/* Bottom: Analysis Report - Fixed Height */}
                    <div className="glass-card rounded-2xl p-6 h-[500px] w-full">
                        <AnalysisReport 
                            report={analysisReport} 
                            loading={isAnalyzing}
                            onRefresh={() => graphData && generateReport(selectedMajor, graphData)}
                            actionLabel={analysisReport ? "重新生成" : "生成分析报告"}
                            disabled={!graphData}
                        />
                    </div>
                </div>

            </div>
        </div>
      </main>

      {/* Large Graph Modal */}
      {showGraphModal && graphData && (
        <LargeGraphModal 
            data={graphData} 
            onClose={() => setShowGraphModal(false)}
        />
      )}

      {/* Training Plan Manager */}
      <TrainingPlanManager
        isOpen={showPlanManager}
        onClose={() => setShowPlanManager(false)}
        schoolOptions={schoolOptions}
        selectedSchool={selectedSchool}
        selectedCollege={selectedCollege}
        selectedMajor={selectedMajor}
        defaultTab={planManagerDefaultTab}
        onSelectPlan={(plan) => {
          setSelectedPlan(plan);
          setHasUploadedPlan(true);
          setUploadedPlanContext({
            fileName: plan.original_filename,
            content: plan.extracted_content
          });
          // 自动选择学校-专业
          if (plan.school) setSelectedSchool(plan.school);
          if (plan.college) setSelectedCollege(plan.college);
          if (plan.major) setSelectedMajor(plan.major);
        }}
      />
    </div>
  );
}

export default App;
