import { toast } from 'sonner';
import { CircleCheck, Info, OctagonAlert, TriangleAlert } from 'lucide-react';
import { tid } from '@/testids';
import type { Refusal } from '@/contract/common';

type Tone = 'info' | 'success' | 'warning' | 'error';
const STATUS = {
  info: { id: tid.toast.info, cls: 'border-info bg-info-surface text-info', icon: Info, role: 'status' },
  success: { id: tid.toast.success, cls: 'border-ok bg-ok-surface text-ok', icon: CircleCheck, role: 'status' },
  warning: { id: tid.toast.warning, cls: 'border-warn bg-warn-surface text-warn', icon: TriangleAlert, role: 'status' },
  error: { id: tid.toast.error, cls: 'border-err bg-err-surface text-err', icon: OctagonAlert, role: 'alert' },
} as const;
const BOX = 'mx-auto flex w-fit max-w-full items-start gap-sm rounded-control border border-l-4 px-lg py-md text-sm shadow-sm';
function showToast(tone: Tone, message: string, next?: string, duration = 5000) {
  const status = STATUS[tone], Icon = status.icon;
  toast.custom(() => (
    <div data-testid={status.id} role={status.role} className={`${BOX} ${status.cls}`}>
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <div>{message}{next && <div data-testid={tid.toast.next} className="mt-0.5 text-text-secondary">{next}</div>}</div>
    </div>), { duration });
}
export function toastInfo(message: string, next?: string) {
  showToast('info', message, next);
}
export function toastSuccess(message: string, next?: string) {
  showToast('success', message, next);
}
export function toastWarning(message: string, next?: string) {
  showToast('warning', message, next);
}
export function toastRefusal(r: Pick<Refusal, 'message' | 'next'>) {
  showToast('error', r.message, r.next, 8000);
}
