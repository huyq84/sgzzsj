import React, { useEffect } from 'react';
import { Form, Input, Button, Card, Typography, Divider } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import styled from 'styled-components';

const { Title, Text } = Typography;

const LoginContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const LoginCard = styled(Card)`
  width: 100%;
  max-width: 400px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  border: none;
`;

const SystemTitle = styled(Title)`
  text-align: center;
  margin-bottom: 8px !important;
  color: #1890ff;
`;

const SystemSubtitle = styled(Text)`
  display: block;
  text-align: center;
  color: #666;
  margin-bottom: 32px;
`;

const Login = () => {
  const [form] = Form.useForm();
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const onFinish = async (values) => {
    const result = await login(values);
    if (result.success) {
      navigate(from, { replace: true });
    }
  };

  return (
    <LoginContainer>
      <LoginCard>
        <SystemTitle level={2}>施工组织设计系统</SystemTitle>
        <SystemSubtitle>Construction Organization Design System</SystemSubtitle>
        
        <Form
          form={form}
          name="login"
          onFinish={onFinish}
          size="large"
          autoComplete="off"
        >
          <Form.Item
            name="login"
            rules={[
              {
                required: true,
                message: '请输入用户名或邮箱',
              },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="用户名或邮箱"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              {
                required: true,
                message: '请输入密码',
              },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" style={{ width: '100%' }}>
              登录
            </Button>
          </Form.Item>
        </Form>

        <Divider>或</Divider>

        <div style={{ textAlign: 'center' }}>
          <Text>还没有账号？</Text>
          <Link to="/register" style={{ marginLeft: 8 }}>
            立即注册
          </Link>
        </div>
      </LoginCard>
    </LoginContainer>
  );
};

export default Login;