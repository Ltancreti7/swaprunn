import { useState, useEffect } from 'react';
import { Trash2, Loader2, Camera } from 'lucide-react';

interface DeliveryPhoto {
  id: string;
  deliveryId: string;
  uploaderId: string;
  uploaderRole: string;
  photoType: string;
  objectPath: string;
  caption: string | null;
  createdAt: string | null;
}

interface DeliveryPhotoGalleryProps {
  deliveryId: string;
  currentUserId?: string;
  currentUserRole?: string;
  refreshTrigger?: number;
}

const PHOTO_TYPE_LABELS: Record<string, string> = {
  pickup: 'Pickup',
  dropoff: 'Dropoff',
  odometer: 'Odometer',
  damage: 'Damage',
  other: 'Other',
};

const PHOTO_TYPE_COLORS: Record<string, string> = {
  pickup: 'bg-blue-600/20 text-blue-400',
  dropoff: 'bg-green-600/20 text-green-400',
  odometer: 'bg-yellow-600/20 text-yellow-400',
  damage: 'bg-red-600/20 text-red-400',
  other: 'bg-neutral-600/20 text-neutral-400',
};

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function transformKeys(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(transformKeys);
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const result: any = {};
    for (const key of Object.keys(obj)) {
      result[snakeToCamel(key)] = transformKeys(obj[key]);
    }
    return result;
  }
  return obj;
}

export function DeliveryPhotoGallery({ deliveryId, currentUserId: _currentUserId, currentUserRole, refreshTrigger }: DeliveryPhotoGalleryProps) {
  const [photos, setPhotos] = useState<DeliveryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedPhoto, setExpandedPhoto] = useState<DeliveryPhoto | null>(null);

  const loadPhotos = async () => {
    try {
      const response = await fetch(`/api/deliveries/${deliveryId}/photos`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to load photos');
      const data = await response.json();
      setPhotos(transformKeys(data));
    } catch (error) {
      console.error('Failed to load photos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPhotos();
  }, [deliveryId, refreshTrigger]);

  const handleDelete = async (photoId: string) => {
    setDeletingId(photoId);
    try {
      const response = await fetch(`/api/delivery-photos/${photoId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete photo');
      setPhotos(prev => prev.filter(p => p.id !== photoId));
      if (expandedPhoto?.id === photoId) setExpandedPhoto(null);
    } catch (error) {
      console.error('Failed to delete photo:', error);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-neutral-500">
        <Camera className="w-8 h-8 mb-2" />
        <p className="text-sm">No photos yet</p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {photos.map((photo) => (
          <div
            key={photo.id}
            data-testid={`photo-card-${photo.id}`}
            className="relative group rounded-md overflow-hidden bg-neutral-700 cursor-pointer"
            onClick={() => setExpandedPhoto(photo)}
          >
            <img
              src={photo.objectPath}
              alt={photo.caption || photo.photoType}
              className="w-full h-24 sm:h-32 object-cover"
              loading="lazy"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
              <span className={`inline-block px-1.5 py-0.5 rounded-md text-xs font-medium ${PHOTO_TYPE_COLORS[photo.photoType] || PHOTO_TYPE_COLORS.other}`}>
                {PHOTO_TYPE_LABELS[photo.photoType] || photo.photoType}
              </span>
            </div>
            <div className="absolute top-1 right-1 flex items-center gap-1">
              <span className={`px-1.5 py-0.5 rounded-md text-xs font-medium ${
                photo.uploaderRole === 'driver' ? 'bg-purple-600/30 text-purple-300' : 'bg-blue-600/30 text-blue-300'
              }`}>
                {photo.uploaderRole === 'driver' ? 'Driver' : 'Sales'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {expandedPhoto && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setExpandedPhoto(null)}
          data-testid="photo-expanded-overlay"
        >
          <div
            className="relative max-w-lg w-full bg-neutral-800 rounded-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={expandedPhoto.objectPath}
              alt={expandedPhoto.caption || expandedPhoto.photoType}
              className="w-full max-h-[60vh] object-contain bg-black"
            />
            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium ${PHOTO_TYPE_COLORS[expandedPhoto.photoType] || PHOTO_TYPE_COLORS.other}`}>
                  {PHOTO_TYPE_LABELS[expandedPhoto.photoType] || expandedPhoto.photoType}
                </span>
                <span className="text-xs text-neutral-500">
                  {expandedPhoto.createdAt ? new Date(expandedPhoto.createdAt).toLocaleString() : ''}
                </span>
              </div>
              {expandedPhoto.caption && (
                <p className="text-sm text-neutral-300">{expandedPhoto.caption}</p>
              )}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className={`text-xs ${
                  expandedPhoto.uploaderRole === 'driver' ? 'text-purple-400' : 'text-blue-400'
                }`}>
                  Uploaded by {expandedPhoto.uploaderRole === 'driver' ? 'Driver' : 'Sales'}
                </span>
                {(currentUserRole === expandedPhoto.uploaderRole || currentUserRole === 'dealer') && (
                  <button
                    data-testid="button-delete-photo"
                    onClick={() => handleDelete(expandedPhoto.id)}
                    disabled={deletingId === expandedPhoto.id}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-red-400 hover:text-red-300 transition"
                  >
                    {deletingId === expandedPhoto.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Trash2 className="w-3 h-3" />
                    )}
                    <span>Delete</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
