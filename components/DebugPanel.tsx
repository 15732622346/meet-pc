'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRoomContext, useParticipants, useLocalParticipant } from '@livekit/components-react';
import { isUserDisabled } from '../lib/token-utils';

interface DebugPanelProps {
  onClose?: () => void;
}

export function DebugPanel({ onClose }: DebugPanelProps) {
  const room = useRoomContext();
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [kickLogs, setKickLogs] = useState<string[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const prevRole = useRef<any>(null);
  const prevMicStatus = useRef<any>(null);
  const prevDisplayStatus = useRef<any>(null);
  const prevLastAction = useRef<any>(null);
  const [eventListenerStatus, setEventListenerStatus] = useState('未设置');
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null);
  
  // 获取选中参与者的详细信息
  const selectedParticipantInfo = React.useMemo(() => {
    if (!selectedParticipant) return null;
    
    const participant = participants.find(p => p.identity === selectedParticipant);
    if (!participant) return null;
    
    const attributes = participant.attributes || {};
    return {
      name: participant.name,
      identity: participant.identity,
      attributes: attributes,
      isDisabled: isUserDisabled(attributes),
      attributesRaw: JSON.stringify(attributes, null, 2)
    };
  }, [selectedParticipant, participants]);
  
  // 手动触发调试信息弹窗
  const showDebugAlert = () => {
    if (!selectedParticipantInfo) return;
    
    const debugInfo = `
调试信息 - ${selectedParticipantInfo.name}:
- 参与者ID: ${selectedParticipantInfo.identity}
- 属性: ${selectedParticipantInfo.attributesRaw}
- isDisabled: ${selectedParticipantInfo.isDisabled}
- isDisabledUser值: ${selectedParticipantInfo.attributes.isDisabledUser}
- 值类型: ${typeof selectedParticipantInfo.attributes.isDisabledUser}
    `;
    
    alert(debugInfo);
  };

  // 添加踢下麦日志 - 使用"踢踢踢"前缀
  const addKickLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setKickLogs(prev => [`踢踢踢 [${timestamp}] ${message}`, ...prev].slice(0, 30));
  };

  // 🎯 增强：监听所有相关的状态变化
  useEffect(() => {
    if (!localParticipant) {
      addKickLog(`❌ localParticipant 不存在`);
      return;
    }

    addKickLog(`✅ 开始设置事件监听器`);
    setEventListenerStatus('已设置');

    const handleAttributesChanged = () => {
      addKickLog(`🔥 attributesChanged 事件被触发!`);
      const attrs = localParticipant.attributes;
      
      addKickLog(`📊 当前所有attributes: ${JSON.stringify(attrs)}`);
      
      // 监控用户禁用状态
      if (attrs.isDisabledUser === 'true') {
        addKickLog(`🚫 用户已被禁用! isDisabledUser = ${attrs.isDisabledUser}`);
      }
      
      // 🚨 新增：状态一致性检查
      const checkStateConsistency = () => {
        const { last_action, mic_status, display_status, isDisabledUser } = attrs;
        
        // 检查被批准上麦但没有实际上麦的情况
        if (last_action === 'approved' && mic_status === 'off_mic') {
          addKickLog(`🚨🚨🚨 发现状态不一致问题！`);
          addKickLog(`  ├─ 问题描述: 用户被批准上麦但麦克风状态仍是off_mic`);
          addKickLog(`  ├─ last_action: "${last_action}" (应该是approved)`);
          addKickLog(`  ├─ mic_status: "${mic_status}" (应该是on_mic)`);
          addKickLog(`  ├─ display_status: "${display_status}" (应该是visible)`);
          addKickLog(`  └─ 🔧 这可能是批准操作没有完全执行成功！`);
        }
        
        // 检查被踢下麦但状态不正确的情况
        if (last_action === 'kicked' && mic_status !== 'off_mic') {
          addKickLog(`🚨🚨🚨 发现踢下麦状态不一致！`);
          addKickLog(`  ├─ last_action: "${last_action}" (是kicked)`);
          addKickLog(`  ├─ mic_status: "${mic_status}" (应该是off_mic)`);
          addKickLog(`  └─ 🔧 踢下麦操作可能没有完全执行！`);
        }
        
        // 检查正常状态
        if (last_action === 'approved' && mic_status === 'on_mic') {
          addKickLog(`✅ 状态一致: 用户正确上麦`);
        }
        
        if (last_action === 'kicked' && mic_status === 'off_mic') {
          addKickLog(`✅ 状态一致: 用户正确下麦`);
        }
      };
      
      // 执行状态一致性检查
      checkStateConsistency();
      
      // 🔥 重点关注：被踢下麦的操作
      if (attrs.last_action === 'kicked') {
        addKickLog(`🚨 检测到被踢下麦操作!`);
        addKickLog(`  ├─ mic_status: ${attrs.mic_status}`);
        addKickLog(`  ├─ display_status: ${attrs.display_status}`);
        addKickLog(`  ├─ role: "${attrs.role}" (类型: ${typeof attrs.role})`);
        addKickLog(`  ├─ operator_id: ${attrs.operator_id}`);
        addKickLog(`  └─ kick_time: ${attrs.kick_time}`);
        
        // 检查role是否丢失
        if (attrs.role === undefined) {
          addKickLog(`🚨 严重问题: role字段丢失!`);
        } else if (attrs.role === '0') {
          addKickLog(`🚨 严重问题: role被设为游客(0)!`);
        } else {
          addKickLog(`✅ role字段保持正常: "${attrs.role}"`);
        }
      }
      
      // 🔍 监听role字段的任何变化
      if (prevRole.current !== null && prevRole.current !== attrs.role) {
        addKickLog(`🔄 Role字段变化: "${prevRole.current}" → "${attrs.role}"`);
      }
      prevRole.current = attrs.role;
      
      // 🔍 监听麦位状态变化
      if (prevMicStatus.current !== null && prevMicStatus.current !== attrs.mic_status) {
        addKickLog(`🎤 麦位状态变化: "${prevMicStatus.current}" → "${attrs.mic_status}"`);
      }
      prevMicStatus.current = attrs.mic_status;

      // 🔍 监听显示状态变化
      if (prevDisplayStatus.current !== null && prevDisplayStatus.current !== attrs.display_status) {
        addKickLog(`👁️ 显示状态变化: "${prevDisplayStatus.current}" → "${attrs.display_status}"`);
      }
      prevDisplayStatus.current = attrs.display_status;

      // 🔍 监听最后操作变化
      if (prevLastAction.current !== null && prevLastAction.current !== attrs.last_action) {
        addKickLog(`⚡ 最后操作变化: "${prevLastAction.current}" → "${attrs.last_action}"`);
      }
      prevLastAction.current = attrs.last_action;
    };

    // 🎯 增强：添加多种事件监听
    const handleParticipantMetadataChanged = () => {
      addKickLog(`📝 participantMetadataChanged 事件触发`);
    };

    // 添加所有事件监听器
    localParticipant.on('attributesChanged', handleAttributesChanged);
    localParticipant.on('participantMetadataChanged', handleParticipantMetadataChanged);
    
    // 初始化时记录当前状态
    const attrs = localParticipant.attributes;
    addKickLog(`🔍 初始状态: role="${attrs.role}", mic_status="${attrs.mic_status}"`);
    addKickLog(`🔍 初始完整attributes: ${JSON.stringify(attrs)}`);
    
    // 🚨 初始化时也进行状态一致性检查
    const { last_action, mic_status, display_status } = attrs;
    if (last_action === 'approved' && mic_status === 'off_mic') {
      addKickLog(`🚨🚨🚨 初始状态检查: 发现状态不一致！`);
      addKickLog(`  ├─ 用户被批准上麦但麦克风状态是off_mic`);
      addKickLog(`  ├─ 这可能是批准操作没有完全执行成功的问题`);
      addKickLog(`  └─ 建议: 主持人重新批准一次或用户重新申请`);
    }
    
    // 设置初始值
    prevRole.current = attrs.role;
    prevMicStatus.current = attrs.mic_status;
    prevDisplayStatus.current = attrs.display_status;
    prevLastAction.current = attrs.last_action;
    
    return () => {
      addKickLog(`🧹 清理事件监听器`);
      localParticipant.off('attributesChanged', handleAttributesChanged);
      localParticipant.off('participantMetadataChanged', handleParticipantMetadataChanged);
      setEventListenerStatus('已清理');
    };
  }, [localParticipant]);

  // 🎯 新增：定时检查状态变化（备用方案）
  useEffect(() => {
    const interval = setInterval(() => {
      if (!localParticipant) return;
      
      const attrs = localParticipant.attributes;
      
      // 检查是否有变化但事件未触发
      if (attrs.role !== prevRole.current) {
        addKickLog(`⏰ 定时检查发现Role变化: "${prevRole.current}" → "${attrs.role}" (事件未触发)`);
        prevRole.current = attrs.role;
      }
      
      if (attrs.mic_status !== prevMicStatus.current) {
        addKickLog(`⏰ 定时检查发现麦位状态变化: "${prevMicStatus.current}" → "${attrs.mic_status}" (事件未触发)`);
        prevMicStatus.current = attrs.mic_status;
      }

      if (attrs.display_status !== prevDisplayStatus.current) {
        addKickLog(`⏰ 定时检查发现显示状态变化: "${prevDisplayStatus.current}" → "${attrs.display_status}" (事件未触发)`);
        prevDisplayStatus.current = attrs.display_status;
      }

      if (attrs.last_action !== prevLastAction.current) {
        addKickLog(`⏰ 定时检查发现最后操作变化: "${prevLastAction.current}" → "${attrs.last_action}" (事件未触发)`);
        prevLastAction.current = attrs.last_action;
      }
    }, 2000); // 每2秒检查一次

    return () => clearInterval(interval);
  }, [localParticipant]);

  // 拖拽处理
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.debug-content')) return;
    
    setIsDragging(true);
    const rect = panelRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      setPosition({
        x: Math.max(0, Math.min(window.innerWidth - 400, e.clientX - dragOffset.x)),
        y: Math.max(0, Math.min(window.innerHeight - 300, e.clientY - dragOffset.y))
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  return (
    <div
      ref={panelRef}
      className="debug-panel"
      style={{
        position: 'fixed',
        top: `${position.y}px`,
        left: `${position.x}px`,
        width: '400px',
        background: 'rgba(0, 0, 0, 0.8)',
        color: '#fff',
        borderRadius: '8px',
        zIndex: 10000,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
        fontFamily: 'monospace',
        fontSize: '12px',
        overflow: 'hidden',
        resize: 'both',
        maxHeight: '80vh',
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="debug-header" style={{
        padding: '8px',
        background: '#333',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        cursor: 'grab'
      }}>
        <span>🛠️ 踢下麦状态追踪调试（增强版）</span>
        <div>
          <button onClick={() => setIsMinimized(!isMinimized)} style={{
            background: 'transparent',
            border: 'none',
            color: '#fff',
            marginRight: '8px',
            cursor: 'pointer'
          }}>
            {isMinimized ? '📋' : '🗗'}
          </button>
          <button onClick={onClose} style={{
            background: 'transparent',
            border: 'none',
            color: '#fff',
            cursor: 'pointer'
          }}>✖</button>
        </div>
      </div>
      
      {!isMinimized && (
        <div className="debug-content" style={{ padding: '8px', maxHeight: '60vh', overflowY: 'auto' }}>
          <h4 style={{ margin: '4px 0', color: '#4a9eff' }}>📋 当前状态</h4>
          <div style={{ background: '#222', padding: '8px', borderRadius: '4px', marginBottom: '8px' }}>
            <p style={{ margin: '2px 0' }}>👤 用户: {localParticipant?.name}</p>
            <p style={{ margin: '2px 0' }}>🔷 角色: "{localParticipant?.attributes?.role}" (string)</p>
            <p style={{ margin: '2px 0' }}>🎤 麦位: {localParticipant?.attributes?.mic_status}</p>
            <p style={{ margin: '2px 0' }}>👁️ 显示: {localParticipant?.attributes?.display_status}</p>
            <p style={{ margin: '2px 0' }}>⚡ 用户禁用: {localParticipant?.attributes?.isDisabledUser === 'true' ? '已禁用' : '未禁用'}</p>
            <p style={{ margin: '2px 0' }}>⚙️ 事件监听状态: {eventListenerStatus}</p>
          </div>
          
          <h4 style={{ margin: '4px 0', color: '#4a9eff' }}>📝 踢下麦事件日志</h4>
          <div style={{ 
            background: '#222', 
            padding: '8px', 
            borderRadius: '4px', 
            marginBottom: '8px',
            maxHeight: '300px',
            overflowY: 'auto'
          }}>
            {kickLogs.map((log, index) => (
              <div key={index} style={{ 
                margin: '4px 0',
                borderBottom: index < kickLogs.length - 1 ? '1px solid #333' : 'none',
                paddingBottom: '4px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {log}
              </div>
            ))}
          </div>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={() => addKickLog('🔄 手动添加测试日志')}
              style={{
                background: '#4a9eff',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 8px',
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              测试日志
            </button>
            <button 
              onClick={() => {
                const attrs = localParticipant?.attributes || {};
                addKickLog(`📊 手动检查attributes: ${JSON.stringify(attrs)}`);
              }}
              style={{
                background: '#4a9eff',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 8px',
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              检查属性
            </button>
            <button 
              onClick={() => setKickLogs([])}
              style={{
                background: '#ff4a4a',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 8px',
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              清空日志
            </button>
          </div>

          {/* 选择参与者 */}
          <div style={{ marginBottom: '15px' }}>
            <label>选择参与者:</label>
            <select 
              value={selectedParticipant || ''} 
              onChange={(e) => setSelectedParticipant(e.target.value || null)}
              style={{
                width: '100%',
                padding: '5px',
                marginTop: '5px',
                background: '#444',
                color: '#fff',
                border: '1px solid #555'
              }}
            >
              <option value="">-- 选择参与者 --</option>
              {participants.map(p => (
                <option key={p.identity} value={p.identity}>
                  {p.name} ({p.identity})
                </option>
              ))}
            </select>
          </div>

          {/* 参与者信息 */}
          {selectedParticipantInfo && (
            <div style={{ marginBottom: '15px' }}>
              <h4 style={{ marginTop: 0 }}>参与者信息</h4>
              <div style={{ background: '#222', padding: '10px', borderRadius: '4px' }}>
                <p><strong>名称:</strong> {selectedParticipantInfo.name}</p>
                <p><strong>ID:</strong> {selectedParticipantInfo.identity}</p>
                <p><strong>禁用状态:</strong> {selectedParticipantInfo.isDisabled ? '已禁用' : '正常'}</p>
                <p><strong>isDisabledUser:</strong> {selectedParticipantInfo.attributes.isDisabledUser || '未设置'}</p>
                <p><strong>值类型:</strong> {typeof selectedParticipantInfo.attributes.isDisabledUser}</p>
                
                <div>
                  <strong>所有属性:</strong>
                  <pre style={{ 
                    background: '#111', 
                    padding: '8px', 
                    borderRadius: '4px',
                    overflow: 'auto',
                    maxHeight: '100px',
                    fontSize: '12px'
                  }}>
                    {selectedParticipantInfo.attributesRaw}
                  </pre>
                </div>
              </div>
              
              <button
                onClick={showDebugAlert}
                style={{
                  background: '#4a5568',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  marginTop: '10px',
                  cursor: 'pointer'
                }}
              >
                显示调试弹窗
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 