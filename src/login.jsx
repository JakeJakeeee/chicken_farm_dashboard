import React, { useState } from 'react';
import { auth, googleProvider } from './firebase'; // Import the Google Key
import { signInWithPopup, signOut } from 'firebase/auth'; // Import popup and logout tools

function Login() {
  const [loginError, setLoginError] = useState('');

  // This is your master key. Only this email is allowed inside!
  const MASTER_EMAIL = "farmaircondition@gmail.com";

  const handleGoogleLogin = async () => {
    try {
      setLoginError(''); // Clear old errors
      
      // 1. Open the Google Sign-In Popup
      const result = await signInWithPopup(auth, googleProvider);
      
      // 2. THE SECURITY CHECK (Whitelist)
      // If the email they used doesn't perfectly match your master email...
      if (result.user.email !== MASTER_EMAIL) {
        // ...instantly kick them out!
        await signOut(auth);
        setLoginError("Access Denied: You do not have Admin privileges.");
      }
      
      // If the email DOES match, the App.jsx file will automatically 
      // see they are logged in and unlock the dashboard!

    } catch (error) {
      console.error("Google Login Error:", error.code, error.message);
      // Handle the case where they close the popup before signing in
      if (error.code !== 'auth/popup-closed-by-user') {
        setLoginError("Failed to connect to Google.");
      }
    }
  };

  return (
    <div className="dashboard-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div style={{ background: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', textAlign: 'center', width: '320px' }}>
        <h2>Admin Portal</h2>
        <p style={{ color: '#7f8c8d', marginBottom: '30px' }}>Chicken Farm Telemetry System</p>
        
        {/* The new Google Button */}
        <button 
          onClick={handleGoogleLogin} 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '10px', 
            width: '100%', 
            padding: '12px', 
            backgroundColor: 'white', 
            color: '#757575', 
            border: '1px solid #ddd', 
            borderRadius: '5px', 
            fontSize: '16px', 
            fontWeight: 'bold', 
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}
        >
          {/* A simple SVG of the Google 'G' logo */}
          <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Sign in with Google
        </button>

        {loginError && (
          <div style={{ color: '#e74c3c', marginTop: '20px', fontSize: '0.9rem', fontWeight: 'bold' }}>
            {loginError}
          </div>
        )}
      </div>
    </div>
  );
}

export default Login;