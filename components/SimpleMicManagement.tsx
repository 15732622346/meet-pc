'use client';

import React from 'react';
import { useRoomContext, useParticipants, useLocalParticipant, useRoomInfo } from '@livekit/components-react';
import { shouldShowInMicList } from '@/lib/token-utils';

interface SimpleMicManagementProps {
  userRole?: number;
  userName?: string;
  maxMicSlots?: number; // 保留作为备选值
}

export function SimpleMicManagement({ 
  userRole = 1, 
  userName, 
  maxMicSlots: defaultMaxMicSlots = 6 
}: SimpleMicManagementProps) {
  const room = useRoomContext();
  const roomInfo = useRoomInfo();
  const participants = useParticipants();
  const localParticipantState = useLocalParticipant();
  const localParticipant = localParticipantState.localParticipant;
  
  // 从LiveKit服务器房间元数据获取maxMicSlots
  const maxMicSlots = React.useMemo(() => {
    let maxSlots;
    
    try {
      // 优先从房间元数据获取
      if (roomInfo?.metadata) {
        const metadata = JSON.parse(roomInfo.metadata);
        if (metadata && typeof metadata.maxMicSlots === 'number') {
          maxSlots = metadata.maxMicSlots;
          console.log('🎯 从LiveKit房间元数据获取麦位数量:', maxSlots);
          return maxSlots;
        }
      }
    } catch (error) {
      console.error('❌ 解析房间元数据失败:', error);
    }
    
    // 如果没有获取到,使用传入的默认值
    return defaultMaxMicSlots;
  }, [roomInfo?.metadata, defaultMaxMicSlots]);
  
  // 🔥 修改：基于麦位列表统计，而不是真实麦克风状态
  const micListCount = React.useMemo(() => 
    participants.filter(p => shouldShowInMicList(p.attributes || {})).length, 
    [participants]
  );
  
  const micRequesters = React.useMemo(() => 
    participants.filter(p => p.attributes?.mic_status === 'requesting'), 
    [participants]
  );
  
  const micUsers = React.useMemo(() => 
    participants.filter(p => p.attributes?.mic_status === 'on_mic'), 
    [participants]
  );
  
  const isHost = userRole >= 2;
  
  // 🔥 申请上麦 - 使用LiveKit原生API
  const requestMic = async () => {
    if (!room || !localParticipant) return;
    
    // 🎯 修改：麦位数量限制检查 - 基于麦位列表人数
    if (micListCount >= maxMicSlots) {
      alert(`麦位已满！当前麦位列表已有 ${micListCount}/${maxMicSlots} 人，请等待有人退出后再申请。`);
      return;
    }
    
    // 🎯 检查用户当前状态
    const currentUserMicStatus = localParticipant?.attributes?.mic_status;
    if (currentUserMicStatus === 'requesting') {
      alert('您已经在申请中，请等待主持人批准');
      return;
    }
    
    if (currentUserMicStatus === 'on_mic') {
      alert('您已经在麦位上了');
      return;
    }
    
    try {
      console.log(`🎯 申请上麦检查通过 - 当前麦位使用情况: ${micUsers.length}/${maxMicSlots}`);
      
             // 🎯 使用LiveKit原生方法直接更新自己的attributes
       await localParticipant.setAttributes({
         mic_status: 'requesting',
         display_status: 'visible',
         request_time: Date.now().toString(),
         action: 'mic_request',
         user_name: userName || localParticipant.name || localParticipant.identity
       });
      
      console.log('✅ 申请上麦成功 - 使用LiveKit原生API');
    } catch (error) {
      console.error('❌ 申请上麦失败:', error);
      alert('申请上麦失败，请重试');
    }
  };
  
  // 🔥 批准上麦 - 纯LiveKit数据通道
  const approveMic = async (participantIdentity: string) => {
    if (!room || !isHost) return;
    
    try {
      const message = {
        type: 'mic-request',
        action: 'approve',
        target: participantIdentity,
        operator: localParticipant?.identity,
        timestamp: Date.now()
      };
      
      const dataBytes = new TextEncoder().encode(JSON.stringify(message));
      await room.localParticipant.publishData(dataBytes, { reliable: true });
      
      console.log(`✅ 批准上麦: ${participantIdentity}`);
    } catch (error) {
      console.error('❌ 批准上麦失败:', error);
    }
  };

  return (
    <div className="simple-mic-management">
      <div className="mic-panel">
        <h3>🎤 简化麦位管理 (LiveKit原生)</h3>
        
        {/* 申请上麦按钮 */}
        {!isHost && (
          <button 
            className={`request-btn ${micListCount >= maxMicSlots ? 'disabled' : ''}`}
            onClick={requestMic}
            disabled={micListCount >= maxMicSlots}
          >
            {micListCount >= maxMicSlots 
              ? `麦位已满 (${micListCount}/${maxMicSlots})`
              : `申请上麦 (${micListCount}/${maxMicSlots})`
            }
          </button>
        )}
        
        {/* 麦位列表 */}
        <div className="mic-list">
          <h4>上麦用户 ({micUsers.length}/{maxMicSlots}) - 麦位总数 ({micListCount}/{maxMicSlots})</h4>
          {micUsers.map(participant => (
            <div key={participant.identity} className="mic-user">
              <span>{participant.name || participant.identity}</span>
            </div>
          ))}
        </div>
        
        {/* 申请列表 */}
        {isHost && micRequesters.length > 0 && (
          <div className="request-list">
            <h4>申请列表 ({micRequesters.length})</h4>
            {micRequesters.map(participant => (
              <div key={participant.identity} className="requester">
                <span>{participant.name || participant.identity}</span>
                <button 
                  className="approve-btn"
                  onClick={() => approveMic(participant.identity)}
                >
                  批准
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <style jsx>{`
        .simple-mic-management {
          position: fixed;
          right: 20px;
          top: 20px;
          background: rgba(255, 255, 255, 0.95);
          border-radius: 10px;
          padding: 20px;
          min-width: 280px;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        }
        
        .mic-panel h3 {
          margin: 0 0 15px 0;
          font-size: 16px;
          color: #333;
        }
        
        .request-btn {
          width: 100%;
          padding: 12px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          margin-bottom: 15px;
        }
        
        .request-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
        
        .request-btn.disabled {
          background: #dc2626 !important;
          color: white;
          font-weight: 600;
          border: 2px solid #fca5a5;
        }
        
        .mic-list, .request-list {
          margin-bottom: 15px;
        }
        
        .mic-list h4, .request-list h4 {
          margin: 0 0 8px 0;
          font-size: 14px;
          color: #666;
        }
        
        .mic-user, .requester {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px;
          background: #f8f9fa;
          border-radius: 4px;
          margin-bottom: 4px;
          font-size: 13px;
        }
        
        .approve-btn {
          padding: 4px 8px;
          border: none;
          border-radius: 3px;
          cursor: pointer;
          font-size: 12px;
          background: #28a745;
          color: white;
        }
      `}</style>
    </div>
  );
}