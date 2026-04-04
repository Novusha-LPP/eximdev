import React from 'react';
import './Card.css';

const Card = ({
  children,
  title,
  subtitle,
  headerAction,
  padding = 'default',
  className = '',
  noBorder = false,
  ...props
}) => {
  const hasHeader = title || subtitle || headerAction;
  
  const classNames = [
    'card',
    `card--padding-${padding}`,
    noBorder && 'card--no-border',
    !hasHeader && 'card--no-header',
    className
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classNames} {...props}>
      {hasHeader && (
        <div className="card__header">
          <div className="card__header-content">
            {title && <h3 className="card__title">{title}</h3>}
            {subtitle && <p className="card__subtitle">{subtitle}</p>}
          </div>
          {headerAction && (
            <div className="card__header-action">{headerAction}</div>
          )}
        </div>
      )}
      <div className="card__body">{children}</div>
    </div>
  );
};

export default Card;

