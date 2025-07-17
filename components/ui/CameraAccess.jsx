"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera, X, Video } from "lucide-react";

const CameraAccess = ({ onCameraStateChange }) => {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Function to open the camera
  const openCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // This is crucial - wait for the video to be ready before playing
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().catch(e => {
            console.error("Error playing video:", e);
          });
        };
      }
      
      setIsCameraOpen(true);
      
      if (onCameraStateChange) {
        onCameraStateChange(true, stream);
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      setCameraError(
        error.name === "NotAllowedError" 
          ? "Camera access denied. Please allow camera access in your browser settings."
          : "Error accessing your camera. Please check your device settings."
      );
      setIsCameraOpen(false);
      
      if (onCameraStateChange) {
        onCameraStateChange(false, null);
      }
    }
  };

  // Function to close the camera
  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsCameraOpen(false);
    
    if (onCameraStateChange) {
      onCameraStateChange(false, null);
    }
  };

  // Clean up when component unmounts
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
        });
      }
    };
  }, []);

  return (
    <div className="camera-access">
      {!isCameraOpen ? (
        <Button 
          onClick={openCamera}
          className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white"
        >
          <Camera className="h-5 w-5" />
          <span>Open Camera</span>
        </Button>
      ) : (
        <div className="camera-container relative">
          <div className="video-wrapper relative rounded-lg overflow-hidden bg-black h-[200px]">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <Button
              onClick={closeCamera}
              className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 size-9 p-0 rounded-full flex items-center justify-center"
              aria-label="Close camera"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}
      
      {cameraError && (
        <div className="mt-2 text-red-500 text-sm">
          {cameraError}
        </div>
      )}
    </div>
  );
};

export default CameraAccess; 