import React from 'react';

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'wide';
}

export const Container: React.FC<ContainerProps> = ({
  children,
  className = '',
  size = 'xl'
}) => {
  const sizeClass = size === 'wide' ? 'container-wide' : size === 'sm' ? 'container-sm' : size === 'md' ? 'container-md' : 'container';
  return (
    <div className={`${sizeClass} ${className}`}>
      {children}
    </div>
  );
};
