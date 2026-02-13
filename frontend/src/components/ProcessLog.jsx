import React, { useMemo } from 'react';
import {
  Bot,
  Database,
  Briefcase,
  Award,
  TrendingUp,
  FileText,
  CheckSquare,
  Network,
  Brain,
  Zap,
  UserCheck,
  Layout,
  Lightbulb
} from 'lucide-react';

const ProcessLog = ({ logs = [], currentStep = 0 }) => {
  const agentNodes = [
    { id: 'start', label: '数据要素', agent: '调度智能体', icon: Database, runningAction: '正在创建采集任务与全局参数...' },
    { id: 'src-1', label: '海量岗位', agent: '岗位采集智能体', icon: Briefcase, runningAction: '正在抓取岗位描述与任职要求...' },
    { id: 'src-2', label: '高质量岗位', agent: '质量筛选智能体', icon: Award, runningAction: '正在筛选重点企业与优质岗位...' },
    { id: 'src-3', label: '行业发展', agent: '行业分析智能体', icon: TrendingUp, runningAction: '正在搜索行业发展文件...' },
    { id: 'src-4', label: '政策文件', agent: '政策解析智能体', icon: FileText, runningAction: '正在搜索政策文件...' },
    { id: 'verify', label: '验证汇总', agent: '校验汇总智能体', icon: CheckSquare, runningAction: '正在汇总多源数据...' },
    { id: 'build', label: '构建图谱', agent: '图谱构建智能体', icon: Network, runningAction: '正在构建实体关系网络...' },
    { id: 'graph-1', label: '知识图谱', agent: '知识建模智能体', icon: Brain, runningAction: '正在构建知识体系结构...' },
    { id: 'graph-2', label: '能力图谱', agent: '能力建模智能体', icon: Zap, runningAction: '正在映射能力与技能链路...' },
    { id: 'graph-3', label: '素质图谱', agent: '素质建模智能体', icon: UserCheck, runningAction: '正在生成素质关联网络...' },
    { id: 'end', label: '构建展示页面', agent: '可视化智能体', icon: Layout, runningAction: '正在渲染最终展示数据...' },
    { id: 'analyze', label: '改进建议', agent: '策略建议智能体', icon: Lightbulb, runningAction: '正在生成培养方案改进建议...' }
  ];

  const agentLogs = useMemo(
    () => logs.filter((log) => log?.event_type === 'agent_status' && log?.agent_id),
    [logs]
  );

  const latestAgentRuntime = useMemo(() => {
    const map = {};
    for (const log of agentLogs) {
      map[log.agent_id] = {
        status: log.agent_status || 'idle',
        message: log.message || ''
      };
    }
    return map;
  }, [agentLogs]);

  const runningAgent = useMemo(() => {
    for (let i = agentLogs.length - 1; i >= 0; i -= 1) {
      if (agentLogs[i]?.agent_status === 'running') {
        return agentNodes.find((n) => n.id === agentLogs[i].agent_id);
      }
    }
    return null;
  }, [agentLogs]);

  const agentProgress = useMemo(() => {
    const doneCount = agentNodes.filter((n) => {
      const st = latestAgentRuntime[n.id]?.status;
      return st === 'done' || st === 'blocked';
    }).length;
    return Math.round((doneCount / agentNodes.length) * 100);
  }, [agentNodes, latestAgentRuntime]);

  const hasAgentEvents = agentLogs.length > 0;

  return (
    <div className="h-full rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/85 to-black/45 backdrop-blur-md p-3.5 overflow-hidden flex flex-col">
      <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center">
            <Bot size={14} className="text-cyan-300" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-white truncate">智能体运行面板</div>
            <div className="text-[10px] text-slate-400 truncate">
              {runningAgent ? `${runningAgent.agent} 正在执行` : (hasAgentEvents ? '等待下一阶段任务' : '等待任务启动')}
            </div>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
          Agent 进度: {agentProgress}%
        </span>
      </div>

      <div className="mt-3 mb-3 px-1">
        <div className="h-2 bg-gray-700/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${agentProgress}%` }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 space-y-2">
        {agentNodes.map((node) => {
          const runtime = latestAgentRuntime[node.id] || {};
          const status = runtime.status || 'idle';
          const Icon = node.icon;

          const statusClass =
            status === 'done'
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              : status === 'running'
              ? 'bg-cyan-500/15 text-cyan-200 border-cyan-500/30'
              : status === 'blocked'
              ? 'bg-rose-500/10 text-rose-200 border-rose-500/25'
              : status === 'waiting'
              ? 'bg-amber-500/10 text-amber-200 border-amber-500/25'
              : 'bg-slate-700/25 text-slate-400 border-slate-600/35';

          const statusLabel =
            status === 'done'
              ? '完成'
              : status === 'running'
              ? '执行中'
              : status === 'blocked'
              ? '缺少文件'
              : status === 'waiting'
              ? '排队'
              : '待命';

          const message = runtime.message || (status === 'running' ? node.runningAction : '等待上游阶段完成...');

          return (
            <div key={node.id} className={`rounded-xl border px-2.5 py-2 ${statusClass}`}>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-black/25 border border-white/10 flex items-center justify-center">
                  <Icon size={11} />
                </div>
                <span className="text-[11px] font-medium truncate">{node.agent}</span>
                <span className={`ml-auto text-[9px] ${status === 'running' ? 'px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-200 border border-cyan-500/30' : 'opacity-80'}`}>
                  {statusLabel}
                </span>
              </div>
              <div className="mt-1.5 text-[10px] leading-4 opacity-95">{message}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProcessLog;
