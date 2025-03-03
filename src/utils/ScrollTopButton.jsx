import React, { useState, useEffect } from 'react';

/**
 * Simple scroll to top button without MUI icon dependencies
 */
const ScrollTopButton = () => {
  const [visible, setVisible] = useState(false);

  // Show button when page is scrolled down
  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setVisible(true);
      } else {
        setVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  // Scroll to top smoothly
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // Don't render if not visible
  if (!visible) {
    return null;
  }

  return (
    <button
      onClick={scrollToTop}
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        width: '40px',
        height: '40px',
        fontSize: '24px',
        backgroundColor: '#3f51b5', // MUI primary color
        color: 'white',
        border: 'none',
        borderRadius: '50%',
        cursor: 'pointer',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        boxShadow: '0px 3px 5px -1px rgba(0,0,0,0.2), 0px 6px 10px 0px rgba(0,0,0,0.14), 0px 1px 18px 0px rgba(0,0,0,0.12)',
        zIndex: 1000,
        outline: 'none',
        transition: 'background-color 0.3s',
      }}
      aria-label="Scroll to top"
    >
      ↑
    </button>
  );
};

export default ScrollTopButton;
