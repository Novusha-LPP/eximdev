import { useContext } from 'react';
import { UserContext } from '../../contexts/UserContext';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowRight } from 'react-icons/fi';
import toast from 'react-hot-toast';
import './Login.css';

const STORAGE_KEYS = { USER: 'user' };

const Login = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useContext(UserContext);

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    
    setMounted(true);
    if (isAuthenticated) navigate('/', { replace: true });
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setLoading(true);
      const result = await login(formData);
      if (result.success) {
        toast.success('Welcome back!');
        const user = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER));
        navigate(user?.role === 'HOD' ? '/HODDashboard' : '/', { replace: true });
      } else {
        toast.error(result.message || 'Invalid credentials. Please try again.');
      }
    } catch (error) {
      toast.error(error.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`lp-root${mounted ? ' lp-root--mounted' : ''}`}>
      {/* Left: Brand Panel */}
      {/* <aside className="lp-brand">
        <div className="lp-brand__grid" aria-hidden="true">
          {Array.from({ length: 80 }).map((_, i) => <div key={i} className="lp-brand__cell" />)}
        </div>
        <div className="lp-brand__orb lp-brand__orb--1" aria-hidden="true" />
        <div className="lp-brand__orb lp-brand__orb--2" aria-hidden="true" />

        <div className="lp-brand__content">
          <div className="lp-brand__logo">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
              <rect width="28" height="28" rx="8" fill="white" fillOpacity="0.12"/>
              <path d="M14 5L14 23M5 14L23 14M8.5 8.5L19.5 19.5M19.5 8.5L8.5 19.5" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            <span className="lp-brand__logo-text">AttendEase</span>
          </div>

          <div className="lp-brand__hero">
            <p className="lp-brand__eyebrow">HR Management System</p>
            <h1 className="lp-brand__headline">
              Workforce <br />Intelligence,<br />
              <em>Simplified.</em>
            </h1>
            <p className="lp-brand__desc">
              The modern platform for attendance tracking, leave management, and HR analytics — built for teams that move fast.
            </p>
          </div>

          <div className="lp-brand__stats">
            <div className="lp-brand__stat">
              <span className="lp-brand__stat-value">99.9%</span>
              <span className="lp-brand__stat-label">Uptime SLA</span>
            </div>
            <div className="lp-brand__stat-divider" aria-hidden="true" />
            <div className="lp-brand__stat">
              <span className="lp-brand__stat-value">150+</span>
              <span className="lp-brand__stat-label">Enterprises</span>
            </div>
            <div className="lp-brand__stat-divider" aria-hidden="true" />
            <div className="lp-brand__stat">
              <span className="lp-brand__stat-value">SOC 2</span>
              <span className="lp-brand__stat-label">Certified</span>
            </div>
          </div>
        </div>
      </aside> */}

      {/* Right: Form Panel */}
      <main className="lp-form-panel">
        <div className="lp-form-wrapper">
          <header className="lp-form-header">
            <h2 className="lp-form-title">Sign in</h2>
            <p className="lp-form-subtitle">
              Access your HR dashboard and team insights
            </p>
          </header>

          <form className="lp-form" onSubmit={handleSubmit} noValidate>
            {/* Email */}
            <div className={`lp-field${errors.email ? ' lp-field--error' : ''}`}>
              <label htmlFor="email" className="lp-field__label">Email address</label>
              <div className="lp-field__input-wrap">
                <span className="lp-field__icon" aria-hidden="true"><FiMail size={15} /></span>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="lp-field__input"
                  placeholder="name@company.com"
                  autoComplete="email"
                  autoFocus
                  aria-describedby={errors.email ? 'email-error' : undefined}
                  aria-invalid={!!errors.email}
                />
              </div>
              {errors.email && (
                <p className="lp-field__error" id="email-error" role="alert">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div className={`lp-field${errors.password ? ' lp-field--error' : ''}`}>
              <div className="lp-field__label-row">
                <label htmlFor="password" className="lp-field__label">Password</label>
                <a href="#" className="lp-link lp-link--sm">Forgot password?</a>
              </div>
              <div className="lp-field__input-wrap">
                <span className="lp-field__icon" aria-hidden="true"><FiLock size={15} /></span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="lp-field__input lp-field__input--with-action"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  aria-invalid={!!errors.password}
                />
                <button
                  type="button"
                  className="lp-field__toggle"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                </button>
              </div>
              {errors.password && (
                <p className="lp-field__error" id="password-error" role="alert">{errors.password}</p>
              )}
            </div>

            {/* Remember me */}
            <label className="lp-checkbox">
              <input
                type="checkbox"
                className="lp-checkbox__input"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
              />
              <span className="lp-checkbox__box" aria-hidden="true" />
              <span className="lp-checkbox__label">Keep me signed in for 30 days</span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              className="lp-submit"
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? (
                <>
                  <span className="lp-submit__spinner" aria-hidden="true" />
                  <span>Signing in…</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <FiArrowRight size={16} aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          <footer className="lp-form-footer">
            <p className="lp-form-footer__text">
              Need access?{' '}
              <a href="#" className="lp-link">Contact your HR administrator</a>
            </p>
            <p className="lp-form-footer__legal">
              By signing in, you agree to our{' '}
              <a href="#" className="lp-link lp-link--muted">Terms of Service</a>
              {' '}and{' '}
              <a href="#" className="lp-link lp-link--muted">Privacy Policy</a>
            </p>
          </footer>
        </div>

        <div className="lp-powered">
          <span className="lp-powered__dot" aria-hidden="true" />
          <span>Enterprise-grade security · 256-bit encryption</span>
        </div>
      </main>
    </div>
  );
};

export default Login;


