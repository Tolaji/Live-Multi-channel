// components/Player/PictureInPicture.jsx

import React from 'react';

export function usePictureInPicture(videoRef) {
  const [isPiP, setIsPiP] = React.useState(false);
  
  const togglePiP = async () => {
    try {
      if (!document.pictureInPictureElement) {
        await videoRef.current.requestPictureInPicture();
        setIsPiP(true);
      } else {
        await document.exitPictureInPicture();
        setIsPiP(false);
      }
    } catch (error) {
      console.error('PiP error:', error);
    }
  };
  
  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    const handleEnterPiP = () => setIsPiP(true);
    const handleLeavePiP = () => setIsPiP(false);
    
    video.addEventListener('enterpictureinpicture', handleEnterPiP);
    video.addEventListener('leavepictureinpicture', handleLeavePiP);
    
    return () => {
      video.removeEventListener('enterpictureinpicture', handleEnterPiP);
      video.removeEventListener('leavepictureinpicture', handleLeavePiP);
    };
  }, [videoRef]);
  
  return { isPiP, togglePiP };
}

// Usage in LivePlayer
export default function LivePlayer({ videoId }) {
  const videoRef = useRef(null);
  const { isPiP, togglePiP } = usePictureInPicture(videoRef);
  
  return (
    <div>
      <video ref={videoRef} src={`...`} />
      <button onClick={togglePiP}>
        {isPiP ? 'Exit PiP' : 'Enable PiP'}
      </button>
    </div>
  );
}