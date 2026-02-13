import React, { useEffect, useMemo, useRef, useState } from 'react';
import { 
  Database, FileText, CheckCircle2, 
  Network, Activity,
  Briefcase, Award, TrendingUp, CheckSquare,
  Brain, Zap, UserCheck, Layout, Lightbulb
} from 'lucide-react';

const ProcessFlow = ({ currentStep = 0, logs = [] }) => {
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Custom Node Configuration based on user's flowchart
  const nodes = [
    // Step 1: Start / Data Elements
    { id: 'start', x: 5, y: 50, label: "数据要素", icon: Database, color: "blue", stepThreshold: 1, description: "初始化数据采集任务，确立数据要素基础", agent: "调度智能体", runningAction: "正在创建采集任务与全局参数..." },

    // Step 1.5: Data Sources (Parallel)
    { id: 'src-1', x: 20, y: 20, label: "海量岗位", icon: Briefcase, color: "blue", stepThreshold: 1, description: "采集全网海量招聘岗位数据", agent: "岗位采集智能体", runningAction: "正在抓取岗位描述与任职要求..." },
    { id: 'src-2', x: 20, y: 40, label: "高质量岗位", icon: Award, color: "blue", stepThreshold: 1, description: "筛选重点企业高质量岗位需求", agent: "质量筛选智能体", runningAction: "正在筛选重点企业与优质岗位..." },
    { id: 'src-3', x: 20, y: 60, label: "行业发展", icon: TrendingUp, color: "blue", stepThreshold: 1, description: "分析行业发展趋势报告", agent: "行业分析智能体", runningAction: "正在提炼行业趋势关键词..." },
    { id: 'src-4', x: 20, y: 80, label: "政策文件", icon: FileText, color: "blue", stepThreshold: 1, description: "解析国家及地方相关政策文件", agent: "政策解析智能体", runningAction: "正在解析政策导向与能力要求..." },

    // Step 2: Verification & Summary
    { id: 'verify', x: 35, y: 50, label: "验证汇总", icon: CheckSquare, color: "purple", stepThreshold: 2, description: "多源数据交叉验证与清洗汇总", agent: "校验汇总智能体", runningAction: "正在去重、清洗并构建统一数据集..." },

    // Step 3: Graph Construction
    { id: 'build', x: 50, y: 50, label: "构建图谱", icon: Network, color: "orange", stepThreshold: 3, description: "基于汇总数据构建实体关系网络", agent: "图谱构建智能体", runningAction: "正在抽取实体并生成关系边..." },

    // Step 3.5: Graph Types (Parallel)
    { id: 'graph-1', x: 65, y: 30, label: "知识图谱", icon: Brain, color: "orange", stepThreshold: 3, description: "构建专业知识体系图谱", agent: "知识建模智能体", runningAction: "正在组织课程-技能知识结构..." },
    { id: 'graph-2', x: 65, y: 50, label: "能力图谱", icon: Zap, color: "orange", stepThreshold: 3, description: "构建岗位核心能力图谱", agent: "能力建模智能体", runningAction: "正在映射岗位能力与技能链路..." },
    { id: 'graph-3', x: 65, y: 70, label: "素质图谱", icon: UserCheck, color: "orange", stepThreshold: 3, description: "构建综合素质要求图谱", agent: "素质建模智能体", runningAction: "正在生成素质要求与能力关联..." },

    // Step 4: Display Page
    { id: 'end', x: 80, y: 50, label: "构建展示页面", icon: Layout, color: "green", stepThreshold: 4, description: "生成可视化交互展示页面", agent: "可视化智能体", runningAction: "正在渲染图谱与交互布局..." },

    // Step 5: Analysis & Suggestions (New)
    { id: 'analyze', x: 95, y: 50, label: "改进建议", icon: Lightbulb, color: "green", stepThreshold: 5, description: "生成培养方案分析与改进建议", agent: "策略建议智能体", runningAction: "正在生成培养方案优化建议..." },
  ];

  const [runningAgentPointer, setRunningAgentPointer] = useState(0);
  const [tick, setTick] = useState(0);
  const compactMode = containerWidth > 0 && containerWidth < 520;

  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };
    update();
    const obs = new ResizeObserver(update);
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setTick((v) => v + 1);
    }, 1500);
    return () => clearInterval(timer);
  }, []);

  const runningCandidates = useMemo(
    () => nodes.filter((n) => n.stepThreshold === currentStep),
    [nodes, currentStep]
  );

  const agentRuntimeMap = useMemo(() => {
    const map = {};
    for (const log of logs) {
      if (log?.event_type !== 'agent_status' || !log?.agent_id) continue;
      map[log.agent_id] = {
        status: log.agent_status || 'idle',
        message: log.message || ''
      };
    }
    return map;
  }, [logs]);

  useEffect(() => {
    if (!runningCandidates.length) {
      setRunningAgentPointer(0);
      return;
    }
    setRunningAgentPointer(tick % runningCandidates.length);
  }, [tick, runningCandidates.length]);

  const runningNodeIds = useMemo(() => {
    if (!runningCandidates.length) return new Set();
    if (runningCandidates.length === 1) return new Set([runningCandidates[0].id]);
    const active = runningCandidates[runningAgentPointer];
    return new Set(active ? [active.id] : []);
  }, [runningCandidates, runningAgentPointer]);

  // Manual Edge Definitions to match the flowchart
  const edges = [
    // One to Many: Start -> Sources
    { from: 'start', to: 'src-1' },
    { from: 'start', to: 'src-2' },
    { from: 'start', to: 'src-3' },
    { from: 'start', to: 'src-4' },

    // Many to One: Sources -> Verify
    { from: 'src-1', to: 'verify' },
    { from: 'src-2', to: 'verify' },
    { from: 'src-3', to: 'verify' },
    { from: 'src-4', to: 'verify' },

    // Linear: Verify -> Build
    { from: 'verify', to: 'build' },

    // One to Many: Build -> Graphs
    { from: 'build', to: 'graph-1' },
    { from: 'build', to: 'graph-2' },
    { from: 'build', to: 'graph-3' },

    // Many to One: Graphs -> End
    { from: 'graph-1', to: 'end' },
    { from: 'graph-2', to: 'end' },
    { from: 'graph-3', to: 'end' },

    // Linear: End -> Analyze
    { from: 'end', to: 'analyze' },
  ];

  const getNode = (id) => nodes.find(n => n.id === id);

  const getRenderPosition = (node) => {
    if (!compactMode) return { x: node.x, y: node.y };
    // Remap coordinates to leave safer margins on narrow cards.
    const mappedX = 8 + ((node.x - 5) / 90) * 84; // 5..95 -> 8..92
    const mappedY = 12 + ((node.y - 20) / 60) * 74; // 20..80 -> 12..86
    return { x: mappedX, y: mappedY };
  };

  const getPath = (start, end) => {
    const s = getRenderPosition(start);
    const e = getRenderPosition(end);
    const sX = s.x;
    const sY = s.y;
    const eX = e.x;
    const eY = e.y;
    const midX = (sX + eX) / 2;
    return `M ${sX} ${sY} C ${midX} ${sY}, ${midX} ${eY}, ${eX} ${eY}`;
  };

  const getNodeRuntimeStatus = (node) => {
    const runtime = agentRuntimeMap[node.id];
    if (runtime) {
      if (runtime.status === 'done') return 'done';
      if (runtime.status === 'running') return 'running';
      if (runtime.status === 'blocked') return 'blocked';
      if (runtime.status === 'waiting') return 'waiting';
    }
    if (currentStep <= 0) return 'idle';
    if (currentStep > node.stepThreshold) return 'done';
    if (currentStep < node.stepThreshold) return 'idle';
    return runningNodeIds.has(node.id) ? 'running' : 'waiting';
  };

  const getNodeRuntimeText = (node) => {
    const status = getNodeRuntimeStatus(node);
    const runtime = agentRuntimeMap[node.id];
    if (runtime?.message) return runtime.message;
    if (status === 'done') return '已完成';
    if (status === 'running') return node.runningAction;
    if (status === 'blocked') return '未发现可用文件，等待补充数据。';
    if (status === 'waiting') return '等待并行智能体调度...';
    return '等待上游阶段完成...';
  };

  return (
    <div ref={containerRef} className="w-full h-full min-h-[320px] max-w-full select-none overflow-hidden">
      <div className="relative h-full min-h-[320px] rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/70 to-slate-800/40 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-10 border-b border-white/10 bg-black/20 backdrop-blur-sm flex items-center justify-between px-3 z-20">
          <div className="flex items-center gap-2 text-[11px] text-slate-200">
            <Activity size={13} className="text-cyan-400" />
            <span className="truncate max-w-[120px] sm:max-w-none">多智能体流程网络</span>
          </div>
          <div className="text-[10px] text-slate-400 truncate max-w-[120px] sm:max-w-none">
            当前阶段: Step {currentStep || 0}
          </div>
        </div>

        {/* SVG Layer for Edges */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none overflow-visible pt-10"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <defs>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="0.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <marker id="arrowhead-sm" markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto">
              <path d="M0,0 L4,2 L0,4" fill="none" stroke="#64748b" strokeWidth="0.5" />
            </marker>
          </defs>

          {edges.map((edge) => {
            const startNode = getNode(edge.from);
            const endNode = getNode(edge.to);
            const isActive = currentStep >= endNode.stepThreshold;
            const isCompleted = currentStep > endNode.stepThreshold;

            return (
              <g key={`${edge.from}-${edge.to}`}>
                <path
                  d={getPath(startNode, endNode)}
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                  markerEnd="url(#arrowhead-sm)"
                  style={{ opacity: 0.25 }}
                />
                {isActive && (
                  <path
                    d={getPath(startNode, endNode)}
                    fill="none"
                    stroke={isCompleted ? "#3b82f6" : "#38bdf8"}
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    className="animate-flow-fast"
                    vectorEffect="non-scaling-stroke"
                    style={{
                      filter: 'url(#glow)',
                      opacity: isCompleted ? 0.35 : 0.9
                    }}
                  />
                )}
              </g>
            );
          })}
        </svg>

        {/* Nodes Layer */}
        {nodes.map((node) => {
          const isActive = currentStep >= node.stepThreshold;
          const runtimeStatus = getNodeRuntimeStatus(node);
          const isRunning = runtimeStatus === 'running';
          const pos = getRenderPosition(node);

          const colorMap = {
            blue: 'text-blue-400 border-blue-500/50 shadow-blue-500/30',
            purple: 'text-purple-400 border-purple-500/50 shadow-purple-500/30',
            orange: 'text-orange-400 border-orange-500/50 shadow-orange-500/30',
            green: 'text-green-400 border-green-500/50 shadow-green-500/30',
          };

          const baseStyle = 'w-9 h-9 rounded-xl flex items-center justify-center border transition-all duration-500 z-10 bg-slate-900';
          const activeStyle = isActive
            ? `${colorMap[node.color]} scale-110 shadow-[0_0_12px_rgba(0,0,0,0.45)]`
            : 'border-slate-700 text-slate-600 scale-100 opacity-60 grayscale';

          const delay = node.x * 10;

          return (
            <div
              key={node.id}
              className="absolute flex flex-col items-center gap-1.5 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500 group cursor-help z-10 hover:z-50"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transitionDelay: `${delay}ms`
              }}
            >
              <div className={`absolute bottom-full mb-2 ${compactMode ? 'w-40' : 'w-52'} p-3 bg-slate-900/95 backdrop-blur-xl border border-slate-700/60 rounded-xl text-xs text-slate-300 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none translate-y-2 group-hover:translate-y-0 shadow-2xl shadow-black/50 z-50`}>
                <div className="font-semibold text-blue-300 mb-1 flex items-center gap-2">
                  <node.icon size={12} />
                  {node.label}
                </div>
                <div className="leading-relaxed text-slate-400">{node.description}</div>
                <div className={`mt-2 text-[10px] ${isRunning ? 'text-cyan-300' : 'text-slate-500'}`}>
                  {getNodeRuntimeText(node)}
                </div>
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-4 border-transparent border-t-slate-900/95"></div>
              </div>

              <div className={`text-[10px] font-medium tracking-tight transition-colors duration-300 ${compactMode ? 'max-w-[66px] truncate text-center' : 'whitespace-nowrap'} ${isActive ? 'text-blue-100' : 'text-slate-600'}`}>
                {node.label}
              </div>

              <div className={`${baseStyle} ${activeStyle} relative`}>
                <node.icon size={14} strokeWidth={2.5} />
                {isRunning && (
                  <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-cyan-300 rounded-full animate-pulse shadow-lg shadow-cyan-400/60"></div>
                )}
              </div>

              {!compactMode && (
              <div className={`text-[9px] whitespace-nowrap transition-colors ${
                runtimeStatus === 'done'
                  ? 'text-emerald-400'
                  : runtimeStatus === 'running'
                  ? 'text-cyan-300'
                  : runtimeStatus === 'blocked'
                  ? 'text-rose-300'
                  : runtimeStatus === 'waiting'
                  ? 'text-amber-300/80'
                  : 'text-slate-600'
              }`}>
                {runtimeStatus === 'done'
                  ? '完成'
                  : runtimeStatus === 'running'
                  ? '执行中'
                : runtimeStatus === 'blocked'
                ? '缺少文件'
                  : runtimeStatus === 'waiting'
                  ? '等待调度'
                  : '待命'}
              </div>
              )}
            </div>
          );
        })}
      </div>

      <style jsx>{`
        @keyframes flow-fast {
          from { stroke-dashoffset: 16; }
          to { stroke-dashoffset: 0; }
        }
        .animate-flow-fast {
          animation: flow-fast 1s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default ProcessFlow;
