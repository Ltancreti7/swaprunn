import { useState, useRef } from 'react';
import { Camera, Upload, X, Loader2 } from 'lucide-react';

interface DeliveryPhotoUploadProps {
  deliveryId: string;
  uploaderRole: 'driver' | 'sales';
  onPhotoUploaded: () => void;
}

const PHOTO_TYPES = [
  { value: 'pickup', label: 'Pickup' },
  { value: 'dropoff', label: 'Dropoff' },
  { value: 'odometer', label: 'Odometer' },
  { value: 'damage', label: 'Damage' },
  { value: 'other', label: 'Other' },
];

async function jsonRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Request failed');
  }
  return response.json();
}

export function DeliveryPhotoUpload({ deliveryId, uploaderRole, onPhotoUploaded }: DeliveryPhotoUploadProps) {
  const [selectedType, setSelectedType] = useState('pickup');
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);

    try {
      const urlRes = await jsonRequest<{ uploadURL: string; objectPath: string }>('/api/uploads/request-url', {
        method: 'POST',
        body: JSON.stringify({
          name: selectedFile.name,
          size: selectedFile.size,
          contentType: selectedFile.type,
        }),
      });

      const { uploadURL, objectPath } = urlRes;

      await fetch(uploadURL, {
        method: 'PUT',
        body: selectedFile,
        headers: { 'Content-Type': selectedFile.type },
      });

      await jsonRequest(`/api/deliveries/${deliveryId}/photos`, {
        method: 'POST',
        body: JSON.stringify({
          object_path: objectPath,
          photo_type: selectedType,
          caption,
          uploader_role: uploaderRole,
        }),
      });

      setPreview(null);
      setSelectedFile(null);
      setCaption('');
      if (fileInputRef.current) fileInputRef.current.value = '';

      onPhotoUploaded();
    } catch (error) {
      console.error('Photo upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  const clearSelection = () => {
    setPreview(null);
    setSelectedFile(null);
    setCaption('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {PHOTO_TYPES.map((type) => (
          <button
            key={type.value}
            data-testid={`button-photo-type-${type.value}`}
            onClick={() => setSelectedType(type.value)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
              selectedType === type.value
                ? 'bg-red-600 text-white'
                : 'bg-neutral-700 text-neutral-300 border border-neutral-600'
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>

      {!preview ? (
        <button
          data-testid="button-select-photo"
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-neutral-600 rounded-md text-neutral-400 hover:border-red-500 hover:text-red-400 transition"
        >
          <Camera className="w-5 h-5" />
          <span>Take or Select Photo</span>
        </button>
      ) : (
        <div className="relative">
          <img src={preview} alt="Preview" className="w-full max-h-48 object-cover rounded-md" />
          <button
            data-testid="button-clear-photo"
            onClick={clearSelection}
            className="absolute top-2 right-2 p-1 bg-black/60 rounded-full text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
        data-testid="input-photo-file"
      />

      {preview && (
        <>
          <input
            data-testid="input-photo-caption"
            type="text"
            placeholder="Add a caption (optional)"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-md text-white placeholder-neutral-400 text-sm"
          />

          <button
            data-testid="button-upload-photo"
            onClick={handleUpload}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-md font-medium disabled:opacity-50 transition"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Upload Photo</span>
              </>
            )}
          </button>
        </>
      )}
    </div>
  );
}
