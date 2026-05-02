import React, { useEffect, useRef } from 'react';

export const AdBanner: React.FC = () => {
  const adContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only run this code once
    if (adContainerRef.current) {
      const container = adContainerRef.current;
      
      // Cleanup previous content just in case
      container.innerHTML = '';

      // Set the configuration options
      const scriptConfig = document.createElement('script');
      scriptConfig.type = 'text/javascript';
      scriptConfig.innerHTML = `
        atOptions = {
          'key' : 'f45e8cb326328bfac67c77a83f4739f7',
          'format' : 'iframe',
          'height' : 250,
          'width' : 300,
          'params' : {}
        };
      `;
      container.appendChild(scriptConfig);

      // Load the invoke script
      const scriptInvoke = document.createElement('script');
      scriptInvoke.type = 'text/javascript';
      scriptInvoke.src = "https://www.highperformanceformat.com/f45e8cb326328bfac67c77a83f4739f7/invoke.js";
      container.appendChild(scriptInvoke);
    }
  }, []);

  return (
    <div className="flex justify-center items-center my-8 p-4 bg-brand-bg/50 rounded-3xl border border-brand-border overflow-hidden">
      <div 
        ref={adContainerRef} 
        id="ad-banner-container"
        className="w-[300px] h-[250px] bg-brand-bg flex items-center justify-center text-xs text-brand-text-muted"
      >
        {/* Ad will be injected here */}
        جاري تحميل الإعلان...
      </div>
    </div>
  );
};
