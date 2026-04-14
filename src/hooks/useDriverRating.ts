import { useState } from 'react';
import { api } from '../lib/api';

export function useDriverRating() {
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [pendingRating, setPendingRating] = useState<{
    driverId: string;
    driverName: string;
    dealerId: string;
    userId: string;
  } | null>(null);

  const promptForRating = (driverId: string, driverName: string, dealerId: string, userId: string) => {
    setPendingRating({ driverId, driverName, dealerId, userId });
    setIsRatingModalOpen(true);
  };

  const submitRating = async (rating: number) => {
    if (!pendingRating) return;

    const { driverId, dealerId } = pendingRating;

    await api.drivers.upsertPreference({
      driverId,
      dealerId,
      preferenceLevel: rating,
    });

    setIsRatingModalOpen(false);
    setPendingRating(null);
  };

  const closeRatingModal = () => {
    setIsRatingModalOpen(false);
    setPendingRating(null);
  };

  return {
    isRatingModalOpen,
    pendingRating,
    promptForRating,
    submitRating,
    closeRatingModal,
  };
}