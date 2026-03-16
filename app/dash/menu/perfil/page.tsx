'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { userService, profileService } from '@/app/lib/services';
import { authService } from '@/app/lib/auth';
import AvatarUploader from '@/app/components/AvatarUploader';

export default function PerfilPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    userService.getUserProfile().then((data) => {
      setUsername(data.username || '');
      setEmail(data.email || '');
      setProfilePicture(data.profilePicture || null);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await authService.setUsername(username);
      toast.success('Perfil atualizado');
      window.dispatchEvent(new Event('profileUpdated'));
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpdate = (newAvatar: string) => {
    setProfilePicture(newAvatar || null);
    window.dispatchEvent(new Event('profileUpdated'));
  };

  if (loading) return <div className="skeleton h-40 w-full rounded-lg" />;

  return (
    <div className="max-w-md mx-auto space-y-6">
      <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Perfil</h1>

      <AvatarUploader
        currentAvatar={profilePicture}
        username={username || email}
        onAvatarUpdate={handleAvatarUpdate}
      />

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Email</label>
          <input className="atlas-input" value={email} disabled style={{ opacity: 0.6 }} />
        </div>

        <div>
          <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>@username</label>
          <div className="flex items-center">
            <span className="text-sm font-medium mr-1" style={{ color: 'var(--text-muted)' }}>@</span>
            <input
              className="atlas-input"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder="seu_username"
              maxLength={20}
            />
          </div>
        </div>

        <button
          className="atlas-btn w-full"
          onClick={handleSave}
          disabled={saving || !username}
        >
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </div>
  );
}
