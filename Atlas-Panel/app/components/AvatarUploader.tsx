'use client';

import { useState, useRef } from 'react';
import { Camera, Upload, X, Loader2 } from 'lucide-react';
import { profileService } from '@/app/lib/services';

interface AvatarUploaderProps {
  currentAvatar?: string | null;
  username: string;
  onAvatarUpdate?: (newAvatar: string) => void;
}

export default function AvatarUploader({ currentAvatar, username, onAvatarUpdate }: AvatarUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasValidAvatar = currentAvatar && currentAvatar.startsWith('data:image');
  const shouldShowImage = !isUploading && hasValidAvatar;

  const handleFileSelect = async (file: File) => {
    setError(null);

    // Basic validation
    if (!file.type.startsWith('image/')) {
      setError('Selecione apenas imagens (PNG, JPG, GIF, WebP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Imagem muito grande. Máximo: 5MB');
      return;
    }

    setIsUploading(true);

    try {
      const response = await profileService.uploadAvatar(file);

      if (response.profilePicture) {
        onAvatarUpdate?.(response.profilePicture);
      } else {
        setError('Erro no upload - tente novamente');
      }
    } catch (err: any) {
      setError('Erro ao fazer upload da imagem');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setIsUploading(true);
    try {
      await profileService.removeAvatar();
      onAvatarUpdate?.('');
    } catch (err) {
      setError('Erro ao remover imagem');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-6">
        <div className="relative group">
          {shouldShowImage ? (
            <>
              <div className="relative w-24 h-24 rounded-full overflow-hidden bg-gray-200">
                <img
                  src={currentAvatar}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              </div>
              {!isUploading && (
                <button
                  onClick={handleRemoveAvatar}
                  className="absolute top-0 right-0 p-1.5 bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600 z-20"
                  title="Remover foto de perfil"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </>
          ) : (
            <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white text-3xl font-semibold">
                {username[0]?.toUpperCase() || 'U'}
              </span>
            </div>
          )}

          {!isUploading && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 p-2 bg-gray-800 rounded-full border-2 border-gray-700 hover:bg-gray-700 transition-colors"
            >
              <Camera className="w-4 h-4 text-white" />
            </button>
          )}

          {isUploading && (
            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            </div>
          )}
        </div>

        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-1">Foto de Perfil</h3>
          <p className="text-sm text-gray-400 mb-3">
            Clique no ícone da câmera para adicionar uma foto
          </p>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg transition-colors text-sm"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 inline animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2 inline" />
                Escolher Imagem
              </>
            )}
          </button>

          <p className="text-xs text-gray-500 mt-2">
            JPG, PNG ou GIF (máx. 5MB)
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleFileSelect(file);
          }
        }}
        className="hidden"
      />
    </div>
  );
}