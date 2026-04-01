import { useContext } from 'react';
import { UserContext } from '../../contexts/UserContext';
import React from 'react';
import { FiMail, FiUser, FiShield, FiPhone, FiMapPin } from 'react-icons/fi';
import { getInitials } from './utils/helpers';
import './Profile.css';

const Profile = () => {
  const { user } = useContext(UserContext);
  const name       = user?.name       || 'User Name';
  const email      = user?.email      || 'email@example.com';
  const role       = user?.role       || 'Employee';
  const phone      = user?.phone      || '�';
  const location   = user?.location   || '�';
  const avatar     = user?.avatar;

  const INFO = [
    { icon: FiUser,     label: 'Full Name',   value: name       },
    { icon: FiMail,     label: 'Email',        value: email      },
    { icon: FiShield,   label: 'Role',         value: role       },
    { icon: FiPhone,    label: 'Phone',        value: phone      },
    { icon: FiMapPin,   label: 'Location',     value: location   },
  ];

  return (
    <div className="profile-page">
      <div className="profile-header">
        <h1>My Profile</h1>
        <p>Your account information</p>
      </div>

      <div className="profile-layout">
        {/* Left � avatar card */}
        <div className="profile-card-main">
          <div className="card-top-bg" />
          <div className="card-content">
            <div className="avatar-wrapper">
              {avatar
                ? <img src={avatar} alt={name} className="avatar-image" />
                : <div className="avatar-initials">{getInitials(name)}</div>
              }
            </div>
            <div className="user-info-main">
              <h2>{name}</h2>
              <span className={`user-role ${role}`}>{role}</span>
            </div>
            <div className="user-stats">
              <div className="stat-item">
                <span className="stat-val">{role}</span>
                <span className="stat-lbl">Access Level</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right � details */}
        <div className="profile-details-card">
          <h3>Personal Information</h3>
          <div className="info-grid">
            {INFO.map((item, i) => (
              <div key={i} className="info-item">
                <div className="info-icon"><item.icon size={15} /></div>
                <div className="info-content">
                  <span className="info-label">{item.label}</span>
                  <span className="info-value">{item.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;


