import { useState, useEffect } from 'react';
import { useSettings } from './SettingsContext';
import { validateSettings } from './SettingsUtils';
import { Button, Form, Input, Switch, Card, message } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';

export const SettingsForm = () => {
  const { state, setField } = useSettings();
  const [form] = Form.useForm();
  const [errors, setErrors] = useState({});

  useEffect(() => {
    form.setFieldsValue(state.openai);
  }, [state.openai, form]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const validationErrors = validateSettings({ openai: values });
      
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }

      setField('openai', 'websocketUrl', values.websocketUrl);
      setField('openai', 'restUrl', values.restUrl);
      setField('openai', 'apiKey', values.apiKey);
      setField('openai', 'enabled', values.enabled);

      message.success('Settings saved successfully');
      setErrors({});
    } catch (error) {
      console.error('Error saving settings:', error);
      message.error('Failed to save settings');
    }
  };

  return (
    <Card title="OpenAI Integration Settings" bordered={false}>
      <Form
        form={form}
        layout="vertical"
        initialValues={state.openai}
      >
        <Form.Item
          label="Enable OpenAI Integration"
          name="enabled"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>

        <Form.Item
          label="WebSocket URL"
          name="websocketUrl"
          validateStatus={errors.openai?.websocketUrl ? 'error' : ''}
          help={errors.openai?.websocketUrl}
          tooltip={{
            title: 'The WebSocket URL for OpenAI API connections',
            icon: <InfoCircleOutlined />
          }}
        >
          <Input placeholder="ws://localhost:3001/ws" />
        </Form.Item>

        <Form.Item
          label="REST API URL"
          name="restUrl"
          validateStatus={errors.openai?.restUrl ? 'error' : ''}
          help={errors.openai?.restUrl}
          tooltip={{
            title: 'The REST API URL for OpenAI API connections',
            icon: <InfoCircleOutlined />
          }}
        >
          <Input placeholder="http://localhost:3001/api" />
        </Form.Item>

        <Form.Item
          label="API Key"
          name="apiKey"
          validateStatus={errors.openai?.apiKey ? 'error' : ''}
          help={errors.openai?.apiKey}
          tooltip={{
            title: 'Your OpenAI API key',
            icon: <InfoCircleOutlined />
          }}
        >
          <Input.Password placeholder="Enter your API key" />
        </Form.Item>

        <Form.Item>
          <Button type="primary" onClick={handleSave}>
            Save Settings
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};
