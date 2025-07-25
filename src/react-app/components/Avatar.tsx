interface AvatarProps {
  src?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
}

export default function Avatar({ src, name, size = 'md', className = '', onClick }: AvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-lg',
    xl: 'w-20 h-20 text-xl'
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const getColorFromName = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
      hash = hash & hash;
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 70%, 50%)`;
  };

  const baseClasses = `
    ${sizeClasses[size]} 
    rounded-full 
    flex 
    items-center 
    justify-center 
    font-bold 
    text-white 
    transition-all 
    duration-200
    ${onClick ? 'cursor-pointer hover:scale-110' : ''}
    ${className}
  `;

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${baseClasses} object-cover`}
        onClick={onClick}
      />
    );
  }

  return (
    <div
      className={baseClasses}
      style={{ backgroundColor: getColorFromName(name) }}
      onClick={onClick}
    >
      {getInitials(name)}
    </div>
  );
}
