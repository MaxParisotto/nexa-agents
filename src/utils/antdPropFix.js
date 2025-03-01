/**
 * Helper function to transform deprecated antd props to their modern equivalents
 */
export const transformCardProps = (props) => {
  const newProps = { ...props };
  
  // Handle the deprecated 'bordered' prop
  if (newProps.hasOwnProperty('bordered')) {
    newProps.variant = newProps.bordered ? 'outlined' : 'contained';
    delete newProps.bordered;
  }
  
  return newProps;
};
