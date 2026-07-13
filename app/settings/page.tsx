'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUserStore } from '@/stores/userStore';
import {
  User,
  Link as LinkIcon,
  Accessibility,
  Bell,
  Info,
  ChevronRight,
  RefreshCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import PageHeader from '@/components/layout/PageHeader';
import { ROUTES } from '@/lib/constants';
import styles from './page.module.css';

const SETTING_ITEMS = [
  { label: '个人信息', icon: User, href: ROUTES.SETTINGS_PROFILE },
  { label: '绑定管理', icon: LinkIcon, href: ROUTES.SETTINGS_BIND },
  { label: '无障碍设置', icon: Accessibility, href: ROUTES.SETTINGS_ACCESSIBILITY },
  { label: '消息通知', icon: Bell, href: '', comingSoon: true },
  { label: '关于我们', icon: Info, href: '', comingSoon: true },
];

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = '取消',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null;
  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true" onClick={onCancel}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.modalTitle}>{title}</h2>
        <p className={styles.modalMessage}>{message}</p>
        <div className={styles.modalActions}>
          <Button variant="ghost" fullWidth onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant="danger" fullWidth onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const user = useUserStore((s) => s.user);
  const isElder = useUserStore((s) => s.isElder);
  const logout = useUserStore((s) => s.logout);
  const setRole = useUserStore((s) => s.setRole);

  const [showLogout, setShowLogout] = useState(false);
  const [showRoleSwitch, setShowRoleSwitch] = useState(false);
  const [switchingRole, setSwitchingRole] = useState(false);

  const handleLogout = () => {
    logout();
    router.replace(ROUTES.LOGIN);
  };

  const handleRoleSwitch = async () => {
    const targetRole = isElder ? 'family' : 'elder';
    setSwitchingRole(true);
    try {
      await setRole(targetRole);
      setShowRoleSwitch(false);
    } finally {
      setSwitchingRole(false);
    }
  };

  const roleLabel = isElder ? '长辈模式' : '家属模式';
  const targetRoleLabel = isElder ? '家属端' : '长辈端';

  return (
    <div className={styles.page}>
        <PageHeader title="设置" transparent />

        <Link href={ROUTES.SETTINGS_PROFILE} className={styles.userCardLink}>
          <Card variant="glass" className={styles.userCard}>
            <div className={styles.avatar}>
              <User size={40} color="var(--accent)" />
            </div>
            <div className={styles.userInfo}>
              <div className={styles.userName}>{user?.name || '用户'}</div>
              <div className={styles.userRole}>{roleLabel}</div>
            </div>
            <ChevronRight size={24} color="var(--text-muted)" />
          </Card>
        </Link>

        <section className={styles.section} aria-label="功能设置">
          <div className={styles.sectionLabel}>功能设置</div>
          <Card variant="glass" className={styles.menuCard}>
            {SETTING_ITEMS.map((item, index) => {
              const Icon = item.icon;
              const isLast = index === SETTING_ITEMS.length - 1;
              if (item.comingSoon) {
                return (
                  <div
                    key={item.label}
                    className={`${styles.menuItem} ${styles.menuItemDisabled}`}
                    aria-disabled="true"
                  >
                    <Icon size={24} color="var(--accent)" />
                    <span className={styles.menuLabel}>{item.label}</span>
                    <span className={styles.comingSoonBadge}>即将推出</span>
                  </div>
                );
              }
              return (
                <Link key={item.label} href={item.href} className={styles.menuItemLink}>
                  <div className={`${styles.menuItem} ${!isLast ? styles.menuItemBordered : ''}`}>
                    <Icon size={24} color="var(--accent)" />
                    <span className={styles.menuLabel}>{item.label}</span>
                    <ChevronRight size={24} color="var(--text-muted)" />
                  </div>
                </Link>
              );
            })}
          </Card>
        </section>

        <section className={styles.section} aria-label="角色切换">
          <div className={styles.sectionLabel}>账号</div>
          <Card variant="glass" className={styles.menuCard}>
            <button
              type="button"
              className={`${styles.menuItem} ${styles.menuItemButton}`}
              onClick={() => setShowRoleSwitch(true)}
              aria-label={`点击切换到${targetRoleLabel}`}
            >
              <RefreshCcw size={24} color="var(--accent)" />
              <span className={styles.menuLabel}>角色切换</span>
              <span className={styles.roleHint}>{targetRoleLabel}</span>
            </button>
          </Card>
        </section>

        <Button
          variant="secondary"
          size="lg"
          fullWidth
          className={styles.logoutBtn}
          onClick={() => setShowLogout(true)}
          aria-label="退出登录"
        >
          退出登录
        </Button>

        <p className={styles.version}>桑梓智护 v0.1.0</p>

        <ConfirmModal
          open={showLogout}
          title="退出登录"
          message="确定要退出登录吗？"
          confirmLabel="退出登录"
          onConfirm={handleLogout}
          onCancel={() => setShowLogout(false)}
        />

        <ConfirmModal
          open={showRoleSwitch}
          title="切换角色"
          message={`确定要从${roleLabel}切换到${targetRoleLabel}吗？`}
          confirmLabel="确认切换"
          loading={switchingRole}
          onConfirm={handleRoleSwitch}
          onCancel={() => setShowRoleSwitch(false)}
        />
    </div>
  );
}
