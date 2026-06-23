import React, { useState, useRef } from 'react';
import { User, Lock, Bell, Globe, Palette, CreditCard } from 'lucide-react';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';

export const SettingsPage: React.FC = () => {
  const { user, updateProfile, token } = useAuth() as any;
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [is2FAEnabled, setIs2FAEnabled] = useState(user?.twoFactorEnabled || false);
  const [toggling2FA, setToggling2FA] = useState(false);

  // Form state
  const [name, setName] = useState(user?.name || '');
  const [location, setLocation] = useState((user as any)?.location || '');
  const [bio, setBio] = useState((user as any)?.bio || '');
  
  // Entrepreneur fields
  const [startupName, setStartupName] = useState((user as any)?.startupName || '');
  const [foundedYear, setFoundedYear] = useState((user as any)?.foundedYear || '');
  const [teamSize, setTeamSize] = useState((user as any)?.teamSize || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');

  React.useEffect(() => {
    if (user) {
      setName(user.name || '');
      setLocation((user as any).location || '');
      setBio((user as any).bio || '');
      setStartupName((user as any).startupName || '');
      setFoundedYear((user as any).foundedYear || '');
      setTeamSize((user as any).teamSize || '');
      setAvatarUrl(user.avatarUrl || '');
      setIs2FAEnabled((user as any).twoFactorEnabled || false);
    }
  }, [user]);

  if (!user) return null;

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);
      await updateProfile(user.id, { 
        name, 
        location, 
        bio,
        startupName,
        foundedYear,
        teamSize,
        avatarUrl
      } as any);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle2FA = async () => {
    try {
      setToggling2FA(true);
      const res = await axios.post('https://nexus-app-full-stack.vercel.app/api/auth/toggle-2fa', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIs2FAEnabled(res.data.twoFactorEnabled);
      toast.success(res.data.message);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to toggle 2FA');
    } finally {
      setToggling2FA(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your account preferences and settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        <Card className="lg:col-span-1">
          <CardBody className="p-2">
            <nav className="space-y-1">
              <button className="flex items-center w-full px-3 py-2 text-sm font-medium text-primary-700 bg-primary-50 rounded-md">
                <User size={18} className="mr-3" />
                Profile
              </button>

              <button className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md">
                <Lock size={18} className="mr-3" />
                Security
              </button>

              <button className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md">
                <Bell size={18} className="mr-3" />
                Notifications
              </button>

              <button className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md">
                <Globe size={18} className="mr-3" />
                Language
              </button>

              <button className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md">
                <Palette size={18} className="mr-3" />
                Appearance
              </button>

              <button className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md">
                <CreditCard size={18} className="mr-3" />
                Billing
              </button>
            </nav>
          </CardBody>
        </Card>

        <div className="lg:col-span-3 space-y-6">

          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900">Profile Settings</h2>
            </CardHeader>
            <CardBody className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar
                  src={avatarUrl}
                  alt={user.name}
                  size="xl"
                />

                <div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handlePhotoChange}
                  />
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    Change Photo
                  </Button>
                  <p className="mt-2 text-sm text-gray-500">
                    JPG, GIF or PNG. Max size of 800K
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />

                <Input
                  label="Email"
                  type="email"
                  defaultValue={user.email}
                  disabled
                />

                <Input
                  label="Role"
                  value={user.role}
                  disabled
                />

                <Input
                  label="Location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />

                {user.role?.toLowerCase() === 'entrepreneur' && (
                  <>
                    <Input
                      label="Startup Name"
                      value={startupName}
                      onChange={(e) => setStartupName(e.target.value)}
                    />
                    <Input
                      label="Founded Year"
                      value={foundedYear}
                      onChange={(e) => setFoundedYear(e.target.value)}
                    />
                    <Input
                      label="Team Size"
                      type="number"
                      value={teamSize}
                      onChange={(e) => setTeamSize(e.target.value)}
                    />
                  </>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bio
                </label>
                <textarea
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                ></textarea>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline">Cancel</Button>
                <Button onClick={handleSaveProfile} isLoading={isSaving}>Save Changes</Button>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900">Security Settings</h2>
            </CardHeader>
            <CardBody className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-4">Two-Factor Authentication</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">
                      Add an extra layer of security to your account
                    </p>
                    <Badge variant={is2FAEnabled ? 'success' : 'error'} className="mt-1">
                      {is2FAEnabled ? 'Enabled' : 'Not Enabled'}
                    </Badge>
                  </div>
                  <Button variant="outline" onClick={handleToggle2FA} isLoading={toggling2FA}>
                    {is2FAEnabled ? 'Disable' : 'Enable'}
                  </Button>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-900 mb-4">Change Password</h3>
                <div className="space-y-4">
                  <Input
                    label="Current Password"
                    type="password"
                  />

                  <Input
                    label="New Password"
                    type="password"
                  />

                  <Input
                    label="Confirm New Password"
                    type="password"
                  />

                  <div className="flex justify-end">
                    <Button>Update Password</Button>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};