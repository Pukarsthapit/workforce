import { useCaps } from '@/shell/useCaps';
import { ProfileQueue } from '@/features/profile/ProfileQueue';
import { PeopleWorkspace } from './PeopleWorkspace';

/* calm.ly setup · People (admPeople, calm.ly-workforce-v15.html:8041). Bank
   detail changes a manager has approved wait here for payroll (D3). */
export function AdminPeoplePage() {
  const caps = useCaps();
  return <PeopleWorkspace variant="admin" view="apeople" crumb="calm.ly setup · People"
    tip="The one employee record. Timesheet, Rota and Leave all read this list."
    above={caps.has('bank_verify') ? <ProfileQueue stage="payroll" /> : undefined} />;
}
