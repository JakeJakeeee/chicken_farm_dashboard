import React from 'react'; 

export default function Header({ title, subtitle, actionButton }) {
  return (
    <div className="header" style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      marginBottom: '20px' }}>
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '20px' }}>
        {actionButton && actionButton}
      </div>
    </div>
  );
}