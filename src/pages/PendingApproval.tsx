import { useNavigate } from "react-router-dom";
import { Clock, CheckCircle, LogOut } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useEffect, useState } from "react";
import { api } from "../lib/api";

export function PendingApproval() {
  const navigate = useNavigate();
  const { user, logout, refreshAuth } = useAuth();
  const [checking, setChecking] = useState(false);
  const [dealershipName, setDealershipName] = useState<string>("");

  useEffect(() => {
    checkApprovalStatus();
    loadDealershipInfo();
    
    const interval = setInterval(() => {
      checkApprovalStatus();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const loadDealershipInfo = async () => {
    try {
      const salesData = await api.sales.current();
      if (salesData?.dealer?.name) {
        setDealershipName(salesData.dealer.name);
      }
    } catch (err) {
      console.error("Failed to load dealership info:", err);
    }
  };

  const checkApprovalStatus = async () => {
    try {
      setChecking(true);
      await refreshAuth();
      
      const salesData = await api.sales.current();
      if (salesData?.status === "active") {
        navigate("/sales");
      }
    } catch (err) {
      console.error("Failed to check status:", err);
    } finally {
      setChecking(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock size={40} className="text-yellow-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Waiting for Approval
          </h1>
          
          <p className="text-gray-600 mb-6">
            Your account request has been submitted
            {dealershipName && (
              <span> to <strong>{dealershipName}</strong></span>
            )}
            . Your manager will review and approve your access.
          </p>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              {checking ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
                  <span>Checking status...</span>
                </>
              ) : (
                <>
                  <CheckCircle size={16} className="text-green-500" />
                  <span>We'll automatically redirect you once approved</span>
                </>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={checkApprovalStatus}
              disabled={checking}
              className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50"
              data-testid="button-check-status"
            >
              Check Status Now
            </button>
            
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 text-gray-600 hover:text-gray-900 py-2 transition"
              data-testid="button-logout"
            >
              <LogOut size={18} />
              <span>Sign Out</span>
            </button>
          </div>

          <p className="text-xs text-gray-400 mt-6">
            Logged in as {user?.email}
          </p>
        </div>
      </div>
    </div>
  );
}
