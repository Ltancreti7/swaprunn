import { api } from './api';
import { AdminInvitation, DealerAdmin } from '../../shared/schema';

export async function checkAndAcceptPendingInvitations(_userEmail: string, _userId: string): Promise<{
  accepted: AdminInvitation[];
  errors: string[];
}> {
  const accepted: AdminInvitation[] = [];
  const errors: string[] = [];

  try {
    const pendingInvitations = await api.adminInvitations.pending();

    if (!pendingInvitations || pendingInvitations.length === 0) {
      return { accepted, errors };
    }

    for (const invitation of pendingInvitations) {
      try {
        const result = await api.adminInvitations.accept(invitation.token);

        if (result && result.success) {
          accepted.push(invitation);
        } else {
          errors.push('Failed to accept invitation');
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error processing invitation';
        errors.push(message);
      }
    }

    return { accepted, errors };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to process invitations';
    errors.push(message);
    return { accepted, errors };
  }
}

export async function getUserAdminRoles(_userId: string): Promise<DealerAdmin[]> {
  try {
    const roles = await api.user.adminRoles();
    return roles || [];
  } catch {
    return [];
  }
}

export async function getUserAdminRoleForDealer(userId: string, dealerId: string): Promise<DealerAdmin | null> {
  try {
    const roles = await getUserAdminRoles(userId);
    return roles.find(r => r.dealerId === dealerId) || null;
  } catch {
    return null;
  }
}
