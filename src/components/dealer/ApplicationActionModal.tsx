import { useState } from 'react';
import { X } from 'lucide-react';
import { DriverApplication, Driver } from '../../../shared/schema';

interface ApplicationActionModalProps {
  application: DriverApplication & { driver: Driver };
  action: 'approve' | 'reject' | 'followup';
  onClose: () => void;
  onConfirm: (notes: string) => void;
}

export function ApplicationActionModal({
  application,
  action,
  onClose,
  onConfirm,
}: ApplicationActionModalProps) {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onConfirm(notes);
      onClose();
    } catch (error) {
      console.error('Error in modal action:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (action) {
      case 'approve':
        return 'Approve Application';
      case 'reject':
        return 'Reject Application';
      case 'followup':
        return 'Follow Up with Driver';
      default:
        return 'Application Action';
    }
  };

  const getDescription = () => {
    switch (action) {
      case 'approve':
        return `Are you sure you want to approve ${application.driver.name}'s application? They will be able to see and accept your delivery requests.`;
      case 'reject':
        return `Provide optional feedback for ${application.driver.name} about why their application was not approved.`;
      case 'followup':
        return `Send a message to ${application.driver.name} to request more information or clarify details about their application.`;
      default:
        return '';
    }
  };

  const getButtonText = () => {
    switch (action) {
      case 'approve':
        return 'Approve Application';
      case 'reject':
        return 'Reject Application';
      case 'followup':
        return 'Send Message';
      default:
        return 'Confirm';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">{getTitle()}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-gray-600 text-sm">{getDescription()}</p>

          {action === 'approve' ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">
                <strong>Driver Details:</strong>
              </p>
              <ul className="text-sm text-green-700 mt-2 space-y-1">
                <li>• {application.driver.email}</li>
                <li>• {application.driver.phone}</li>
                <li>• {application.driver.canDriveManual ? 'Can drive manual' : 'Automatic only'}</li>
                <li>• {application.driver.radius} mile radius</li>
              </ul>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium mb-2">
                {action === 'reject' ? 'Feedback (Optional)' : 'Message to Driver'}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                required={action === 'followup'}
                placeholder={
                  action === 'reject'
                    ? 'e.g., We are looking for drivers with larger vehicles at this time.'
                    : 'e.g., Could you provide more information about your insurance coverage?'
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
              />
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading || (action === 'followup' && !notes.trim())}
              className={`flex-1 py-2 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${
                action === 'approve'
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : action === 'reject'
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {loading ? 'Processing...' : getButtonText()}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 border border-gray-300 py-2 rounded-lg font-semibold hover:bg-gray-100 transition disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
