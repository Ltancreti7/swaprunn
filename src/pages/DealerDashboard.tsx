import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Truck,
  Users,
  UserCircle,
  Search,
  FileCheck,
  Shield,
  ChevronRight,
  Clock,
  AlertCircle,
  Settings,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { useDebounce } from "../hooks/useDebounce";
import { api } from "../lib/api";
import type { Dealer, Delivery, Driver, Sales, DriverApplication, AdminRole, AddressFields } from "../../shared/schema";
import { AddressInput } from "../components/ui/AddressInput";
import { formatAddress } from "../lib/addressUtils";
import { StatusBadge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { DashboardSkeleton } from "../components/ui/LoadingSkeleton";
import { ApplicationActionModal } from "../components/dealer/ApplicationActionModal";
import { EditDealerProfileModal } from "../components/dealer/EditDealerProfileModal";
import { AdminManagement } from "../components/dealer/AdminManagement";
import { DriverSelectionModal } from "../components/dealer/DriverSelectionModal";

export function DealerDashboard() {
  const navigate = useNavigate();
  const { user, role, sales } = useAuth();
  const { showToast } = useToast();
  const [dealer, setDealer] = useState<Dealer | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<AdminRole | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "deliveries" | "team">("overview");
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [salesTeam, setSalesTeam] = useState<Sales[]>([]);
  const [pendingSales, setPendingSales] = useState<Sales[]>([]);
  const [pendingManagers, setPendingManagers] = useState<{ id: string; role: string; email: string; name: string; status: string; createdAt: string }[]>([]);
  const [driverApplications, setDriverApplications] = useState<(DriverApplication & { driver: Driver })[]>([]);
  const [pendingApplicationsCount, setPendingApplicationsCount] = useState(0);
  const [approvedDriverDealers, setApprovedDriverDealers] = useState<{
    driverId: string;
    dealerId: string;
    isVerified: boolean;
    verifiedAt: string | null;
    verificationNotes: string | null;
  }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreatingDelivery, setIsCreatingDelivery] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showNewDeliveryModal, setShowNewDeliveryModal] = useState(false);
  const [showAddTeamModal, setShowAddTeamModal] = useState(false);
  const [addTeamType, setAddTeamType] = useState<"sales" | "driver" | "admin">("sales");
  const [showApplicationsPanel, setShowApplicationsPanel] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [newDelivery, setNewDelivery] = useState({
    pickupAddress: { street: '', city: '', state: '', zip: '' } as AddressFields,
    dropoffAddress: { street: '', city: '', state: '', zip: '' } as AddressFields,
    vin: "",
    notes: "",
    driverId: "",
  });
  const [newTeamMember, setNewTeamMember] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
    can_drive_manual: "false",
    radius: "50",
  });
  const [modalAction, setModalAction] = useState<{
    application: DriverApplication & { driver: Driver };
    action: 'approve' | 'reject' | 'followup';
  } | null>(null);
  const [showDriverSelection, setShowDriverSelection] = useState(false);

  useEffect(() => {
    if (user) {
      loadDealerData();
    }
  }, [user]);

  const loadDealerData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { dealer: dealerData, adminRole } = await api.dealers.current();
      if (dealerData) {
        setDealer(dealerData);
        setCurrentUserRole(adminRole as AdminRole);
        await Promise.all([
          loadDeliveries(dealerData.id),
          loadSalesTeam(dealerData.id),
          loadDrivers(dealerData.id),
          loadApplications(dealerData.id),
          loadPendingManagers(dealerData.id),
        ]);
      } else {
        navigate("/complete-profile");
      }
    } catch (err) {
      console.error("Error loading dealer data:", err);
      navigate("/complete-profile");
    }
    setLoading(false);
  };

  const loadDeliveries = async (dealershipId: string) => {
    try {
      const data = await api.deliveries.byDealer(dealershipId);
      setDeliveries(data || []);
    } catch (err) {
      console.error(err);
      showToast("Failed to load deliveries", "error");
    }
  };

  const loadDrivers = async (dealerId: string) => {
    try {
      const data = await api.drivers.approvedByDealer(dealerId);
      const activeDrivers = (data || []).filter((d: Driver) => d.status === "active");
      setDrivers(activeDrivers);
    } catch (err) {
      console.error("Error loading drivers:", err);
      setDrivers([]);
    }
  };

  const loadSalesTeam = async (dealerId: string) => {
    try {
      const data = await api.sales.byDealer(dealerId);
      const activeSales = (data || []).filter((s: Sales) => s.status === "active");
      // Include both pending_signup (invited) and pending (self-signup) statuses
      const pendingSalesData = (data || []).filter((s: Sales) => 
        s.status === "pending_signup" || s.status === "pending"
      );
      setSalesTeam(activeSales);
      setPendingSales(pendingSalesData);
    } catch (err) {
      console.error("Error loading sales team:", err);
      setSalesTeam([]);
      setPendingSales([]);
    }
  };

  const handleApproveSales = async (salesId: string) => {
    if (!dealer) return;
    try {
      await api.sales.approve(salesId);
      showToast("Sales staff approved!", "success");
      await loadSalesTeam(dealer.id);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to approve";
      showToast(message, "error");
    }
  };

  const handleRejectSales = async (salesId: string) => {
    if (!dealer) return;
    try {
      await api.sales.reject(salesId, "Your request was not approved by the dealership.");
      showToast("Sales staff rejected", "success");
      await loadSalesTeam(dealer.id);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to reject";
      showToast(message, "error");
    }
  };

  const loadPendingManagers = async (dealerId: string) => {
    try {
      const data = await api.dealerAdmins.pendingByDealer(dealerId);
      setPendingManagers(data || []);
    } catch (err) {
      console.error("Error loading pending managers:", err);
      setPendingManagers([]);
    }
  };

  const handleApproveManager = async (adminId: string) => {
    if (!dealer) return;
    try {
      await api.dealerAdmins.approve(adminId);
      showToast("Manager approved!", "success");
      await loadPendingManagers(dealer.id);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to approve";
      showToast(message, "error");
    }
  };

  const handleRejectManager = async (adminId: string) => {
    if (!dealer) return;
    try {
      await api.dealerAdmins.reject(adminId);
      showToast("Manager request rejected", "success");
      await loadPendingManagers(dealer.id);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to reject";
      showToast(message, "error");
    }
  };

  const loadApplications = async (dealerId: string) => {
    try {
      const data = await api.driverApplications.byDealer(dealerId);
      const validApplications = (data || []).filter((app: any) => app.driver != null);
      setDriverApplications(validApplications as (DriverApplication & { driver: Driver })[]);
      const pendingCount = validApplications.filter((app: any) => app.status === "pending").length;
      setPendingApplicationsCount(pendingCount);
      
      const approvals = await api.approvedDriverDealers.list();
      const dealerApprovals = (approvals || []).filter((a: any) => a.dealerId === dealerId || a.dealer_id === dealerId);
      setApprovedDriverDealers(dealerApprovals.map((a: any) => ({
        driverId: a.driverId || a.driver_id,
        dealerId: a.dealerId || a.dealer_id,
        isVerified: a.isVerified || a.is_verified || false,
        verifiedAt: a.verifiedAt || a.verified_at || null,
        verificationNotes: a.verificationNotes || a.verification_notes || null,
      })));
    } catch (err: unknown) {
      console.error("Exception loading applications:", err);
      setDriverApplications([]);
      setPendingApplicationsCount(0);
    }
  };

  const handleVerificationToggle = async (driverId: string, currentlyVerified: boolean) => {
    if (!dealer) return;
    try {
      await api.approvedDriverDealers.updateVerification(driverId, dealer.id, !currentlyVerified);
      showToast(
        !currentlyVerified 
          ? "Driver verified - they can now accept deliveries" 
          : "Driver verification removed",
        "success"
      );
      await loadApplications(dealer.id);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update verification";
      showToast(message, "error");
    }
  };

  const handleApproveApplication = async (application: DriverApplication & { driver: Driver }) => {
    if (!dealer) return;
    try {
      await api.driverApplications.update(application.id, {
        status: "approved",
        reviewedAt: new Date().toISOString(),
      });
      await api.approvedDriverDealers.create({
        driverId: application.driverId,
        dealerId: dealer.id,
      });
      if (application.driver.userId) {
        await api.notifications.create({
          userId: application.driver.userId,
          deliveryId: null,
          type: "application_approved",
          title: "Application Approved",
          message: `Your application to ${dealer.name} has been approved!`,
          read: false,
        });
      }
      showToast(`${application.driver.name} approved!`, "success");
      await loadApplications(dealer.id);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to approve application";
      showToast(message, "error");
    }
  };

  const handleRejectApplication = async (application: DriverApplication & { driver: Driver }, notes: string) => {
    if (!dealer) return;
    try {
      await api.driverApplications.update(application.id, {
        status: "rejected",
        reviewedAt: new Date().toISOString(),
      });
      if (application.driver.userId && notes) {
        await api.notifications.create({
          userId: application.driver.userId,
          deliveryId: null,
          type: "application_rejected",
          title: "Application Update",
          message: `Your application to ${dealer.name}: ${notes}`,
          read: false,
        });
      }
      showToast("Application rejected", "success");
      await loadApplications(dealer.id);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to reject application";
      showToast(message, "error");
    }
  };

  const handleFollowUpApplication = async (application: DriverApplication & { driver: Driver }, msgContent: string) => {
    if (!dealer || !user) return;
    try {
      if (application.driver.userId) {
        await api.notifications.create({
          userId: application.driver.userId,
          deliveryId: null,
          type: "application_followup",
          title: `Message from ${dealer.name}`,
          message: msgContent,
          read: false,
        });
      }
      showToast("Message sent to driver", "success");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to send message";
      showToast(message, "error");
    }
  };

  const handleModalConfirm = async (notes: string) => {
    if (!modalAction) return;
    const { application, action } = modalAction;
    if (action === 'approve') {
      await handleApproveApplication(application);
    } else if (action === 'reject') {
      await handleRejectApplication(application, notes);
    } else if (action === 'followup') {
      await handleFollowUpApplication(application, notes);
    }
    setModalAction(null);
  };

  const handleCreateDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dealer || isCreatingDelivery) return;
    setIsCreatingDelivery(true);
    const dealershipId = dealer.id;
    const salesId = role === "sales" ? sales?.id || null : null;
    const pickupAddress = formatAddress(newDelivery.pickupAddress);
    const dropoffAddress = formatAddress(newDelivery.dropoffAddress);
    const status = newDelivery.driverId ? "pending_driver_acceptance" : "pending";

    try {
      await api.deliveries.create({
        dealerId: dealershipId,
        salesId: salesId,
        driverId: newDelivery.driverId || null,
        vin: newDelivery.vin,
        pickup: pickupAddress,
        dropoff: dropoffAddress,
        notes: newDelivery.notes,
        status,
      });
      showToast("Delivery created!", "success");
      setNewDelivery({
        pickupAddress: { street: "", city: "", state: "", zip: "" },
        dropoffAddress: { street: "", city: "", state: "", zip: "" },
        vin: "",
        notes: "",
        driverId: "",
      });
      setShowNewDeliveryModal(false);
      setShowDriverSelection(false);
      await loadDeliveries(dealershipId);
    } catch (error) {
      console.error(error);
      showToast("Failed to create delivery", "error");
    } finally {
      setIsCreatingDelivery(false);
    }
  };

  const handleAddTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dealer) return;
    try {
      if (addTeamType === "sales") {
        await api.sales.create({
          dealerId: dealer.id,
          name: newTeamMember.name,
          email: newTeamMember.email,
          phone: newTeamMember.phone,
          role: newTeamMember.role || null,
          status: "pending_signup",
        });
        await loadSalesTeam(dealer.id);
        showToast(`${newTeamMember.name} added! They can sign up using ${newTeamMember.email}`, "success");
      } else if (addTeamType === "driver") {
        await api.drivers.create({
          dealerId: dealer.id,
          name: newTeamMember.name,
          email: newTeamMember.email,
          phone: newTeamMember.phone,
          canDriveManual: newTeamMember.can_drive_manual === "true",
          radius: parseInt(newTeamMember.radius),
          status: "pending_signup",
        });
        await loadDrivers(dealer.id);
        showToast(`${newTeamMember.name} added! They can sign up using ${newTeamMember.email}`, "success");
      } else if (addTeamType === "admin") {
        await api.adminInvitations.create({
          dealerId: dealer.id,
          email: newTeamMember.email,
          role: (newTeamMember.role || "manager") as "owner" | "manager" | "viewer",
        });
        showToast(`Invitation sent to ${newTeamMember.email}`, "success");
      }
      setNewTeamMember({ name: "", email: "", phone: "", role: "", can_drive_manual: "false", radius: "50" });
      setShowAddTeamModal(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to add team member";
      showToast(message, "error");
    }
  };

  const handleDeleteTeamMember = async (memberId: string, memberType: "sales" | "driver") => {
    if (!dealer) return;
    if (!confirm("Are you sure you want to remove this team member?")) return;
    try {
      if (memberType === "sales") {
        await api.sales.delete(memberId);
        await loadSalesTeam(dealer.id);
      } else {
        await api.drivers.delete(memberId);
        await loadDrivers(dealer.id);
      }
      showToast("Team member removed", "success");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to remove team member";
      showToast(message, "error");
    }
  };

  const handleUpdateDealerProfile = async (updatedData: Partial<Dealer>) => {
    if (!dealer) return;
    try {
      await api.dealers.update(dealer.id, updatedData);
      setDealer({ ...dealer, ...updatedData } as Dealer);
      showToast("Profile updated!", "success");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update profile";
      showToast(message, "error");
      throw err;
    }
  };

  const filteredDeliveries = deliveries.filter((delivery) => {
    const matchesSearch =
      delivery.vin.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
      delivery.pickup.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
      delivery.dropoff.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || delivery.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeDeliveries = deliveries.filter(d => d.status !== 'completed' && d.status !== 'cancelled');
  const pendingApps = driverApplications.filter(app => app.status === "pending");

  if (loading && !dealer) {
    return (
      <div className="min-h-screen bg-gray-50 pb-12">
        <div className="container mx-auto px-4 py-8">
          <DashboardSkeleton />
        </div>
      </div>
    );
  }

  if (!dealer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <UserCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Complete Your Profile</h2>
          <p className="text-gray-600 mb-4">Finish your dealer registration to access the dashboard.</p>
          <button
            onClick={() => navigate("/complete-profile")}
            className="bg-red-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-red-700 transition"
          >
            Complete Profile
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 pb-12">
      {/* Header */}
      <div className="bg-neutral-900/50 sticky top-0 z-40 border-b border-neutral-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">{dealer.name}</h1>
              <p className="text-sm text-gray-400">{dealer.address}</p>
            </div>
            <div className="flex items-center gap-3">
              {pendingApplicationsCount > 0 && (
                <button
                  onClick={() => setShowApplicationsPanel(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-neutral-700 text-white rounded-lg font-medium hover:bg-neutral-600 transition border border-neutral-600"
                  data-testid="button-view-applications"
                >
                  <AlertCircle size={18} />
                  {pendingApplicationsCount} Application{pendingApplicationsCount !== 1 ? 's' : ''}
                </button>
              )}
              <button
                onClick={() => setShowEditProfile(true)}
                className="p-2 text-white hover:bg-white/20 rounded-lg transition"
                data-testid="button-edit-profile"
              >
                <Settings size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="bg-neutral-800/50 border-b border-neutral-700">
        <div className="container mx-auto px-4">
          <div className="flex gap-1">
            {[
              { id: "overview", label: "Overview", badge: 0 },
              { id: "deliveries", label: "Deliveries", badge: 0 },
              { id: "team", label: "Team", badge: pendingSales.length + pendingManagers.length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-6 py-4 font-medium transition border-b-2 flex items-center gap-2 ${
                  activeTab === tab.id
                    ? "text-red-400 border-red-400"
                    : "text-gray-500 border-transparent hover:text-white"
                }`}
                data-testid={`tab-${tab.id}`}
              >
                {tab.label}
                {tab.badge > 0 && (
                  <span 
                    className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center"
                    data-testid={`badge-${tab.id}-pending`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Pending Managers Alert */}
            {pendingManagers.length > 0 && (
              <Card className="p-4 bg-neutral-800 border-neutral-600">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-neutral-700 rounded-full">
                      <Shield className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-white" data-testid="text-pending-managers-count">
                        {pendingManagers.length} Manager{pendingManagers.length !== 1 ? 's' : ''} Requesting Access
                      </p>
                      <p className="text-sm text-gray-400" data-testid="text-pending-managers-names">
                        {pendingManagers.map(m => m.name || m.email.split('@')[0]).join(', ')} requested admin access
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => setActiveTab("team")}
                    className="bg-neutral-600 hover:bg-neutral-500"
                    data-testid="button-review-pending-managers"
                  >
                    Review
                  </Button>
                </div>
              </Card>
            )}

            {/* Pending Sales Alert */}
            {pendingSales.length > 0 && (
              <Card className="p-4 bg-neutral-800 border-neutral-600">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-neutral-700 rounded-full">
                      <AlertCircle className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-white" data-testid="text-pending-sales-count">
                        {pendingSales.length} Sales Staff Pending Approval
                      </p>
                      <p className="text-sm text-gray-400" data-testid="text-pending-sales-names">
                        {pendingSales.map(s => s.name).join(', ')} signed up and {pendingSales.length === 1 ? 'needs' : 'need'} your approval
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => setActiveTab("team")}
                    className="bg-neutral-600 hover:bg-neutral-500"
                    data-testid="button-review-pending-sales"
                  >
                    Review
                  </Button>
                </div>
              </Card>
            )}

            {/* Pending Driver Applications Alert */}
            {pendingApplicationsCount > 0 && (
              <Card className="p-4 bg-neutral-800 border-neutral-600">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-neutral-700 rounded-full">
                      <UserCircle className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-white" data-testid="text-pending-drivers-count">
                        {pendingApplicationsCount} Driver Application{pendingApplicationsCount !== 1 ? 's' : ''} Pending
                      </p>
                      <p className="text-sm text-gray-400" data-testid="text-pending-drivers-names">
                        {driverApplications
                          .filter(app => app.status === "pending")
                          .map(app => app.driver?.name || 'Unknown')
                          .join(', ')} applied to work with your dealership
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => setShowApplicationsPanel(true)}
                    className="bg-neutral-600 hover:bg-neutral-500"
                    data-testid="button-review-pending-drivers"
                  >
                    Review
                  </Button>
                </div>
              </Card>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4 text-center bg-neutral-800 border-neutral-700">
                <Truck className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{activeDeliveries.length}</p>
                <p className="text-sm text-gray-500">Active Deliveries</p>
              </Card>
              <Card className="p-4 text-center bg-neutral-800 border-neutral-700">
                <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{salesTeam.length}</p>
                <p className="text-sm text-gray-500">Sales Staff</p>
              </Card>
              <Card className="p-4 text-center bg-neutral-800 border-neutral-700">
                <UserCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{drivers.length}</p>
                <p className="text-sm text-gray-500">Drivers</p>
              </Card>
              <Card className="p-4 text-center bg-neutral-800 border-neutral-700">
                <FileCheck className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{pendingApplicationsCount}</p>
                <p className="text-sm text-gray-500">Pending Apps</p>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid md:grid-cols-2 gap-4">
              <button
                onClick={() => setShowNewDeliveryModal(true)}
                className="flex items-center justify-between p-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition shadow-md"
                data-testid="button-new-delivery"
              >
                <div className="flex items-center gap-3">
                  <Plus size={24} />
                  <span className="font-semibold text-lg">Create Delivery</span>
                </div>
                <ChevronRight size={24} />
              </button>
              <button
                onClick={() => { setAddTeamType("sales"); setShowAddTeamModal(true); }}
                className="flex items-center justify-between p-4 bg-neutral-700 text-white rounded-lg hover:bg-neutral-600 transition border border-neutral-500"
                data-testid="button-add-team"
              >
                <div className="flex items-center gap-3">
                  <Users size={24} />
                  <span className="font-semibold text-lg">Add Team Member</span>
                </div>
                <ChevronRight size={24} />
              </button>
            </div>

            {/* Action Items */}
            {(pendingApps.length > 0 || activeDeliveries.length > 0) && (
              <div>
                <h2 className="text-lg font-semibold mb-4 text-white">Needs Your Attention</h2>
                <div className="space-y-3">
                  {pendingApps.slice(0, 3).map((app) => (
                    <Card key={app.id} className="p-4 bg-neutral-800 border-neutral-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-neutral-700 rounded-full flex items-center justify-center">
                            <UserCircle className="w-6 h-6 text-gray-400" />
                          </div>
                          <div>
                            <p className="font-medium text-white">{app.driver?.name} wants to drive for you</p>
                            <p className="text-sm text-gray-400">Applied {new Date(app.appliedAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setModalAction({ application: app, action: 'approve' })}
                          className="px-4 py-2 bg-neutral-600 text-white rounded-lg text-sm font-medium hover:bg-neutral-500 transition"
                        >
                          Review
                        </button>
                      </div>
                    </Card>
                  ))}
                  {activeDeliveries.filter(d => d.status === 'pending').slice(0, 3).map((delivery) => (
                    <Card key={delivery.id} className="p-4 bg-neutral-800 border-neutral-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-neutral-700 rounded-full flex items-center justify-center">
                            <Clock className="w-6 h-6 text-gray-400" />
                          </div>
                          <div>
                            <p className="font-medium text-white">Delivery needs a driver</p>
                            <p className="text-sm text-gray-400">VIN: {delivery.vin}</p>
                          </div>
                        </div>
                        <StatusBadge status={(delivery.status || "pending") as "pending" | "completed" | "cancelled" | "pending_driver_acceptance" | "assigned" | "in_transit"} />
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State for New Dealers */}
            {salesTeam.length === 0 && drivers.length === 0 && activeDeliveries.length === 0 && (
              <Card className="p-8 text-center bg-neutral-800 border-neutral-700">
                <h3 className="text-xl font-semibold mb-2 text-white">Welcome to SwapRunn!</h3>
                <p className="text-gray-400 mb-6">Get started by adding your first team member or creating a delivery.</p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={() => { setAddTeamType("sales"); setShowAddTeamModal(true); }}
                    className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition"
                  >
                    Add Salesperson
                  </button>
                  <button
                    onClick={() => setShowNewDeliveryModal(true)}
                    className="px-6 py-3 border border-neutral-600 text-white rounded-lg font-semibold hover:bg-neutral-700 transition"
                  >
                    Create Delivery
                  </button>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* DELIVERIES TAB */}
        {activeTab === "deliveries" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex-1 w-full sm:max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                  <input
                    type="text"
                    placeholder="Search by VIN or address..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-neutral-800 border border-neutral-600 text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                    data-testid="input-delivery-search"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 bg-neutral-800 border border-neutral-600 text-white rounded-lg focus:ring-2 focus:ring-red-600"
                  data-testid="select-status-filter"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="pending_driver_acceptance">Awaiting Driver</option>
                  <option value="assigned">Assigned</option>
                  <option value="in_transit">In Transit</option>
                  <option value="completed">Completed</option>
                </select>
                <button
                  onClick={() => setShowNewDeliveryModal(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition flex items-center gap-2"
                  data-testid="button-new-delivery-list"
                >
                  <Plus size={20} />
                  New
                </button>
              </div>
            </div>

            {filteredDeliveries.length === 0 ? (
              <EmptyState
                icon={Truck}
                title="No deliveries found"
                description={searchQuery || statusFilter !== "all" ? "Try adjusting your filters" : "Create your first delivery to get started"}
              />
            ) : (
              <div className="space-y-3">
                {filteredDeliveries.map((delivery) => (
                  <Card key={delivery.id} className="p-4 bg-neutral-800 border-neutral-700">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-semibold text-white">VIN: {delivery.vin}</p>
                          <StatusBadge status={(delivery.status || "pending") as "pending" | "completed" | "cancelled" | "pending_driver_acceptance" | "assigned" | "in_transit"} />
                        </div>
                        <p className="text-sm text-gray-400">From: {delivery.pickup}</p>
                        <p className="text-sm text-gray-400">To: {delivery.dropoff}</p>
                      </div>
                      <button
                        onClick={() => navigate(`/delivery/${delivery.id}`)}
                        className="px-4 py-2 border border-neutral-600 text-white rounded-lg text-sm font-medium hover:bg-neutral-700 transition"
                        data-testid={`button-view-delivery-${delivery.id}`}
                      >
                        View Details
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TEAM TAB */}
        {activeTab === "team" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Your Team</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => { setAddTeamType("sales"); setShowAddTeamModal(true); }}
                  className="px-4 py-2 bg-neutral-700 text-white rounded-lg font-medium hover:bg-neutral-600 transition flex items-center gap-2 border border-neutral-600"
                  data-testid="button-add-sales"
                >
                  <Plus size={18} />
                  Add Sales
                </button>
                <button
                  onClick={() => setShowAdminPanel(true)}
                  className="px-4 py-2 border border-neutral-600 text-white rounded-lg font-medium hover:bg-neutral-700 transition flex items-center gap-2"
                  data-testid="button-manage-admins"
                >
                  <Shield size={18} />
                  Admins
                </button>
              </div>
            </div>

            {/* Pending Managers */}
            {pendingManagers.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
                  Pending Manager Requests ({pendingManagers.length})
                </h3>
                <div className="grid md:grid-cols-2 gap-3">
                  {pendingManagers.map((manager) => (
                    <Card key={manager.id} className="p-4 border-neutral-600 bg-neutral-800">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Shield size={16} className="text-gray-400" />
                            <p className="font-medium text-white">{manager.name || manager.email.split('@')[0]}</p>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-700 text-gray-300">
                              Needs Approval
                            </span>
                          </div>
                          <p className="text-sm text-gray-400">{manager.email}</p>
                          <p className="text-xs text-gray-500">{manager.role}</p>
                        </div>
                        {currentUserRole !== "viewer" && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleApproveManager(manager.id)}
                              className="px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition"
                              data-testid={`button-approve-manager-${manager.id}`}
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectManager(manager.id)}
                              className="px-3 py-1 bg-neutral-700 text-gray-300 text-sm rounded-lg hover:bg-neutral-600 transition border border-neutral-600"
                              data-testid={`button-reject-manager-${manager.id}`}
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Sales Team */}
            <div>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Sales Staff ({salesTeam.length + pendingSales.length})</h3>
              {salesTeam.length === 0 && pendingSales.length === 0 ? (
                <Card className="p-6 text-center bg-neutral-800 border-neutral-700">
                  <Users className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                  <p className="text-gray-400">No sales staff yet</p>
                  <button
                    onClick={() => { setAddTeamType("sales"); setShowAddTeamModal(true); }}
                    className="mt-3 text-red-400 font-medium hover:underline"
                  >
                    Add your first salesperson
                  </button>
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 gap-3">
                  {[...salesTeam, ...pendingSales].map((member) => {
                    const isPending = member.status === "pending" || member.status === "pending_signup";
                    const isNewSignup = member.status === "pending";
                    return (
                      <Card key={member.id} className={`p-4 bg-neutral-800 border-neutral-700`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-white">{member.name}</p>
                              {isPending && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-700 text-gray-300">
                                  {isNewSignup ? 'Needs Approval' : 'Invited'}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-400">{member.email}</p>
                            {member.role && <p className="text-xs text-gray-500">{member.role}</p>}
                          </div>
                          {currentUserRole !== "viewer" && (
                            <div className="flex items-center gap-2">
                              {isNewSignup ? (
                                <>
                                  <button
                                    onClick={() => handleApproveSales(member.id)}
                                    className="px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition"
                                    data-testid={`button-approve-sales-${member.id}`}
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleRejectSales(member.id)}
                                    className="px-3 py-1 bg-neutral-700 text-gray-300 text-sm rounded-lg hover:bg-neutral-600 transition border border-neutral-600"
                                    data-testid={`button-reject-sales-${member.id}`}
                                  >
                                    Reject
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => handleDeleteTeamMember(member.id, "sales")}
                                  className="text-gray-400 text-sm hover:text-white hover:underline"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Drivers */}
            <div>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Approved Drivers ({drivers.length})</h3>
              {drivers.length === 0 ? (
                <Card className="p-6 text-center bg-neutral-800 border-neutral-700">
                  <UserCircle className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                  <p className="text-gray-400">No approved drivers yet</p>
                  <p className="text-sm text-gray-500 mt-1">Drivers will appear here after you approve their applications</p>
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 gap-3">
                  {drivers.map((driver) => {
                    const approval = approvedDriverDealers.find(a => a.driverId === driver.id);
                    const isVerified = approval?.isVerified || false;
                    return (
                      <Card key={driver.id} className="p-4 bg-neutral-800 border-neutral-700">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-white">{driver.name}</p>
                              {isVerified ? (
                                <span className="inline-flex items-center gap-1 text-xs bg-neutral-600 text-gray-200 px-2 py-0.5 rounded-full">
                                  <Shield size={12} />
                                  Verified
                                </span>
                              ) : (
                                <span className="text-xs bg-neutral-700 text-gray-400 px-2 py-0.5 rounded-full">Needs Verification</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-400">{driver.email}</p>
                            <p className="text-xs text-gray-500">{driver.radius} mi radius</p>
                          </div>
                          {currentUserRole !== "viewer" && (
                            <button
                              onClick={() => handleVerificationToggle(driver.id, isVerified)}
                              className={`px-3 py-1 text-sm rounded-lg transition ${
                                isVerified
                                  ? "border border-neutral-500 text-gray-300 hover:bg-neutral-700"
                                  : "bg-red-600 text-white hover:bg-red-700"
                              }`}
                            >
                              {isVerified ? "Unverify" : "Verify"}
                            </button>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* New Delivery Modal */}
      {showNewDeliveryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Create New Delivery</h2>
            </div>
            <form onSubmit={handleCreateDelivery} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Vehicle VIN</label>
                <input
                  type="text"
                  required
                  value={newDelivery.vin}
                  onChange={(e) => setNewDelivery({ ...newDelivery, vin: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                  placeholder="Enter VIN number"
                  data-testid="input-delivery-vin"
                />
              </div>
              <AddressInput
                label="Pickup Location"
                value={newDelivery.pickupAddress}
                onChange={(addr) => setNewDelivery({ ...newDelivery, pickupAddress: addr })}
              />
              <AddressInput
                label="Dropoff Location"
                value={newDelivery.dropoffAddress}
                onChange={(addr) => setNewDelivery({ ...newDelivery, dropoffAddress: addr })}
              />
              <div>
                <label className="block text-sm font-medium mb-2">Notes (optional)</label>
                <textarea
                  value={newDelivery.notes}
                  onChange={(e) => setNewDelivery({ ...newDelivery, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                  rows={2}
                  placeholder="Any special instructions..."
                  data-testid="input-delivery-notes"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Assign Driver (optional)</label>
                {newDelivery.driverId ? (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span>{drivers.find(d => d.id === newDelivery.driverId)?.name || "Selected Driver"}</span>
                    <button
                      type="button"
                      onClick={() => setNewDelivery({ ...newDelivery, driverId: "" })}
                      className="text-red-600 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowDriverSelection(true)}
                    className="w-full px-4 py-2 border border-dashed border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition"
                  >
                    + Select a Driver
                  </button>
                )}
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNewDeliveryModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingDelivery}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="button-submit-delivery"
                >
                  {isCreatingDelivery ? 'Creating...' : 'Create Delivery'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Team Member Modal */}
      {showAddTeamModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Add {addTeamType === "sales" ? "Salesperson" : addTeamType === "driver" ? "Driver" : "Admin"}</h2>
              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setAddTeamType("sales")}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    addTeamType === "sales" ? "bg-red-600 text-white" : "bg-gray-100 text-gray-700"
                  }`}
                >
                  Salesperson
                </button>
                <button
                  type="button"
                  onClick={() => setAddTeamType("driver")}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    addTeamType === "driver" ? "bg-red-600 text-white" : "bg-gray-100 text-gray-700"
                  }`}
                >
                  Driver
                </button>
                <button
                  type="button"
                  onClick={() => setAddTeamType("admin")}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    addTeamType === "admin" ? "bg-red-600 text-white" : "bg-gray-100 text-gray-700"
                  }`}
                >
                  Admin
                </button>
              </div>
            </div>
            <form onSubmit={handleAddTeamMember} className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                {addTeamType === "admin" 
                  ? "Enter their email. They'll receive an invitation to join as an admin."
                  : "Add their details here. They'll receive an email to complete their registration."}
              </div>
              {addTeamType !== "admin" && (
                <div>
                  <label className="block text-sm font-medium mb-2">Name</label>
                  <input
                    type="text"
                    required
                    value={newTeamMember.name}
                    onChange={(e) => setNewTeamMember({ ...newTeamMember, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                    data-testid="input-team-name"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  required
                  value={newTeamMember.email}
                  onChange={(e) => setNewTeamMember({ ...newTeamMember, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                  data-testid="input-team-email"
                />
              </div>
              {addTeamType !== "admin" && (
                <div>
                  <label className="block text-sm font-medium mb-2">Phone</label>
                  <input
                    type="tel"
                    required
                    value={newTeamMember.phone}
                    onChange={(e) => setNewTeamMember({ ...newTeamMember, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                    data-testid="input-team-phone"
                  />
                </div>
              )}
              {addTeamType === "sales" && (
                <div>
                  <label className="block text-sm font-medium mb-2">Role/Title (optional)</label>
                  <input
                    type="text"
                    value={newTeamMember.role}
                    onChange={(e) => setNewTeamMember({ ...newTeamMember, role: e.target.value })}
                    placeholder="e.g., Sales Manager"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                  />
                </div>
              )}
              {addTeamType === "driver" && (
                <div>
                  <label className="block text-sm font-medium mb-2">Service Radius (miles)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newTeamMember.radius}
                    onChange={(e) => setNewTeamMember({ ...newTeamMember, radius: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                  />
                </div>
              )}
              {addTeamType === "admin" && (
                <div>
                  <label className="block text-sm font-medium mb-2">Admin Role</label>
                  <select
                    value={newTeamMember.role || "manager"}
                    onChange={(e) => setNewTeamMember({ ...newTeamMember, role: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                  >
                    <option value="manager">Manager</option>
                    <option value="viewer">Viewer (Read-only)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Managers can create deliveries and manage team. Viewers have read-only access.</p>
                </div>
              )}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddTeamModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition"
                  data-testid="button-submit-team"
                >
                  Add {addTeamType === "sales" ? "Salesperson" : addTeamType === "driver" ? "Driver" : "Admin"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Applications Panel */}
      {showApplicationsPanel && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white rounded-t-lg sm:rounded-lg w-full sm:max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-white flex items-center justify-between">
              <h2 className="text-xl font-semibold">Driver Applications</h2>
              <button
                onClick={() => setShowApplicationsPanel(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </div>
            <div className="p-6">
              {pendingApps.length === 0 ? (
                <EmptyState
                  icon={FileCheck}
                  title="No pending applications"
                  description="You'll see new driver applications here"
                />
              ) : (
                <div className="space-y-4">
                  {pendingApps.map((app) => (
                    <Card key={app.id} className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-semibold">{app.driver?.name}</p>
                        <StatusBadge status="pending" />
                      </div>
                      <p className="text-sm text-gray-600">{app.driver?.email}</p>
                      <p className="text-sm text-gray-600">{app.driver?.phone}</p>
                      {app.message && (
                        <p className="text-sm text-gray-700 mt-2 p-2 bg-gray-50 rounded">{app.message}</p>
                      )}
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => setModalAction({ application: app, action: 'approve' })}
                          className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => setModalAction({ application: app, action: 'reject' })}
                          className="flex-1 px-3 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50"
                        >
                          Reject
                        </button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Admin Panel */}
      {showAdminPanel && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white rounded-t-lg sm:rounded-lg w-full sm:max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-white flex items-center justify-between">
              <h2 className="text-xl font-semibold">Admin Management</h2>
              <button
                onClick={() => setShowAdminPanel(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </div>
            <div className="p-6">
              <AdminManagement dealerId={dealer.id} />
            </div>
          </div>
        </div>
      )}

      {/* Driver Selection Modal */}
      {showDriverSelection && dealer && user && (
        <DriverSelectionModal
          isOpen={showDriverSelection}
          onClose={() => setShowDriverSelection(false)}
          onSelectDriver={(driverId: string) => {
            setNewDelivery({ ...newDelivery, driverId });
            setShowDriverSelection(false);
          }}
          dealerId={dealer.id}
          currentUserId={user.id}
        />
      )}

      {/* Edit Profile Modal */}
      {showEditProfile && dealer && (
        <EditDealerProfileModal
          dealer={dealer}
          onClose={() => setShowEditProfile(false)}
          onSave={handleUpdateDealerProfile}
        />
      )}

      {/* Application Action Modal */}
      {modalAction && (
        <ApplicationActionModal
          application={modalAction.application}
          action={modalAction.action}
          onClose={() => setModalAction(null)}
          onConfirm={handleModalConfirm}
        />
      )}
    </div>
  );
}
