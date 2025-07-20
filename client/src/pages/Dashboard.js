import React from 'react';
import { Row, Col, Card, Statistic, Typography, List, Avatar, Progress } from 'antd';
import { 
  ProjectOutlined, 
  FileTextOutlined, 
  CheckCircleOutlined, 
  ClockCircleOutlined,
  TeamOutlined,
  TrophyOutlined
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text } = Typography;

const Dashboard = () => {
  const { user } = useAuth();

  // 模拟数据
  const stats = {
    totalProjects: 12,
    activeProjects: 8,
    completedDesigns: 5,
    pendingReviews: 3
  };

  const recentProjects = [
    {
      id: 1,
      name: '某商业综合体项目',
      type: '商业建筑',
      status: '进行中',
      progress: 65,
      lastUpdate: '2小时前'
    },
    {
      id: 2,
      name: '某住宅小区项目',
      type: '住宅建筑',
      status: '已完成',
      progress: 100,
      lastUpdate: '1天前'
    },
    {
      id: 3,
      name: '某工业厂房项目',
      type: '工业建筑',
      status: '进行中',
      progress: 30,
      lastUpdate: '3小时前'
    }
  ];

  const quickActions = [
    {
      title: '新建项目',
      description: '创建新的施工组织设计项目',
      icon: <ProjectOutlined />,
      action: '/projects/new'
    },
    {
      title: '模板管理',
      description: '管理施工组织设计模板',
      icon: <FileTextOutlined />,
      action: '/templates'
    },
    {
      title: '文档中心',
      description: '查看和管理项目文档',
      icon: <TeamOutlined />,
      action: '/documents'
    }
  ];

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Title level={2}>欢迎回来，{user?.fullName}！</Title>
          <Text type="secondary">
            今天是 {new Date().toLocaleDateString('zh-CN', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              weekday: 'long'
            })}
          </Text>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总项目数"
              value={stats.totalProjects}
              prefix={<ProjectOutlined style={{ color: '#1890ff' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="进行中项目"
              value={stats.activeProjects}
              prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="已完成设计"
              value={stats.completedDesigns}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="待审核"
              value={stats.pendingReviews}
              prefix={<TrophyOutlined style={{ color: '#722ed1' }} />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={16}>
          <Card title="最近项目" extra={<a href="/projects">查看全部</a>}>
            <List
              itemLayout="horizontal"
              dataSource={recentProjects}
              renderItem={item => (
                <List.Item
                  actions={[
                    <Text type="secondary">{item.lastUpdate}</Text>
                  ]}
                >
                  <List.Item.Meta
                    avatar={<Avatar icon={<ProjectOutlined />} />}
                    title={<a href={`/projects/${item.id}`}>{item.name}</a>}
                    description={
                      <div>
                        <Text type="secondary">{item.type}</Text>
                        <br />
                        <div style={{ display: 'flex', alignItems: 'center', marginTop: 8 }}>
                          <span className={`status-badge ${item.status}`}>
                            {item.status}
                          </span>
                          <Progress
                            percent={item.progress}
                            size="small"
                            style={{ marginLeft: 16, flex: 1 }}
                          />
                        </div>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="快速操作">
            <List
              dataSource={quickActions}
              renderItem={item => (
                <List.Item style={{ cursor: 'pointer' }}>
                  <List.Item.Meta
                    avatar={<Avatar icon={item.icon} />}
                    title={<a href={item.action}>{item.title}</a>}
                    description={item.description}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;