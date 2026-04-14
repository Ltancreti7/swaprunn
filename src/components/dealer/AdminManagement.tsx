import { useState, useEffect } from "react";
import { Shield, UserPlus, Mail, Trash2, Crown } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { DealerAdmin, AdminInvitation, AdminRole } from "../../../shared/schema";
import { Card } from "../ui/Card";
import { StatusBadge } from "../ui/Badge";
import { Modal } from "../ui/Modal";
import { api } from "../../lib/api";

interface AdminManagementProps {
  dealerId: string;
}

interface AdminWithEmail extends DealerAdmin {
  email?: string;
  name?: string;
}

export function AdminManagement({ dealerId }: AdminManagementProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [admins, setAdmins] = useState<AdminWithEmail[]>([]);
  const [invitations, setInvitations] = useState<AdminInvitation[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<AdminRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AdminRole>("manager");

  useEffect(() => {
    loadAdmins();
    loadInvitations();
    loadCurrentUserRole();
  }, [dealerId, user]);

  const loadCurrentUserRole = async () => {
    if (!user) return;

    try {
      const data = await api.dealerAdmins.roleForCurrentUser(dealerId);
      if (data && data.role) {
        setCurrentUserRole(data.role as AdminRole);
      }
    } catch (error) {
      console.error('Error loading current user role:', error);
    }
  };

  const loadAdmins = async () => {
    setLoading(true);
    try {
      const adminData = await api.dealerAdmins.byDealer(dealerId);
      setAdmins(adminData || []);
    } catch (err: unknown) {
      console.error('Exception loading admins:', err);
      const message = err instanceof Error ? err.message : 'Failed to load administrators';
      showToast(message, 'error');
      setAdmins([]);
    }
    setLoading(false);
  };

  const loadInvitations = async () => {
    try {
      const data = await api.adminInvitations.byDealer(dealerId);
      setInvitations(data || []);
    } catch (error) {
      console.error('Error loading invitations:', error);
      setInvitations([]);
    }
  };

  const handleInviteAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await api.adminInvitations.create({
        dealerId: dealerId,
        email: inviteEmail,
        role: inviteRole,
      });

      showToast(`Invitation sent to ${inviteEmail}`, "success");
      setShowInviteModal(false);
      setInviteEmail("");
      setInviteRole("manager");
      loadInvitations();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to send invitation";
      showToast(message, "error");
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    if (!confirm("Are you sure you want to revoke this invitation?")) return;

    try {
      await api.adminInvitations.cancel(invitationId);

      showToast("Invitation revoked", "success");
      loadInvitations();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to revoke invitation";
      showToast(message, "error");
    }
  };

  const handleRemoveAdmin = async (adminId: string, adminEmail: string) => {
    if (!confirm(`Are you sure you want to remove ${adminEmail} as an admin?`)) return;

    try {
      await api.dealerAdmins.delete(adminId);

      showToast("Admin removed successfully", "success");
      loadAdmins();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to remove admin";
      showToast(message, "error");
    }
  };

  const handleUpdateRole = async (adminId: string, newRole: AdminRole) => {
    try {
      await api.dealerAdmins.update(adminId, { role: newRole });

      showToast("Admin role updated", "success");
      loadAdmins();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update role";
      showToast(message, "error");
    }
  };

  const getRoleBadgeColor = (role: AdminRole) => {
    switch (role) {
      case "owner":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "manager":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "viewer":
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getRoleIcon = (role: AdminRole) => {
    if (role === "owner") return <Crown size={14} />;
    if (role === "manager") return <Shield size={14} />;
    return null;
  };

  const isOwner = currentUserRole === "owner";

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-20 bg-gray-200 rounded animate-pulse" />
        <div className="h-20 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Dealership Administrators</h2>
          <p className="text-gray-600 text-sm mt-1">
            Manage who has access to your dealership account
          </p>
        </div>
        {isOwner && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 transition"
          >
            <UserPlus size={20} />
            Invite Admin
          </button>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Shield className="text-blue-600 mt-0.5" size={20} />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">Admin Roles:</p>
            <ul className="space-y-1">
              <li><strong>Owner:</strong> Full control including managing admins, deliveries, and team</li>
              <li><strong>Manager:</strong> Can manage deliveries and team members but not admins</li>
              <li><strong>Viewer:</strong> Read-only access to all information</li>
            </ul>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Active Administrators ({admins.length})</h3>
        <div className="space-y-3">
          {admins.map((admin) => (
            <Card key={admin.id}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-lg">{admin.email}</p>
                    <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${getRoleBadgeColor(admin.role as AdminRole)}`}>
                      {getRoleIcon(admin.role as AdminRole)}
                      {admin.role.charAt(0).toUpperCase() + admin.role.slice(1)}
                    </span>
                    {admin.userId === user?.id && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                        You
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    Added {new Date(admin.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {isOwner && admin.userId !== user?.id && (
                  <div className="flex gap-2">
                    <select
                      value={admin.role}
                      onChange={(e) => handleUpdateRole(admin.id, e.target.value as AdminRole)}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                    >
                      <option value="owner">Owner</option>
                      <option value="manager">Manager</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <button
                      onClick={() => handleRemoveAdmin(admin.id, admin.email || "")}
                      className="px-3 py-1 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition flex items-center gap-1"
                    >
                      <Trash2 size={14} />
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {invitations.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Pending Invitations ({invitations.length})</h3>
          <div className="space-y-3">
            {invitations.map((invitation) => (
              <Card key={invitation.id}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Mail size={18} className="text-gray-400" />
                      <p className="font-semibold">{invitation.email}</p>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getRoleBadgeColor(invitation.role as AdminRole)}`}>
                        {invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1)}
                      </span>
                      <StatusBadge status="pending" />
                    </div>
                    <p className="text-sm text-gray-600">
                      Invited {new Date(invitation.createdAt).toLocaleDateString()} •
                      Expires {new Date(invitation.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                  {isOwner && (
                    <button
                      onClick={() => handleRevokeInvitation(invitation.id)}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 transition"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {showInviteModal && (
        <Modal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)} title="Invite Admin">
          <form onSubmit={handleInviteAdmin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Email Address</label>
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="admin@example.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as AdminRole)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
              >
                <option value="manager">Manager</option>
                <option value="viewer">Viewer</option>
                <option value="owner">Owner</option>
              </select>
              <p className="text-xs text-gray-600 mt-1">
                {inviteRole === "owner" && "Full control including admin management"}
                {inviteRole === "manager" && "Can manage deliveries and team but not admins"}
                {inviteRole === "viewer" && "Read-only access to all information"}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 bg-red-600 text-white py-2 rounded-lg font-semibold hover:bg-red-700 transition"
              >
                Send Invitation
              </button>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="flex-1 border border-gray-300 py-2 rounded-lg font-semibold hover:bg-gray-100 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
