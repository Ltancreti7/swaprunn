import { MapPin, Mail, Phone, Edit2, Users, Truck, FileCheck, TrendingUp } from "lucide-react";
import { Dealer, AdminRole } from "../../../shared/schema";

interface ProfileHeaderProps {
  dealer: Dealer;
  currentUserRole: AdminRole | null;
  stats: {
    activeDeliveries: number;
    salesTeamCount: number;
    driversCount: number;
    pendingApplications: number;
  };
  onEditProfile: () => void;
  onApplicationsClick?: () => void;
}

export function ProfileHeader({ dealer, currentUserRole, stats, onEditProfile, onApplicationsClick }: ProfileHeaderProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadgeColor = (role: AdminRole) => {
    switch (role) {
      case "owner":
        return "bg-red-50 text-red-600 border-red-200";
      case "manager":
        return "bg-rose-50 text-rose-600 border-rose-200";
      case "viewer":
        return "bg-gray-100 text-gray-700 border-gray-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  return (
    <div className="bg-gradient-to-br from-red-50 to-white border-b border-gray-200">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-shrink-0">
            <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
              {getInitials(dealer.name)}
            </div>
          </div>

          <div className="flex-1">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900">{dealer.name}</h1>
                  {currentUserRole && (
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getRoleBadgeColor(currentUserRole)}`}>
                      {currentUserRole.charAt(0).toUpperCase() + currentUserRole.slice(1)}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  Member since {dealer.createdAt ? new Date(dealer.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Unknown'}
                </p>
              </div>

              {(currentUserRole === "owner" || currentUserRole === "manager") && (
                <button
                  onClick={onEditProfile}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition"
                >
                  <Edit2 size={16} />
                  Edit Profile
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div className="flex items-center gap-2 text-gray-700">
                <MapPin size={16} className="text-gray-400" />
                <span className="text-sm">{dealer.address}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <Mail size={16} className="text-gray-400" />
                <span className="text-sm">{dealer.email}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <Phone size={16} className="text-gray-400" />
                <span className="text-sm">{dealer.phone}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between mb-2">
              <Truck className="text-red-600" size={24} />
              <TrendingUp className="text-green-600" size={16} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.activeDeliveries}</p>
            <p className="text-sm text-gray-600">Active Deliveries</p>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between mb-2">
              <Users className="text-blue-600" size={24} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.salesTeamCount}</p>
            <p className="text-sm text-gray-600">Sales Team</p>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between mb-2">
              <Users className="text-green-600" size={24} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.driversCount}</p>
            <p className="text-sm text-gray-600">Active Drivers</p>
          </div>

          <button
            onClick={onApplicationsClick}
            className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition text-left w-full cursor-pointer"
            data-testid="button-pending-applications-stat"
          >
            <div className="flex items-center justify-between mb-2">
              <FileCheck className="text-red-700" size={24} />
              {stats.pendingApplications > 0 && (
                <span className="bg-red-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {stats.pendingApplications}
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.pendingApplications}</p>
            <p className="text-sm text-gray-600">Pending Applications</p>
          </button>
        </div>
      </div>
    </div>
  );
}
