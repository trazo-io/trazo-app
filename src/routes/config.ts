import SignInConsumer from 'views/Authentication/SignIn/ConsumerSignIn';
import VerifyEmailConsumer from 'views/Authentication/SignUp/VerifyEmailConsumer';
import { CONSUMER, PRODUCER, SUPERUSER } from '../config';
import { ComponentType } from 'react';
import ConsumerSignUpClosed from 'views/Authentication/SignUp/ConsumerSignUpClosed';
import SignInApp from 'views/Authentication/SignIn/AppSignIn';
import SignUp from 'views/Authentication/SignUp/AppSignUp';
import VerifyEmail from 'views/Authentication/SignUp/VerifyEmail';
import ModernVerifyEmail from 'views/Authentication/SignUp/ModernVerifyEmail';
import ModernVerifyEmailProducer from 'views/Authentication/SignUp/ModernVerifyEmailProducer';
import ModernVerifyEmailConsumer from 'views/Authentication/SignUp/ModernVerifyEmailConsumer';
import ProducerForgotPassword from 'views/Authentication/ForgotPassword/ProducerForgotPassword';
import ConsumerForgotPassword from 'views/Authentication/ForgotPassword/ConsumerForgotPassword';
import ProducerResetPassword from 'views/Authentication/ResetPassword/ProducerResetPassword';
import ConsumerResetPassword from 'views/Authentication/ResetPassword/ConsumerResetPassword';

type RouteConfig = {
  auth: {
    path: string;
    signin: ComponentType;
    signup: ComponentType;
    verifyEmail: ComponentType;
    forgotPassword: ComponentType;
    resetPassword: ComponentType;
  };
  defaultRedirect: string;
  protected: {
    path: string;
    roles: number[];
    adminRoles?: number[];
    requiresCompanyAdmin?: boolean;
  };
};

type AppConfig = {
  producer: RouteConfig;
  consumer: RouteConfig;
};

export const routeConfig: AppConfig = {
  producer: {
    auth: {
      path: '/auth',
      signin: SignInApp,
      signup: SignUp,
      verifyEmail: ModernVerifyEmailProducer,
      forgotPassword: ProducerForgotPassword,
      resetPassword: ProducerResetPassword
    },
    defaultRedirect: '/admin/dashboard',
    protected: {
      path: '/admin/dashboard',
      roles: [PRODUCER, SUPERUSER],
      adminRoles: [PRODUCER, SUPERUSER],
      requiresCompanyAdmin: true
    }
  },
  consumer: {
    auth: {
      path: '/auth',
      signin: SignInConsumer,
      // Consumer registration closed 2026-08-06 — the authenticated shopper product is being
      // retired (TRAZO-OCTOBER-2026-PLAN.md §10.5). Closing intake now keeps the November
      // removal a code deletion instead of a user migration. Sign-IN stays open so existing
      // account holders can still reach their data. `ConsumerSignUp` is unrouted, not deleted;
      // restoring it is this one line.
      signup: ConsumerSignUpClosed,
      verifyEmail: ModernVerifyEmailConsumer,
      forgotPassword: ConsumerForgotPassword,
      resetPassword: ConsumerResetPassword
    },
    defaultRedirect: '/admin/dashboard/impact',
    protected: {
      path: '/admin/dashboard',
      roles: [CONSUMER, SUPERUSER, PRODUCER]
    }
  }
};
