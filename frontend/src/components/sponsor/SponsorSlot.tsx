import type { CSSProperties } from 'react';

import type { SponsorSlot as Slot } from '@/lib/sponsors';

interface SponsorSlotProps {
  slot: Slot;
  /** 保留上游签名，routex 版不再区分展示形态 */
  variant?: 'banner' | 'compact' | 'card';
  className?: string;
}

/**
 * routex 版本：原来的第三方赞助位已经移除，统一替换成官方客服提示条。
 * 保留原组件的 props 签名，调用方（登录页 / 仪表盘 / 各页面）无需改动。
 */
const SUPPORT_TEXT = 'routex 网络问题请联系 v:Ssssihh';

const bar: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  padding: '9px 14px',
  background: '#ffffff',
  border: '1px solid #e4e8ef',
  borderRadius: 10,
  fontSize: 13,
  color: '#475569',
  lineHeight: 1.5,
  letterSpacing: '.2px',
  userSelect: 'text',
  maxWidth: 1000,
  margin: '0 auto',
};

const tag: CSSProperties = {
  flex: '0 0 auto',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '.6px',
  textTransform: 'uppercase',
  color: '#2b6cff',
  background: 'rgba(43, 108, 255, 0.10)',
  borderRadius: 6,
  padding: '2px 7px',
};

const dot: CSSProperties = {
  width: 6,
  height: 6,
  borderRadius: '50%',
  background: '#22c55e',
  flex: '0 0 auto',
};

export default function SponsorSlot({ slot, className }: SponsorSlotProps) {
  // 登录页用更窄的版本，避免挤压表单
  const isLogin = slot === 'login';
  return (
    <div className={className} style={{ width: '100%' }}>
      <div style={isLogin ? { ...bar, fontSize: 12.5 } : bar}>
        <span style={dot} aria-hidden="true" />
        <span style={{ ...tag, display: isLogin ? 'none' : 'inline-block' }}>SUPPORT</span>
        <span>{SUPPORT_TEXT}</span>
      </div>
    </div>
  );
}
