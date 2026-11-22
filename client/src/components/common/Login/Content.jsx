/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import isEmail from 'validator/lib/isEmail';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import classNames from 'classnames';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Button, Divider, Form, Grid, Header, Message } from 'semantic-ui-react';
import { useDidUpdate, usePrevious, useToggle } from '../../../lib/hooks';
import { Input } from '../../../lib/custom-ui';

import selectors from '../../../selectors';
import entryActions from '../../../entry-actions';
import actions from '../../../actions';
import { useForm, useNestedRef } from '../../../hooks';
import { isPassword, isUsername } from '../../../utils/validator';
import AccessTokenSteps from '../../../constants/AccessTokenSteps';
import TermsModal from './TermsModal';
import TotpChallengeModal from './TotpChallengeModal';

import logo from '../../../assets/images/logo.png';
import googleIcon from '../../../assets/images/google-icon.svg';

import styles from './Content.module.scss';

const createMessage = (error) => {
  if (!error) {
    return error;
  }

  switch (error.message) {
    case 'Invalid credentials':
      return {
        type: 'error',
        content: 'common.invalidCredentials',
      };
    case 'Invalid email or username':
      return {
        type: 'error',
        content: 'common.invalidEmailOrUsername',
      };
    case 'Invalid password':
      return {
        type: 'error',
        content: 'common.invalidPassword',
      };
    case 'Admin login required to initialize instance':
      return {
        type: 'error',
        content: 'common.adminLoginRequiredToInitializeInstance',
      };
    case 'Invalid email':
      return {
        type: 'error',
        content: 'common.invalidEmail',
      };
    case 'Invalid name':
      return {
        type: 'error',
        content: 'common.invalidName',
      };
    case 'Weak password':
      return {
        type: 'error',
        content: 'common.passwordIsTooWeak',
      };
    case 'Sign up disabled':
      return {
        type: 'error',
        content: 'common.signUpDisabled',
      };
    case 'User is deactivated':
      return {
        type: 'error',
        content: 'common.userIsDeactivated',
      };
    case 'Google sign-in failed':
    case 'Invalid code or nonce':
    case 'Invalid Google configuration':
      return {
        type: 'error',
        content: 'common.googleSignInFailed',
      };
    case 'Rate limit exceeded':
      return {
        type: 'warning',
        content: 'common.tooManyAttempts',
      };
    case 'Email already in use':
      return {
        type: 'error',
        content: 'common.emailAlreadyInUse',
      };
    case 'Username already in use':
      return {
        type: 'error',
        content: 'common.usernameAlreadyInUse',
      };
    case 'Active users limit reached':
      return {
        type: 'error',
        content: 'common.activeUsersLimitReached',
      };
    case 'Failed to fetch':
      return {
        type: 'warning',
        content: 'common.noInternetConnection',
      };
    case 'Network request failed':
      return {
        type: 'warning',
        content: 'common.serverConnectionFailed',
      };
    default:
      return {
        type: 'warning',
        content: 'common.unknownError',
      };
  }
};

const Content = React.memo(() => {
  const bootstrap = useSelector(selectors.selectBootstrap);

  const {
    data: defaultData,
    isSubmitting,
    error,
    step,
  } = useSelector(selectors.selectAuthenticateForm);

  const dispatch = useDispatch();
  const [t] = useTranslation();
  const wasSubmitting = usePrevious(isSubmitting);

  const [data, handleFieldChange, setData] = useForm(() => {
    const initialData = {
      emailOrUsername: '',
      password: '',
      ...defaultData,
    };

    if (bootstrap.isDemoMode) {
      const params = new URLSearchParams(window.location.hash.slice(1));

      Object.keys(initialData).forEach((fieldName) => {
        const value = params.get(fieldName);

        if (value !== null) {
          initialData[fieldName] = value;
        }
      });
    }

    return initialData;
  });

  const [signUpData, handleSignUpFieldChange] = useForm({
    name: '',
    email: '',
    password: '',
  });

  const [isSignUp, setIsSignUp] = useState(false);

  const withGoogle = !!bootstrap.google;

  const message = useMemo(() => createMessage(error), [error]);
  const [focusPasswordFieldState, focusPasswordField] = useToggle();

  const [emailOrUsernameFieldRef, handleEmailOrUsernameFieldRef] = useNestedRef('inputRef');
  const [passwordFieldRef, handlePasswordFieldRef] = useNestedRef('inputRef');
  const [nameFieldRef, handleNameFieldRef] = useNestedRef('inputRef');
  const [signUpEmailFieldRef, handleSignUpEmailFieldRef] = useNestedRef('inputRef');
  const [signUpPasswordFieldRef, handleSignUpPasswordFieldRef] = useNestedRef('inputRef');

  const handleSubmit = useCallback(() => {
    const cleanData = {
      ...data,
      emailOrUsername: data.emailOrUsername.trim(),
    };

    if (!isEmail(cleanData.emailOrUsername) && !isUsername(cleanData.emailOrUsername)) {
      emailOrUsernameFieldRef.current.select();
      dispatch(actions.authenticate.failure(new Error('Invalid email or username')));
      return;
    }

    if (!cleanData.password) {
      passwordFieldRef.current.focus();
      dispatch(actions.authenticate.failure(new Error('Invalid password')));
      return;
    }

    dispatch(entryActions.authenticate(cleanData));
  }, [dispatch, data, emailOrUsernameFieldRef, passwordFieldRef]);

  const handleSignUpSubmit = useCallback(() => {
    const cleanData = {
      ...signUpData,
      name: signUpData.name.trim(),
      email: signUpData.email.trim(),
    };

    if (!cleanData.name) {
      nameFieldRef.current.select();
      dispatch(actions.authenticate.failure(new Error('Invalid name')));
      return;
    }

    if (!isEmail(cleanData.email)) {
      signUpEmailFieldRef.current.select();
      dispatch(actions.authenticate.failure(new Error('Invalid email')));
      return;
    }

    if (!isPassword(cleanData.password)) {
      signUpPasswordFieldRef.current.focus();
      dispatch(actions.authenticate.failure(new Error('Weak password')));
      return;
    }

    dispatch(entryActions.signUp(cleanData));
  }, [dispatch, signUpData, nameFieldRef, signUpEmailFieldRef, signUpPasswordFieldRef]);

  const handleAuthenticateWithGoogleClick = useCallback(() => {
    dispatch(entryActions.authenticateWithGoogle());
  }, [dispatch]);

  const handleModeToggleClick = useCallback(() => {
    dispatch(entryActions.clearAuthenticateError());
    setIsSignUp((prevIsSignUp) => !prevIsSignUp);
  }, [dispatch]);

  const handleMessageDismiss = useCallback(() => {
    dispatch(entryActions.clearAuthenticateError());
  }, [dispatch]);

  useEffect(() => {
    if (isSignUp) {
      nameFieldRef.current.focus();
    } else {
      emailOrUsernameFieldRef.current.focus();
    }
  }, [isSignUp, nameFieldRef, emailOrUsernameFieldRef]);

  useDidUpdate(() => {
    if (isSignUp) {
      if (wasSubmitting && !isSubmitting && error && error.message === 'Email already in use') {
        signUpEmailFieldRef.current.select();
      }

      return;
    }

    if (wasSubmitting && !isSubmitting && error) {
      switch (error.message) {
        case 'Invalid credentials':
        case 'Invalid email or username':
          emailOrUsernameFieldRef.current.select();

          break;
        case 'Invalid password':
          setData((prevData) => ({
            ...prevData,
            password: '',
          }));
          focusPasswordField();

          break;
        default:
      }
    }
  }, [isSubmitting, wasSubmitting, error]);

  useDidUpdate(() => {
    passwordFieldRef.current.focus();
  }, [focusPasswordFieldState]);

  return (
    <div className={classNames(styles.wrapper, styles.fullHeight)}>
      <Grid verticalAlign="middle" className={styles.grid}>
        <Grid.Column computer={6} tablet={16} mobile={16} className={styles.gridItem}>
          <div className={styles.login}>
            <div className={styles.form}>
              <div className={styles.logoWrapper}>
                <img src={logo} alt="" className={styles.logo} />
              </div>
              <Header
                as="h1"
                textAlign="center"
                content={bootstrap.instanceName || 'Tama'}
                className={styles.formTitle}
              />
              <Header
                as="h2"
                textAlign="center"
                content={
                  isSignUp
                    ? t('common.signUp', {
                        context: 'title',
                      })
                    : t('common.logIn', {
                        context: 'title',
                      })
                }
                className={styles.formSubtitle}
              />
              {message && (
                <Message
                  {...{
                    [message.type]: true,
                  }}
                  visible
                  content={t(message.content)}
                  onDismiss={handleMessageDismiss}
                />
              )}
              {isSignUp ? (
                <Form size="large" onSubmit={handleSignUpSubmit}>
                  <div className={styles.inputWrapper}>
                    <div className={styles.inputLabel}>{t('common.name')}</div>
                    <Input
                      fluid
                      ref={handleNameFieldRef}
                      name="name"
                      value={signUpData.name}
                      maxLength={128}
                      readOnly={isSubmitting}
                      className={styles.input}
                      onChange={handleSignUpFieldChange}
                    />
                  </div>
                  <div className={styles.inputWrapper}>
                    <div className={styles.inputLabel}>{t('common.email')}</div>
                    <Input
                      fluid
                      ref={handleSignUpEmailFieldRef}
                      name="email"
                      value={signUpData.email}
                      maxLength={256}
                      readOnly={isSubmitting}
                      className={styles.input}
                      onChange={handleSignUpFieldChange}
                    />
                  </div>
                  <div className={styles.inputWrapper}>
                    <div className={styles.inputLabel}>{t('common.password')}</div>
                    <Input.Password
                      withStrengthBar
                      fluid
                      ref={handleSignUpPasswordFieldRef}
                      name="password"
                      value={signUpData.password}
                      maxLength={256}
                      readOnly={isSubmitting}
                      className={styles.input}
                      onChange={handleSignUpFieldChange}
                    />
                  </div>
                  <Form.Button
                    fluid
                    primary
                    icon="right arrow"
                    labelPosition="right"
                    content={t('action.signUp')}
                    loading={isSubmitting}
                    disabled={isSubmitting}
                  />
                </Form>
              ) : (
                <Form size="large" onSubmit={handleSubmit}>
                  <div className={styles.inputWrapper}>
                    <div className={styles.inputLabel}>{t('common.emailOrUsername')}</div>
                    <Input
                      fluid
                      ref={handleEmailOrUsernameFieldRef}
                      name="emailOrUsername"
                      value={data.emailOrUsername}
                      maxLength={256}
                      readOnly={isSubmitting}
                      className={styles.input}
                      onChange={handleFieldChange}
                    />
                  </div>
                  <div className={styles.inputWrapper}>
                    <div className={styles.inputLabel}>{t('common.password')}</div>
                    <Input.Password
                      fluid
                      ref={handlePasswordFieldRef}
                      name="password"
                      value={data.password}
                      maxLength={256}
                      readOnly={isSubmitting}
                      className={styles.input}
                      onChange={handleFieldChange}
                    />
                  </div>
                  <Form.Button
                    fluid
                    primary
                    icon="right arrow"
                    labelPosition="right"
                    content={t('action.logIn')}
                    loading={isSubmitting}
                    disabled={isSubmitting}
                  />
                </Form>
              )}
              {withGoogle && (
                <>
                  <Divider horizontal content={t('common.or')} className={styles.divider} />
                  <Button
                    fluid
                    type="button"
                    disabled={isSubmitting}
                    className={styles.googleButton}
                    onClick={handleAuthenticateWithGoogleClick}
                  >
                    <img src={googleIcon} alt="" className={styles.googleIcon} />
                    {isSignUp ? t('action.signUpWithGoogle') : t('action.logInWithGoogle')}
                  </Button>
                </>
              )}
              {bootstrap.isSignUpEnabled && (
                <div className={styles.modeToggle}>
                  {isSignUp ? t('common.alreadyHaveAnAccount') : t('common.dontHaveAnAccount')}{' '}
                  <button
                    type="button"
                    disabled={isSubmitting}
                    className={styles.modeToggleButton}
                    onClick={handleModeToggleClick}
                  >
                    {isSignUp ? t('action.logIn') : t('action.signUp')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </Grid.Column>
        <Grid.Column
          computer={10}
          only="computer"
          className={classNames(styles.gridItem, styles.cover)}
        >
          <div className={styles.coverOverlay} />
        </Grid.Column>
      </Grid>
      {step === AccessTokenSteps.ACCEPT_TERMS && <TermsModal />}
      {step === AccessTokenSteps.VERIFY_TOTP && <TotpChallengeModal />}
    </div>
  );
});

export default Content;
