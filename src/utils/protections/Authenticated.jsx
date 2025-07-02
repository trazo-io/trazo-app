import { Navigate, Outlet, useLocation, useMatch, useNavigate, useParams } from 'react-router-dom';
import { PRODUCER, SUPERUSER, CONSUMER } from '../../config';
import React, { useEffect, useState } from 'react';

import { LOGIN_PAGE_URL } from 'config/routes';
import { useSelector } from 'react-redux';
import { getAuthRedirectAction } from '../authRedirect';

const Authenticated = ({ allowedRoles, mustBeCompanyAdmin = false }) => {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const isLoading = useSelector((state) => state.auth.isLoading);
  console.log('Authenticated');
  const currentCompany = useSelector((state) => state.company.currentCompany);
  console.log('currentCompany', currentCompany);
  const [subdomain, setSubDomain] = useState('');
  const { pathname } = useLocation();
  const navigate = useNavigate();
  
  // Debug wrapper for navigate calls
  const debugNavigate = (path, options) => {
    console.log('🔒 Authenticated.jsx: navigate() called with path:', path, 'options:', options);
    return navigate(path, options);
  };

  const currentUser = useSelector((state) => state.userState.user);

  const { establishmentId } = useParams();

  useEffect(() => {
    const host = window.location.host;
    const arr = host
      .split('.')
      .slice(0, host.includes(import.meta.env.VITE_APP_BASE_DOMAIN) ? -1 : -2);

    if (arr.length > 0) {
      if (arr[0] === 'app') {
        setSubDomain('producer');
      } else if (arr[0] === 'consumer') {
        setSubDomain('consumer');
      } else {
        setSubDomain('');
      }
    }
  }, []);

  useEffect(() => {
    console.log('🔒 Authenticated.jsx: useEffect triggered - isAuthenticated:', isAuthenticated, 'currentUser:', currentUser, 'subdomain:', subdomain);
    if (isAuthenticated && currentUser && subdomain) {
      // Check if there's a pending auth redirect action first
      const pendingAction = getAuthRedirectAction();
      if (pendingAction) {
        console.log('🔒 Authenticated.jsx: Pending auth redirect action found, skipping subdomain redirect');
        return;
      }
      
      const isConsumerUser = currentUser.user_type === CONSUMER;
      const params = new URLSearchParams(window.location.search);
      
      const intendedPath = params.get('next') || (isConsumerUser ? '/consumer/dashboard' : '/admin/dashboard/scans');
      console.log('🔒 Authenticated.jsx: intendedPath calculated:', intendedPath);

      if (isConsumerUser && subdomain === 'producer') {
        console.log('🔒 Authenticated.jsx: Redirecting consumer from producer subdomain');
        window.location.href = `${window.location.protocol}//consumer.${
          import.meta.env.VITE_APP_BASE_DOMAIN
        }${window.location.port ? ':' + window.location.port : ''}${intendedPath}`;
      } else {
        console.log('🔒 Authenticated.jsx: No subdomain redirect needed');
      }
    }
  }, [isAuthenticated, currentUser, subdomain]);

  useEffect(() => {
    if (
      (currentUser?.user_type === PRODUCER || currentUser?.user_type === SUPERUSER) &&
      subdomain === 'producer'
    ) {
      const id = Number(establishmentId);

      if (
        (establishmentId || pathname == '/admin/dashboard' || pathname == '/admin/dashboard/') &&
        currentUser?.companies.length > 0
      ) {
        if (
          currentCompany &&
          currentCompany.establishments &&
          !currentCompany.establishments.map((e) => e.id).includes(id)
        ) {
          if (currentCompany.establishments?.length > 0) {
            const establishment = currentCompany.establishments[0].id;
            debugNavigate(`/admin/dashboard/establishment/${establishment}`);
          } else {
            debugNavigate(`/admin/dashboard/`);
          }
        }
      }
    }
  }, [currentCompany, establishmentId, navigate, currentUser, subdomain]);

  useEffect(() => {
    if (
      (currentUser?.user_type === PRODUCER || currentUser?.user_type === SUPERUSER) &&
      subdomain === 'producer'
    ) {
      if (currentUser?.companies.length === 0) {
        debugNavigate(`/admin/dashboard/select-company`);
      } else if (
        currentUser?.companies.length === 1 &&
        currentCompany?.establishments &&
        currentCompany.establishments.length === 0
      ) {
        if (
          currentCompany.subscription ||
          (currentCompany.subscription_plan && currentCompany.subscription_plan.id)
        ) {
          debugNavigate(`/admin/dashboard/establishment/add`);
        } else {
          if (!currentCompany.has_subscription) {
            debugNavigate(`/admin/dashboard/pricing`);
          }
        }
      }
    }
  }, [currentCompany, currentUser, navigate, subdomain]);

  const nextUrl = LOGIN_PAGE_URL + (pathname !== '/' ? '?next=' + pathname : '');

  return isLoading === false &&
    isAuthenticated &&
    allowedRoles.includes(currentUser?.user_type) &&
    (mustBeCompanyAdmin
      ? currentUser?.companies[0].role === 'Company Admin' || currentUser?.user_type === SUPERUSER
      : true) ? (
    <Outlet />
  ) : isLoading === false && isAuthenticated === false ? (
    <Navigate to={nextUrl} state={{ next: pathname }} />
  ) : mustBeCompanyAdmin && currentUser?.companies[0].role !== 'Company Admin' ? (
    <Navigate to="/admin/dashboard" />
  ) : null;
};

export default Authenticated;
