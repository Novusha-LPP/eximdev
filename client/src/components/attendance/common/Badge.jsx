import React from 'react';
import './Badge.css';

const Badge = ({
  children,
  variant = 'default',
  size = 'medium',
  rounded = false,
  className = '',
  ...props
}) => {
  const classNames = [
    'badge',
    `badge--${variant}`,
    `badge--${size}`,
    rounded && 'badge--rounded',
    className
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classNames} {...props}>
      {children}
    </span>
  );
};

export default Badge;

