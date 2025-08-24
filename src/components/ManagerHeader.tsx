import Image from 'next/image'
interface ManagerHeaderProps {
  managerName: string
  teamName?: string
  showLogo?: boolean
  logoSize?: 'sm' | 'md' | 'lg'
  textSize?: 'xs' | 'sm' | 'base' | 'lg'
  className?: string
}


// Utility function to get team logo for a manager
const getTeamLogo = (managerName: string): string => {
  // Map manager names to their logo files
  const logoMap: { [key: string]: string } = {
    'Haight': '/Haight.png',
    'Horn': '/Horn.png',
    'Amish': '/Amish.png',
    'Bier': '/Bier.png',
    'Buchs': '/Buchs.png',
    'Emmer': '/Emmer.png',
    'Gabe': '/Gabe.png',
    'Jones': '/Jones.png',
    'Luskey': '/Luskey.png',
    'MikeMac': '/MikeMac.png',
    'Mitch': '/Mitch.png',
    'Peskin': '/Peskin.png',
    'Phil': '/Phil.png',
    'Tmac': '/Tmac.png',
    'Weeg': '/Weeg.png',
    'Kenny': '/Kenny.png',
    'Glaspie': '/Glaspie.png'
  }
  
  return logoMap[managerName] || '/uafbl-logo.png' // Fallback to UAFBL logo
}

export default function ManagerHeader({
  managerName,
  teamName,
  showLogo = true,
  logoSize = 'md',
  textSize = 'sm',
  className = ''
}: ManagerHeaderProps) {
  const logoSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }

  const logoPixelSizes = {
    sm: { width: 16, height: 16 },
    md: { width: 24, height: 24 },
    lg: { width: 32, height: 32 }
  }

  const textSizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg'
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {showLogo && (
        <div className={`${logoSizeClasses[logoSize]} rounded-full overflow-hidden bg-white flex-shrink-0`}>
          <Image
            src={getTeamLogo(managerName)}
            alt={`${managerName} logo`}
            width={logoPixelSizes[logoSize].width}
            height={logoPixelSizes[logoSize].height}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <span className={`${textSizeClasses[textSize]}`}>
        {managerName}
        {teamName && (
          <span className="font-normal"> - {teamName}</span>
        )}
      </span>
    </div>
  )
}