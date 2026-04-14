import { useState } from "react";
import { Dealer } from "../../../shared/schema";
import { Modal } from "../ui/Modal";

interface EditDealerProfileModalProps {
  dealer: Dealer;
  onClose: () => void;
  onSave: (updatedDealer: Partial<Dealer>) => Promise<void>;
}

export function EditDealerProfileModal({ dealer, onClose, onSave }: EditDealerProfileModalProps) {
  const [formData, setFormData] = useState({
    name: dealer.name,
    address: dealer.address,
    email: dealer.email,
    phone: dealer.phone,
    hourlyRate: dealer.hourlyRate || 2500,
  });
  const [hourlyRateInput, setHourlyRateInput] = useState(((dealer.hourlyRate || 2500) / 100).toFixed(2));
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedRate = parseFloat(hourlyRateInput);
    if (isNaN(parsedRate) || parsedRate < 1) {
      return;
    }
    setSaving(true);
    try {
      await onSave({
        ...formData,
        hourlyRate: Math.round(parsedRate * 100)
      });
      onClose();
    } catch (error) {
      console.error("Error saving:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Edit Dealership Profile">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Dealership Name</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Address</label>
          <input
            type="text"
            required
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Email</label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
          />
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

        <div>
          <label className="block text-sm font-medium mb-2">Driver Hourly Rate</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
            <input
              type="number"
              min="1"
              step="0.01"
              required
              value={hourlyRateInput}
              onChange={(e) => setHourlyRateInput(e.target.value)}
              className="w-full pl-8 pr-16 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
              data-testid="input-hourly-rate"
            />
            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">/hour</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">This is what drivers see as their estimated earnings per hour</p>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-red-600 text-white py-2 rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 border border-gray-300 py-2 rounded-lg font-semibold hover:bg-gray-100 transition disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
