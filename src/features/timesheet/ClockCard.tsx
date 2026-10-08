import { useEffect, useState } from 'react';
import { AlarmClock } from 'lucide-react';
import { tid } from '@/testids';
import { Banner, Button, Field, FormWarn, TextInput, toastInfo } from '@/ui';
import { useClockIn, useClockOut, useCloseClock, useEndBreak, useStartBreak, type ClockMoved, type ClockRecord, type MyClock } from '@/api/clock';
import { CLOCK_STATUS, clockTime, clockedInSince, forgottenMessage, formatElapsed, isOpenState, nightLineNote, noDaySentence, CHOOSE_FINISH, CHOOSE_FINISH_NEXT } from '@/domain/clock';

/* Module 2b Clocking: the prototype's clock card (.clockcard, renderClock and
   paintClock, calm.ly-workforce-v15.html:1227-1253, 6382-6386, 6890-6918). The
   state, the time worked and every sentence come from the server's record;
   the timer only ticks on locally from the read (no optimistic updates). */
const RING_C = 2 * Math.PI * 34;
type Move = 'in' | 'breakStart' | 'breakEnd' | 'out';

/* The seconds the timer shows: the record's elapsed time at the read, plus
   the seconds since that read while the shift is running. */
export function useClockSeconds(current: ClockRecord | null, readAt: number): number {
  const running = current?.state === 'running';
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [running]);
  if (!current) return 0;
  return current.elapsedSeconds + (running ? Math.max(0, Math.floor((now - readAt) / 1000)) : 0);
}

/* The day's start as the clock has it while a shift runs (lockShiftTimes): the
   first clock in, or once the clock has written the day, the start stored on
   it, which the person may have corrected (review I4). */
export function clockedStart(current: ClockRecord | null | undefined, stored?: string): string | null {
  if (!current || !isOpenState(current.state)) return null;
  if (current.written && stored?.trim()) return stored.trim();
  const first = current.events.find(e => e.kind === 'in');
  return first ? clockTime(first.at) : null;
}

const flagged = (r: ClockMoved) => (r.warnings.length ? `Flagged: ${r.warnings.join(' ')}` : undefined);
/* .btn.lime and .btn.glass: the accent with its dark ink, and the translucent
   white on the inverse surface; on a phone each grows to share the row. */
const LIME = 'bg-danger text-white hover:bg-danger/90 active:bg-danger/80 dark:text-text-on-accent max-md:min-w-0 max-md:flex-[1_1_auto]';
const GLASS = 'border-border-strong bg-surface text-text-primary hover:bg-surface-subtle max-md:min-w-0 max-md:flex-[1_1_auto]';
const STATE_LABEL: Record<MyClock['current'] extends infer C ? C extends { state: infer S } ? S : never : never, string> = {
  idle: 'Ready to work',
  running: 'Working',
  onBreak: 'On break',
  clockedOut: 'Shift complete',
};

export function ClockCard({ clock, readAt }: { clock: MyClock; readAt: number }) {
  const clockIn = useClockIn(), startBreak = useStartBreak(), endBreak = useEndBreak(), clockOut = useClockOut();
  const moves = { in: clockIn, breakStart: startBreak, breakEnd: endBreak, out: clockOut };
  const [last, setLast] = useState<Move | null>(null);
  const busy = Object.values(moves).some(m => m.anyPending);
  const current = clock.current, state = current?.state ?? 'idle';
  const seconds = useClockSeconds(current, readAt);
  const pct = Math.min(seconds / (clock.targetHours * 3600), 1), shown = Math.round(pct * 100);
  const go = (move: Move) => {
    setLast(move);
    moves[move].mutate({ version: clock.version }, { onSuccess: (r: ClockMoved) => toastInfo(r.toast, flagged(r)) });
  };
  const refusal = last ? moves[last].refusal : null;
  /* review M3: a day rule refused the clock out, so the clock still runs; offer a finish the person chooses */
  const choosing = last === 'out' && refusal?.next === CHOOSE_FINISH_NEXT;
  const open = state === 'running' || state === 'onBreak';
  /* review I3: a clock still running since an earlier day says since when */
  const since = current && open ? clockedInSince(current, clock.now.date) : null;
  /* review M1: the clock goes on the night line of the day before */
  const lineDay = clock.date < clock.now.date && clock.rota && !since ? nightLineNote(clock.rota.name, clock.date, open) : null;
  return (
    <>
      <section data-testid={tid.clock.card} data-clock-state={state} aria-label="Clock"
        className="mb-xl grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-xl border-y border-ok/30 bg-ok-surface/35 px-xl py-xl max-md:flex max-md:flex-col max-md:items-stretch max-md:gap-md max-md:px-md">
        <div data-testid={tid.clock.ring} role="img" aria-label={`${shown}% of the ${clock.targetHours}-hour shift`} className="relative size-[88px] flex-none max-md:size-[68px]">
          <svg viewBox="0 0 76 76" aria-hidden="true" className="size-[76px] -rotate-90">
            <circle cx="38" cy="38" r="34" className="fill-none stroke-ring-track stroke-[6]" />
            <circle cx="38" cy="38" r="34" style={{ strokeDasharray: RING_C, strokeDashoffset: RING_C * (1 - pct) }}
              className="fill-none stroke-ok stroke-[6] [stroke-linecap:round] transition-[stroke-dashoffset] duration-(--motion-flow) ease-(--ease-flow)" />
          </svg>
          <div data-testid={tid.clock.ringPct} aria-hidden="true" className="absolute inset-0 grid place-items-center text-xs font-bold tabular-nums">{shown}%</div>
        </div>
        <div className="min-w-0">
          <div className="mb-xs text-xs font-semibold tracking-[.12em] text-ok">{STATE_LABEL[state]}</div>
          <div data-testid={tid.clock.timer} role="timer"
            className="font-[family-name:var(--qp-font-display)] text-5xl leading-none font-medium tracking-[-.055em] tabular-nums text-text-primary max-md:text-4xl">{formatElapsed(seconds)}</div>
          <div data-testid={tid.clock.status} role="status" className="mt-sm text-sm text-text-secondary">{CLOCK_STATUS[state]}</div>
          {since && <div data-testid={tid.clock.since} className="mt-xs text-xs text-text-muted">{since}</div>}
          {lineDay && <div data-testid={tid.clock.lineDay} className="mt-xs text-xs text-text-muted">{lineDay}</div>}
        </div>
        <div className="ml-auto flex flex-wrap gap-sm max-md:col-span-2 max-md:ml-0 max-md:w-full">
          {state === 'running' && clock.gates.breaks &&
            <Button testId={tid.clock.breakStart} kind="ghost" className={GLASS} pending={busy} onClick={() => go('breakStart')}>Start break</Button>}
          {/* Resume stays while on a break even if Break tracking was turned off since, so the break can end */}
          {state === 'onBreak' && <Button testId={tid.clock.resume} kind="ghost" className={GLASS} pending={busy} onClick={() => go('breakEnd')}>Resume</Button>}
          {open && <Button testId={tid.clock.clockOut} kind="primary" className={LIME} pending={busy} onClick={() => go('out')}>Clock out</Button>}
          {state === 'clockedOut' && <Button testId={tid.clock.again} kind="ghost" className={GLASS} pending={busy} onClick={() => go('in')}>Clock in again</Button>}
          {state === 'idle' && <Button testId={tid.clock.clockIn} kind="primary" className={LIME} pending={busy} onClick={() => go('in')}>Clock in</Button>}
        </div>
      </section>
      {refusal && <FormWarn testId={tid.clock.refusal}>{refusal.message} <span className="opacity-90">{refusal.next}</span></FormWarn>}
      {choosing && current && <ChooseFinish key={current.version} rec={current} onDone={() => setLast(null)} />}
    </>);
}

/* Review M3: when a day rule refused the clock out, the close flow with a
   finish the person chooses stops the clock and saves the day with it. */
function ChooseFinish({ rec, onDone }: { rec: ClockRecord; onDone: () => void }) {
  const close = useCloseClock();
  const [finish, setFinish] = useState('');
  const submit = () => close.mutate({ date: rec.date, version: rec.version, finish }, { onSuccess: r => { toastInfo(r.toast, flagged(r)); onDone(); } });
  const other = close.refusal && close.refusal.field !== 'finish' ? close.refusal : null;
  return (
    <div className="mb-md">
      <div className="flex flex-wrap items-end gap-sm">
        <Field label="Finish time" required error={close.fieldError('finish')}>
          <TextInput testId={tid.clock.chooseFinish} type="time" step="300" value={finish} onChange={e => setFinish(e.target.value)} />
        </Field>
        <div className="mb-md"><Button testId={tid.clock.choose} kind="primary" pending={close.anyPending} onClick={submit}>{CHOOSE_FINISH}</Button></div>
      </div>
      {other && <FormWarn testId={tid.clock.chooseRefusal}>{other.message} <span className="opacity-90">{other.next}</span></FormWarn>}
    </div>);
}

/* A clock from an earlier day nobody clocked out of (D6): the finish time
   closes it and saves that day as a draft. When that day can no longer be
   written (`blocked`), closing leaves the day as it is and the manager is
   asked to amend it, and the banner says so (review I2). A refusal about the
   time is shown on the field; any other under it. */
export function ForgottenClock({ open, blocked, manager }: { open: ClockRecord; blocked: MyClock['openBlocked']; manager: string }) {
  const close = useCloseClock();
  const [finish, setFinish] = useState('');
  const submit = () => close.mutate({ date: open.date, version: open.version, finish }, { onSuccess: r => toastInfo(r.toast, flagged(r)) });
  const other = close.refusal && close.refusal.field !== 'finish' ? close.refusal : null;
  return (
    <Banner testId={tid.clock.forgotten} tone="warn" icon={<AlarmClock />} title={forgottenMessage(open.date)}>
      {blocked
        ? <>Enter the time you finished that day to close the clock. {blocked.message} <span data-testid={tid.clock.noDay}>{noDaySentence(manager)}</span></>
        : 'Enter the time you finished that day to close the clock. The day is saved as a draft for you to check and submit.'}
      <div className="mt-sm flex flex-wrap items-end gap-sm">
        <Field label="Finish time" required error={close.fieldError('finish')}>
          <TextInput testId={tid.clock.finish} type="time" step="300" value={finish} onChange={e => setFinish(e.target.value)} />
        </Field>
        <div className="mb-md"><Button testId={tid.clock.close} kind="primary" pending={close.anyPending} onClick={submit}>Close the clock</Button></div>
      </div>
      {other && <FormWarn testId={tid.clock.closeRefusal}>{other.message} <span className="opacity-90">{other.next}</span></FormWarn>}
    </Banner>);
}
