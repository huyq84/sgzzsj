import React, { createContext, useContext, useState, useEffect } from 'react';
import { message } from 'antd';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  // 设置API默认头部
  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // 初始化时检查登录状态
  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const response = await api.get('/auth/me');
          setUser(response.data.data.user);
        } catch (error) {
          console.error('获取用户信息失败:', error);
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, [token]);

  const login = async (credentials) => {
    try {
      const response = await api.post('/auth/login', credentials);
      const { token: newToken, user: userData } = response.data.data;
      
      setToken(newToken);
      setUser(userData);
      localStorage.setItem('token', newToken);
      
      message.success('登录成功');
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || '登录失败';
      message.error(errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  const register = async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      const { token: newToken, user: newUser } = response.data.data;
      
      setToken(newToken);
      setUser(newUser);
      localStorage.setItem('token', newToken);
      
      message.success('注册成功');
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || '注册失败';
      message.error(errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    message.success('已退出登录');
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await api.put('/auth/profile', profileData);
      setUser(response.data.data.user);
      message.success('个人信息更新成功');
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || '更新失败';
      message.error(errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  const changePassword = async (passwordData) => {
    try {
      await api.put('/auth/password', passwordData);
      message.success('密码修改成功');
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || '密码修改失败';
      message.error(errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    hasRole: (role) => user?.role === role,
    hasPermission: (permission) => {
      if (user?.role === 'admin') return true;
      // 根据具体需求实现权限检查逻辑
      return false;
    }
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;