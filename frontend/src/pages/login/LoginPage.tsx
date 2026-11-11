import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  ConfigProvider,
  Form,
  Input,
  Layout,
  Menu,
  Modal,
  Popover,
  Space,
  Spin,
  message,
} from 'antd';
import {
  KeyOutlined,
  LockOutlined,
  MoonFilled,
  MoonOutlined,
  SunOutlined,
  TranslationOutlined,
  UserOutlined,
} from '@ant-design/icons';

import { FormProvider, useForm } from 'react-hook-form';
import { HttpUtil, LanguageManager } from '@/utils';
import { FormField, rhfZodValidate } from '@/components/form/rhf';
import { setMessageInstance } from '@/utils/messageBus';
import SponsorSlot from '@/components/sponsor/SponsorSlot';
import { pauseAnimationsUntilLeave, useTheme } from '@/hooks/useTheme';
import { LoginFormSchema, TwoFactorCodeSchema, type LoginFormValues } from '@/schemas/login';
import './LoginPage.css';

const HEADLINE_INTERVAL_MS = 2000;

type LoginForm = LoginFormValues;

const basePath = window.X_UI_BASE_PATH || '';

export default function LoginPage() {
  const { t } = useTranslation();
  const { isDark, isUltra, toggleTheme, toggleUltra, antdThemeConfig } = useTheme();
  const [messageApi, messageContextHolder] = message.useMessage();

  useEffect(() => {
    setMessageInstance(messageApi);
  }, [messageApi]);

  const [fetched, setFetched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [twoFactorEnable, setTwoFactorEnable] = useState(false);
  const [headlineIndex, setHeadlineIndex] = useState(0);
  const methods = useForm<LoginForm>({
    defaultValues: { username: '', password: '', twoFactorCode: '' },
  });
  const [lang, setLang] = useState<string>(() => LanguageManager.getLanguage());
  // routex：首次登录（密码仍是 123456）强制改密，改完才放行
  const [pwChange, setPwChange] = useState<{ username: string; oldPassword: string } | null>(null);
  const [newPw, setNewPw] = useState('');
  const [newPw2, setNewPw2] = useState('');
  const [pwSubmitting, setPwSubmitting] = useState(false);

  const headlineWords = useMemo(() => [t('pages.login.hello'), t('pages.login.title')], [t]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHeadlineIndex((i) => (i + 1) % headlineWords.length);
    }, HEADLINE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [headlineWords.length]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const msg = await HttpUtil.post('/getTwoFactorEnable');
      if (cancelled) return;
      if (msg.success) setTwoFactorEnable(!!msg.obj);
      setFetched(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onSubmit = useCallback(async (values: LoginForm) => {
    setSubmitting(true);
    try {
      const msg = (await HttpUtil.post('/login', values)) as {
        success: boolean;
        obj?: { needChangePassword?: boolean };
      };
      if (msg.success) {
        if (msg.obj?.needChangePassword) {
          setPwChange({ username: values.username, oldPassword: values.password });
        } else {
          window.location.href = basePath + 'panel/';
        }
      }
    } finally {
      setSubmitting(false);
    }
  }, []);

  const submitNewPassword = useCallback(async () => {
    if (!pwChange) return;
    if (newPw.length < 6) {
      messageApi.error('新密码至少 6 位');
      return;
    }
    if (newPw !== newPw2) {
      messageApi.error('两次输入的新密码不一致');
      return;
    }
    setPwSubmitting(true);
    try {
      const msg = await HttpUtil.post('/panel/api/setting/updateUser', {
        oldUsername: pwChange.username,
        oldPassword: pwChange.oldPassword,
        newUsername: pwChange.username,
        newPassword: newPw,
        twoFactorCode: '',
      });
      if (msg.success) {
        // 改密会让后端重建 session 与 CSRF，直接跳面板会被弹回登录页，
        // 所以这里明确提示并用新密码重新登录一次。
        messageApi.success('密码已更新，请用新密码重新登录');
        window.setTimeout(() => {
          window.location.reload();
        }, 1600);
      }
    } finally {
      setPwSubmitting(false);
    }
  }, [pwChange, newPw, newPw2, messageApi]);

  const onLangChange = useCallback((next: string) => {
    setLang(next);
    LanguageManager.setLanguage(next);
  }, []);

  const cycleTheme = useCallback(() => {
    pauseAnimationsUntilLeave('login-theme-cycle');
    if (!isDark) {
      toggleTheme();
      if (isUltra) toggleUltra();
    } else if (!isUltra) {
      toggleUltra();
    } else {
      toggleUltra();
      toggleTheme();
    }
  }, [isDark, isUltra, toggleTheme, toggleUltra]);

  const pageClass = useMemo(() => {
    const classes = ['login-app'];
    if (isDark) classes.push('is-dark');
    if (isUltra) classes.push('is-ultra');
    return classes.join(' ');
  }, [isDark, isUltra]);

  const langMenuItems = useMemo(
    () =>
      (LanguageManager.supportedLanguages as { value: string; name: string; icon: string }[]).map(
        (l) => ({
          key: l.value,
          label: (
            <Space size={8}>
              <span aria-hidden="true">{l.icon}</span>
              <span>{l.name}</span>
            </Space>
          ),
        }),
      ),
    [],
  );

  const themeIcon = !isDark ? (
    <SunOutlined aria-hidden />
  ) : !isUltra ? (
    <MoonOutlined aria-hidden />
  ) : (
    <MoonFilled aria-hidden />
  );

  return (
    <ConfigProvider theme={antdThemeConfig}>
      {messageContextHolder}
      <Layout className={pageClass}>
        <Layout.Content className="login-content">
          <div className="login-toolbar">
            <Button
              id="login-theme-cycle"
              shape="circle"
              size="large"
              className="toolbar-btn"
              aria-label={t('menu.theme')}
              title={t('menu.theme')}
              icon={themeIcon}
              onClick={cycleTheme}
            />
            <Popover
              rootClassName={isDark ? 'dark' : 'light'}
              placement="bottomRight"
              trigger="click"
              styles={{ content: { padding: 4 } }}
              content={
                <Menu
                  mode="vertical"
                  selectable
                  selectedKeys={[lang]}
                  items={langMenuItems}
                  onClick={({ key }) => onLangChange(key)}
                  style={{ border: 'none', minWidth: 160 }}
                />
              }
            >
              <Button
                shape="circle"
                size="large"
                className="toolbar-btn"
                aria-label={t('pages.settings.language')}
                icon={<TranslationOutlined aria-hidden />}
              />
            </Popover>
          </div>

          <div className="login-wrapper">
            {!fetched ? (
              <div className="login-loading">
                <Spin size="large" />
              </div>
            ) : (
              <div className="login-card">
                <div className="brand">
                  <span className="brand-name">routex</span>
                  <span className="brand-accent" aria-hidden="true" />
                </div>
                <h2 className="welcome">
                  <b key={headlineIndex}>{headlineWords[headlineIndex]}</b>
                </h2>

                <FormProvider {...methods}>
                  <Form
                    layout="vertical"
                    className="login-form"
                    onFinish={methods.handleSubmit(onSubmit)}
                  >
                    <FormField
                      name="username"
                      label={t('username')}
                      rules={{ validate: rhfZodValidate(LoginFormSchema.shape.username) }}
                    >
                      <Input
                        prefix={<UserOutlined aria-hidden />}
                        autoComplete="username"
                        size="large"
                        placeholder={t('username')}
                        autoFocus
                      />
                    </FormField>

                    <FormField
                      name="password"
                      label={t('password')}
                      rules={{ validate: rhfZodValidate(LoginFormSchema.shape.password) }}
                    >
                      <Input.Password
                        prefix={<LockOutlined aria-hidden />}
                        autoComplete="current-password"
                        size="large"
                        placeholder={t('password')}
                      />
                    </FormField>

                    {twoFactorEnable && (
                      <FormField
                        name="twoFactorCode"
                        label={t('twoFactorCode')}
                        rules={{ validate: rhfZodValidate(TwoFactorCodeSchema) }}
                      >
                        <Input
                          prefix={<KeyOutlined aria-hidden />}
                          autoComplete="one-time-code"
                          size="large"
                          placeholder={t('twoFactorCode')}
                        />
                      </FormField>
                    )}

                    <Form.Item className="submit-row">
                      <Button
                        type="primary"
                        htmlType="submit"
                        loading={submitting}
                        size="large"
                        block
                      >
                        {t('login')}
                      </Button>
                    </Form.Item>
                  </Form>
                </FormProvider>
                <SponsorSlot slot="login" variant="compact" className="login-sponsor" />
              </div>
            )}
          </div>
        </Layout.Content>
      </Layout>

      <Modal
        open={!!pwChange}
        title="首次登录 · 请设置新密码"
        closable={false}
        maskClosable={false}
        keyboard={false}
        footer={null}
        centered
        destroyOnHidden
      >
        <p style={{ color: '#64748b', marginTop: 0, fontSize: 13, lineHeight: 1.7 }}>
          当前账户仍在使用出厂默认密码 <b>123456</b>。为保障面板安全，必须设置新密码后才能进入后台。
        </p>
        <div style={{ marginTop: 16 }}>
          <Input.Password
            size="large"
            placeholder="新密码（至少 6 位）"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            autoFocus
          />
        </div>
        <div style={{ marginTop: 12 }}>
          <Input.Password
            size="large"
            placeholder="确认新密码"
            value={newPw2}
            onChange={(e) => setNewPw2(e.target.value)}
            onPressEnter={submitNewPassword}
          />
        </div>
        <Button
          type="primary"
          size="large"
          block
          style={{ marginTop: 18 }}
          loading={pwSubmitting}
          onClick={submitNewPassword}
        >
          保存并进入面板
        </Button>
      </Modal>
    </ConfigProvider>
  );
}
