'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUserStore } from '@/stores/userStore';
import { useFamilyStore } from '@/stores/familyStore';
import { useAuthContext } from '@/components/providers/AuthProvider';
import { fetchApi } from '@/lib/api';
import { ROUTES } from '@/lib/constants';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import PageHeader from '@/components/layout/PageHeader';
import {
  displayElderRelation,
  ELDER_RELATION_OPTIONS,
} from '@/lib/familyRelations';
import styles from './page.module.css';

/** 权限配置项 */
const PERMISSION_LABELS: Record<string, string> = {
  can_view_health: '查看健康数据',
  can_edit_health: '代为记录健康',
  can_edit_medication: '编辑用药计划',
  can_receive_emergency: '接收紧急通知',
};

interface FamilyBindResponse {
  id: string;
  elder_id: string;
  family_id: string;
  relation: string;
  status: string;
  bind_code: string;
  can_view_health: boolean;
  can_edit_health: boolean;
  can_edit_medication: boolean;
  can_receive_emergency: boolean;
  bound_at: string;
  created_at: string;
  expires_at: string | null;
  peer: {
    id: string;
    name: string;
    phone: string | null;
    avatar_url: string | null;
    last_active_at: string | null;
    role: string;
  } | null;
}

interface GenerateCodeResponse {
  bind_code: string;
  bind_id: string;
  expires_at: string;
}

export default function BindManagementPage() {
  const { isReady } = useAuthContext();
  const user = useUserStore((s) => s.user);
  const isElder = useUserStore((s) => s.isElder);
  const { fetchBinds } = useFamilyStore();

  const [bindList, setBindList] = useState<FamilyBindResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [generatedExpiresAt, setGeneratedExpiresAt] = useState<string | null>(null);
  const [codeSecondsLeft, setCodeSecondsLeft] = useState(0);
  const [generating, setGenerating] = useState(false);

  const [bindCode, setBindCode] = useState('');
  const [selectedRelation, setSelectedRelation] = useState<string>(ELDER_RELATION_OPTIONS[0]);
  const [binding, setBinding] = useState(false);
  const [bindError, setBindError] = useState<string | null>(null);
  const [bindSuccess, setBindSuccess] = useState(false);

  const [unbindTarget, setUnbindTarget] = useState<FamilyBindResponse | null>(null);
  const [unbinding, setUnbinding] = useState(false);

  const [updatingPermission, setUpdatingPermission] = useState<string | null>(null);

  const loadBinds = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchApi<FamilyBindResponse[]>('/api/v1/family/binds');
      setBindList(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载绑定列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isReady) {
      loadBinds();
    }
  }, [isReady, loadBinds]);

  useEffect(() => {
    if (!generatedCode || !generatedExpiresAt) return;

    const updateCountdown = () => {
      const seconds = Math.max(
        0,
        Math.ceil((new Date(generatedExpiresAt).getTime() - Date.now()) / 1000),
      );
      setCodeSecondsLeft(seconds);
      if (seconds === 0) {
        setGeneratedCode(null);
        setGeneratedExpiresAt(null);
      }
    };

    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timer);
  }, [generatedCode, generatedExpiresAt]);

  const handleGenerateCode = async () => {
    setGenerating(true);
    setError(null);
    // 请求开始即隐藏旧码；服务端会同步让旧码失效。
    setGeneratedCode(null);
    setGeneratedExpiresAt(null);
    setCodeSecondsLeft(0);
    try {
      const res = await fetchApi<GenerateCodeResponse>('/api/v1/family/generate-code', {
        method: 'POST',
      });
      setGeneratedCode(res.bind_code);
      setGeneratedExpiresAt(res.expires_at);
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成绑定码失败');
    } finally {
      setGenerating(false);
    }
  };

  const handleBind = async () => {
    if (!bindCode.trim()) {
      setBindError('请输入绑定码');
      return;
    }
    if (bindCode.trim().length !== 6) {
      setBindError('绑定码为6位数字');
      return;
    }

    setBinding(true);
    setBindError(null);
    setBindSuccess(false);
    try {
      await fetchApi<FamilyBindResponse>('/api/v1/family/bind', {
        method: 'POST',
        body: { bind_code: bindCode.trim(), relation: selectedRelation },
      });
      setBindSuccess(true);
      setBindCode('');
      await loadBinds();
      if (user?.id) fetchBinds(user.id);
    } catch (err) {
      setBindError(err instanceof Error ? err.message : '绑定失败');
    } finally {
      setBinding(false);
    }
  };

  const handlePermissionToggle = async (
    bindId: string,
    permKey: string,
    currentValue: boolean,
  ) => {
    const loadingKey = `${bindId}-${permKey}`;
    setUpdatingPermission(loadingKey);
    try {
      const updated = await fetchApi<FamilyBindResponse>(
        `/api/v1/family/binds/${bindId}`,
        {
          method: 'PATCH',
          body: { [permKey]: !currentValue },
        },
      );
      setBindList((prev) => prev.map((b) => (b.id === bindId ? updated : b)));
    } catch {
      // Silently fail — toggle reverts visually
    } finally {
      setUpdatingPermission(null);
    }
  };

  const handleUnbind = async () => {
    if (!unbindTarget) return;
    setUnbinding(true);
    try {
      await fetchApi(`/api/v1/family/binds/${unbindTarget.id}`, {
        method: 'DELETE',
      });
      setBindList((prev) => prev.filter((b) => b.id !== unbindTarget.id));
      setUnbindTarget(null);
      if (user?.id) fetchBinds(user.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : '解除绑定失败');
    } finally {
      setUnbinding(false);
    }
  };

  if (!isReady) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>加载中…</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
        <PageHeader
          title="绑定管理"
          variant="detail"
          backHref={ROUTES.SETTINGS}
          backAriaLabel="返回设置"
          transparent
        />

        {error && (
          <div className={styles.errorBanner} role="alert">
            {error}
          </div>
        )}

        <section className={styles.section} aria-label="已绑定列表">
          <h2 className={styles.sectionTitle}>已绑定列表</h2>
          {loading ? (
            <p className={styles.hint}>加载中…</p>
          ) : bindList.length === 0 ? (
            <p className={styles.hint}>暂无绑定关系</p>
          ) : (
            <div className={styles.bindList}>
              {bindList.map((bind) => (
                <Card key={bind.id} variant="glass" className={styles.bindCard}>
                  <div className={styles.bindCardHeader}>
                    <span className={styles.relation}>
                      {bind.peer?.name || displayElderRelation(bind.relation)}
                    </span>
                    <Badge variant={bind.status === 'active' ? 'success' : 'warning'}>
                      {bind.status === 'active' ? '已绑定' : bind.status}
                    </Badge>
                  </div>

                  {bind.peer?.name && (
                    <p className={styles.hint}>{displayElderRelation(bind.relation)}</p>
                  )}

                  <div className={styles.permissions}>
                    {(Object.keys(PERMISSION_LABELS) as Array<keyof typeof PERMISSION_LABELS>).map(
                      (permKey) => {
                        const value = bind[permKey as keyof FamilyBindResponse] as boolean;
                        const isUpdating = updatingPermission === `${bind.id}-${permKey}`;
                        return (
                          <label key={permKey} className={styles.permissionRow}>
                            <span className={styles.permissionLabel}>
                              {PERMISSION_LABELS[permKey]}
                            </span>
                            {isElder ? (
                              <button
                                type="button"
                                role="switch"
                                aria-checked={value}
                                aria-label={`${PERMISSION_LABELS[permKey]} ${value ? '已开启' : '已关闭'}`}
                                className={`${styles.toggle} ${value ? styles.toggleOn : styles.toggleOff}`}
                                disabled={isUpdating}
                                onClick={() => handlePermissionToggle(bind.id, permKey, value)}
                              >
                                <span className={styles.toggleThumb} />
                              </button>
                            ) : (
                              <Badge variant={value ? 'success' : 'normal'}>
                                {value ? '已授权' : '未授权'}
                              </Badge>
                            )}
                          </label>
                        );
                      },
                    )}
                  </div>

                  <Button
                    variant="secondary"
                    size="md"
                    fullWidth
                    onClick={() => setUnbindTarget(bind)}
                  >
                    解除绑定
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </section>

        {isElder && (
          <section className={styles.section} aria-label="生成绑定码">
            <h2 className={styles.sectionTitle}>生成绑定码</h2>
            <p className={styles.hint}>绑定码 10 分钟内有效，请交给可信任的家属</p>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleGenerateCode}
              loading={generating}
            >
              生成绑定码
            </Button>
            {generatedCode && (
              <div className={styles.codeDisplay} aria-live="polite">
                <p className={styles.codeLabel}>您的绑定码</p>
                <p className={styles.codeValue}>{generatedCode}</p>
                <p className={styles.codeHint}>
                  请将此码告知家属，剩余
                  {Math.floor(codeSecondsLeft / 60)}:
                  {String(codeSecondsLeft % 60).padStart(2, '0')}
                </p>
              </div>
            )}
          </section>
        )}

        {!isElder && (
          <section className={styles.section} aria-label="输入绑定码">
            <h2 className={styles.sectionTitle}>绑定长辈</h2>

            {bindSuccess && (
              <div className={styles.successBanner} role="status">
                绑定成功！
              </div>
            )}

            <Input
              id="bind-code"
              label="绑定码"
              value={bindCode}
              onChange={(value) => {
                setBindCode(value.replace(/\D/g, ''));
                setBindError(null);
                setBindSuccess(false);
              }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="请输入6位绑定码"
              error={bindError ?? undefined}
              aria-invalid={!!bindError}
              aria-describedby={bindError ? 'bind-code-error' : undefined}
              className={styles.bindCodeInput}
            />

            <div className={styles.formGroup}>
              <span className={styles.formLabel}>这位长辈是我的</span>
              <div className={styles.relationGrid}>
                {ELDER_RELATION_OPTIONS.map((rel) => (
                  <button
                    key={rel}
                    type="button"
                    className={`${styles.relationChip} ${selectedRelation === rel ? styles.relationChipActive : ''}`}
                    onClick={() => setSelectedRelation(rel)}
                    aria-pressed={selectedRelation === rel}
                  >
                    {rel}
                  </button>
                ))}
              </div>
            </div>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleBind}
              disabled={binding || !bindCode.trim()}
              loading={binding}
            >
              绑定
            </Button>
          </section>
        )}

        {unbindTarget && (
          <div
            className={styles.modalOverlay}
            role="dialog"
            aria-modal="true"
            aria-labelledby="unbind-modal-title"
            onClick={() => !unbinding && setUnbindTarget(null)}
          >
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <h2 id="unbind-modal-title" className={styles.modalTitle}>
                确认解除绑定
              </h2>
              <p className={styles.modalMessage}>
                解除与「{unbindTarget.relation || '对方'}」的绑定关系后，将停止数据共享。确定要解除吗？
              </p>
              <div className={styles.modalActions}>
                <Button
                  variant="ghost"
                  fullWidth
                  onClick={() => setUnbindTarget(null)}
                  disabled={unbinding}
                >
                  取消
                </Button>
                <Button
                  variant="danger"
                  fullWidth
                  onClick={handleUnbind}
                  loading={unbinding}
                >
                  确认解除
                </Button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
