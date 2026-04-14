import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { DealerAdmin, AdminRole } from '../../shared/schema';
import { AddressInput } from '../components/ui/AddressInput';
import { formatAddress, parseAddress } from '../lib/addressUtils';
import { getUserAdminRoles } from '../lib/adminInvitations';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { api } from '../lib/api';

interface AddressFields {
  street: string;
  city: string;
  state: string;
  zip: string;
}

export function Profile() {
  const navigate = useNavigate();
  const { user, role, logout } = useAuth();
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    defaultPickupAddress: { street: '', city: '', state: '', zip: '' } as AddressFields,
  });
  const [loading, setLoading] = useState(false);
  const [adminRoles, setAdminRoles] = useState<DealerAdmin[]>([]);
  const [dealerNames, setDealerNames] = useState<Record<string, string>>({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (user && role) {
      loadProfileData();
      loadAdminRoles();
    }
  }, [user, role]);

  const loadProfileData = async () => {
    if (!user || !role) return;

    try {
      let data: any = null;
      if (role === 'dealer') {
        const result = await api.dealers.current();
        data = result.dealer;
      } else if (role === 'sales') {
        data = await api.sales.current();
      } else if (role === 'driver') {
        data = await api.drivers.current();
      }

      if (data) {
        const defaultAddress: AddressFields = {
          street: data.defaultPickupStreet || '',
          city: data.defaultPickupCity || '',
          state: data.defaultPickupState || '',
          zip: data.defaultPickupZip || '',
        };

        if (!defaultAddress.street && data.defaultPickupLocation) {
          const parsed = parseAddress(data.defaultPickupLocation);
          defaultAddress.street = parsed.street || '';
          defaultAddress.city = parsed.city || '';
          defaultAddress.state = parsed.state || '';
          defaultAddress.zip = parsed.zip || '';
        }

        setFormData({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          password: '',
          defaultPickupAddress: defaultAddress,
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const loadAdminRoles = async () => {
    if (!user) return;

    const roles = await getUserAdminRoles(user.id);
    setAdminRoles(roles);

    if (roles.length > 0) {
      try {
        const dealers = await api.dealers.list();
        const namesMap: Record<string, string> = {};
        dealers.forEach((dealer: any) => {
          namesMap[dealer.id] = dealer.name;
        });
        setDealerNames(namesMap);
      } catch (error) {
        console.error('Error loading dealer names:', error);
      }
    }
  };

  const getRoleBadgeColor = (adminRole: AdminRole) => {
    switch (adminRole) {
      case "owner":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "manager":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "viewer":
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !role) return;

    setLoading(true);

    try {
      const updates: any = {
        name: formData.name,
        phone: formData.phone,
      };

      if (role === 'sales') {
        const formatted = formatAddress(formData.defaultPickupAddress);
        updates.defaultPickupLocation = formatted || null;
        updates.defaultPickupStreet = formData.defaultPickupAddress.street || null;
        updates.defaultPickupCity = formData.defaultPickupAddress.city || null;
        updates.defaultPickupState = formData.defaultPickupAddress.state || null;
        updates.defaultPickupZip = formData.defaultPickupAddress.zip || null;
      }

      await api.user.updateProfile(updates);

      if (formData.password) {
        await api.user.changePassword(formData.password);
      }

      showToast('Profile updated successfully!', 'success');
      setFormData({ ...formData, password: '' });
    } catch (err: any) {
      showToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    setIsDeleting(true);

    try {
      await api.user.deleteAccount();
      await logout();
      navigate('/');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete account', 'error');
      setShowDeleteModal(false);
      setIsDeleting(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 py-12 px-4">
      <div className="container mx-auto max-w-md">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-300 hover:text-red-400 mb-6 transition"
        >
          <ArrowLeft size={20} className="mr-2" />
          Back
        </button>

        <div className="bg-white rounded-lg shadow-xl p-8">
          <h1 className="text-3xl font-bold mb-6 text-center">Profile Settings</h1>

          {adminRoles.length > 0 && (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <Shield className="text-blue-600 mt-0.5" size={20} />
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 mb-2">Administrator Access</p>
                  <div className="space-y-2">
                    {adminRoles.map((adminRole) => (
                      <div key={adminRole.id} className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getRoleBadgeColor(adminRole.role as AdminRole)}`}>
                          {adminRole.role.charAt(0).toUpperCase() + adminRole.role.slice(1)}
                        </span>
                        <span className="text-sm text-gray-700">
                          {dealerNames[adminRole.dealerId] || 'Loading...'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                disabled
                value={formData.email}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Phone</label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
              />
            </div>

            {role === 'sales' && (
              <div>
                <AddressInput
                  label="Default Pickup Location"
                  value={formData.defaultPickupAddress}
                  onChange={(address) => setFormData({ ...formData, defaultPickupAddress: address })}
                  required={false}
                />
                <p className="text-xs text-gray-500 mt-2">This address will be automatically filled when requesting new deliveries</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">New Password</label>
              <input
                type="password"
                minLength={6}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Leave blank to keep current password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Leave blank if you don't want to change your password</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition disabled:bg-gray-400 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 min-h-[48px]"
              data-testid="button-save-profile"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Saving...</span>
                </span>
              ) : (
                'Save Changes'
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-red-900 mb-2 flex items-center gap-2">
                <Trash2 size={16} />
                Delete Account
              </h3>
              <p className="text-xs text-red-700 mb-3">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="text-sm px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium focus:ring-2 focus:ring-red-500 focus:ring-offset-2 min-h-[44px]"
                data-testid="button-delete-account"
              >
                Delete My Account
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
        title="Delete Account"
        message="Are you sure you want to delete your account? This will permanently remove all your data including deliveries, messages, and profile information. This action cannot be undone."
        confirmText="Delete Account"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
