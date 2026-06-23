import React, { createContext, useState, useContext, useEffect } from 'react';
import { User, UserRole, AuthContextType } from '../types';
import { users } from '../data/users';
import toast from 'react-hot-toast';
import axios from 'axios';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_STORAGE_KEY = 'business_nexus_user';
const TOKEN_STORAGE_KEY = 'business_nexus_token'; 
const RESET_TOKEN_KEY = 'business_nexus_reset_token';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 🚀 FIX: TypeScript ki strictness khatam karne ke liye <any> use kiya
  const [user, setUser] = useState<any>(null); 
  const [token, setToken] = useState<string | null>(null); 
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem(USER_STORAGE_KEY);
    const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    if (storedToken) {
      setToken(storedToken);
      // Fetch latest profile including avatarUrl
      axios.get('http://localhost:5000/api/auth/me', {
        headers: { Authorization: `Bearer ${storedToken}` }
      }).then(response => {
        const backendUser = response.data;
        const userData = {
          ...backendUser,
          ...(backendUser.profile || {})
        };
        setUser(userData);
        const { avatarUrl, profile, ...userToSave } = userData;
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userToSave));
      }).catch(err => {
        console.error('Failed to fetch profile', err);
      });
    }
    
    setIsLoading(false);
  }, []);

  // 🚀 FIX: _password likha taake TS 'unused variable' ka error na de
  const login = async (email: string, _password: string, role: UserRole): Promise<void> => {
    setIsLoading(true);

    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        email,
        password: _password
      });

      const { token: jwtToken, user: backendUser, requires2FA } = response.data;

      if (requires2FA) {
        return { requires2FA: true, email };
      }

      // Checking if role matches (case-insensitive)
      if (backendUser.role?.toLowerCase() !== role?.toLowerCase()) {
        throw new Error('Please select the correct role (Entrepreneur/Investor) to login.');
      }

      // Flatten profile fields for frontend compatibility
      const userData = {
        ...backendUser,
        ...(backendUser.profile || {})
      };

      setUser(userData);
      setToken(jwtToken); 
      
      const { avatarUrl, profile, ...userToSave } = userData;
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userToSave));
      localStorage.setItem(TOKEN_STORAGE_KEY, jwtToken); 
      
      toast.success('Successfully logged in!');
    } catch (error: any) {
      const msg = error.response?.data?.message || error.response?.data?.errors?.[0]?.msg || 'Invalid Email or Password';
      toast.error(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOTP = async (email: string, otp: string, role: UserRole) => {
    setIsLoading(true);
    try {
      const response = await axios.post('http://localhost:5000/api/auth/verify-otp', {
        email,
        otp
      });

      const { token: jwtToken, user: backendUser } = response.data;

      if (backendUser.role?.toLowerCase() !== role?.toLowerCase()) {
        throw new Error('Please select the correct role (Entrepreneur/Investor) to login.');
      }

      const userData = {
        ...backendUser,
        ...(backendUser.profile || {})
      };

      setUser(userData);
      setToken(jwtToken);
      
      const { avatarUrl, profile, ...userToSave } = userData;
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userToSave));
      localStorage.setItem(TOKEN_STORAGE_KEY, jwtToken); 
      
      toast.success('Successfully logged in!');
    } catch (error: any) {
      const msg = error.response?.data?.message || error.response?.data?.errors?.[0]?.msg || 'Invalid OTP';
      toast.error(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // 🚀 FIX: _password use kiya
  const register = async (name: string, email: string, _password: string, role: UserRole): Promise<void> => {
    setIsLoading(true);

    try {
      const response = await axios.post('http://localhost:5000/api/auth/register', {
        name,
        email,
        password: _password,
        role
      });

      const { token: jwtToken, user: backendUser } = response.data;

      // Flatten profile fields for frontend compatibility
      const userData = {
        ...backendUser,
        ...(backendUser.profile || {})
      };

      setUser(userData);
      setToken(jwtToken); 
      
      const { avatarUrl, profile, ...userToSave } = userData;
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userToSave));
      localStorage.setItem(TOKEN_STORAGE_KEY, jwtToken); 
      
      toast.success('Account created successfully!');
    } catch (error: any) {
      const msg = error.response?.data?.message || error.response?.data?.errors?.[0]?.msg || 'Error creating account';
      toast.error(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const forgotPassword = async (email: string): Promise<void> => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const user = users.find(u => u.email === email);
      if (!user) {
        throw new Error('No account found with this email');
      }

      const resetToken = Math.random().toString(36).substring(2, 15);
      localStorage.setItem(RESET_TOKEN_KEY, resetToken);

      toast.success('Password reset instructions sent to your email');
    } catch (error) {
      toast.error((error as Error).message);
      throw error;
    }
  };

  // 🚀 FIX: _newPassword use kiya
  const resetPassword = async (token: string, _newPassword: string): Promise<void> => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const storedToken = localStorage.getItem(RESET_TOKEN_KEY);
      if (token !== storedToken) {
        throw new Error('Invalid or expired reset token');
      }

      localStorage.removeItem(RESET_TOKEN_KEY);
      toast.success('Password reset successfully');
    } catch (error) {
      toast.error((error as Error).message);
      throw error;
    }
  };

  const logout = (): void => {
    setUser(null);
    setToken(null); 
    
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY); 
    
    toast.success('Logged out successfully');
  };

  const updateProfile = async (userId: string, updates: Partial<User>): Promise<void> => {
    try {
      const currentToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (!currentToken) throw new Error('No authentication token found');

      // The backend expects nested `profile` object
      const backendPayload = {
        name: updates.name,
        profile: {
          bio: (updates as any).bio,
          startupName: (updates as any).startupName,
          investmentHistory: (updates as any).investmentHistory,
          preferences: (updates as any).preferences || (updates as any).investmentInterests || (updates as any).investmentStage,
          location: (updates as any).location,
          foundedYear: (updates as any).foundedYear,
          teamSize: (updates as any).teamSize,
          avatarUrl: (updates as any).avatarUrl
        }
      };

      const response = await axios.put('http://localhost:5000/api/auth/profile', backendPayload, {
        headers: {
          Authorization: `Bearer ${currentToken}`
        }
      });

      const { user: backendUser } = response.data;
      
      const updatedUserData = {
        ...backendUser,
        ...(backendUser.profile || {})
      };

      if (user?.id === userId || user?._id === userId || !user) {
        setUser(updatedUserData);
        const { avatarUrl, profile, ...userToSave } = updatedUserData;
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userToSave));
      }

      toast.success('Profile updated successfully');
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Error updating profile';
      toast.error(msg);
      throw error;
    }
  };

  const value = {
    user,
    token, 
    login,
    verifyOTP,
    register,
    logout,
    forgotPassword,
    resetPassword,
    updateProfile,
    isAuthenticated: !!user,
    isLoading
  };

  return <AuthContext.Provider value={value as any}>{children}</AuthContext.Provider>; 
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};