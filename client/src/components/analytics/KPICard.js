import React from 'react';
import './KPICard.css';

const KPICard = ({ title, count, color = 'blue', onClick }) => {
    return (
        <div className={`kpi-card ${color}`} onClick={onClick}>
            <div className="kpi-content">
                <h3>{count}</h3>
                <p>{title}</p>
            </div>
            <div className="kpi-icon">
                {/* Optional Icon can go here */}
            </div>
            <div className="kpi-shine"></div>
        </div>
    );
};

export default KPICard;
